import type { APIRoute } from "astro";
import { getAdminContext, json, logActivity } from "@/lib/admin";

export const prerender = false;

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export const ALL: APIRoute = async ({ request, params, locals }) => {
  const env = locals.runtime?.env;
  const admin = await getAdminContext(env, request);

  if (!admin) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = params.path || "status";

  if (request.method === "GET" && path === "status") {
    return json({
      ok: true,
      admin,
      bindings: {
        db: Boolean(env?.DB),
        mediaBucket: Boolean(env?.MEDIA_BUCKET),
        publicMediaBaseUrl: env?.PUBLIC_MEDIA_BASE_URL || "/media"
      }
    });
  }

  if (request.method === "POST" && path === "media/upload") {
    const bucket = env?.MEDIA_BUCKET;
    const db = env?.DB;
    if (!bucket || !db) return json({ error: "Media storage is not configured" }, { status: 503 });

    const form = await request.formData();
    const file = form.get("file");
    const alt = String(form.get("alt") || "");
    if (!(file instanceof File)) return json({ error: "Missing file" }, { status: 400 });
    if (!allowedImageTypes.has(file.type)) {
      return json({ error: "Only PNG, JPG, JPEG, and WebP images are allowed" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });
    const result = await db.prepare(
      `insert into media_assets (r2_key, file_name, content_type, size_bytes, alt_text, created_by_email)
       values (?, ?, ?, ?, ?, ?)`
    ).bind(key, file.name, file.type, file.size, alt, admin.email).run();
    await logActivity(env, admin.email, "upload_media", "media_asset", Number(result.meta.last_row_id), file.name);

    return json({
      id: result.meta.last_row_id,
      key,
      url: `${(env.PUBLIC_MEDIA_BASE_URL || "/media").replace(/\/$/, "")}/${key}`
    }, { status: 201 });
  }

  return json({ error: `No admin endpoint for ${request.method} /${path}` }, { status: 404 });
};
