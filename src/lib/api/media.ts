import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);

export async function runGarbageCollection(env: RuntimeEnv | undefined, triggerUser: string) {
  const db = env?.DB;
  const bucket = env?.MEDIA_BUCKET;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });
  if (!bucket) return json({ error: "Media storage is not configured" }, { status: 503 });

  try {
    const d1Assets = await db.prepare(`select r2_key from media_assets`).all<{ r2_key: string }>();
    const validKeys = new Set((d1Assets.results || []).map((row) => row.r2_key));

    let listed = await bucket.list();
    const orphanedKeys: string[] = [];

    while (true) {
      for (const file of listed.objects) {
        if (file.key.startsWith("uploads/") && !validKeys.has(file.key)) {
          orphanedKeys.push(file.key);
        }
      }
      if (listed.truncated) {
        listed = await bucket.list({ cursor: listed.cursor });
      } else {
        break;
      }
    }

    const deleted: string[] = [];
    for (const key of orphanedKeys) {
      await bucket.delete(key);
      deleted.push(key);
    }

    await logActivity(
      env,
      triggerUser,
      "garbage_collect",
      "media_asset",
      null,
      `Purged ${deleted.length} orphaned R2 files.`
    );
    return json({ ok: true, purged: deleted });
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}

export async function handleMedia(request: Request, env: RuntimeEnv | undefined, _admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    try {
      const result = await db.prepare(`select * from media_assets order by created_at desc`).all();
      return json(result.results || []);
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /media` }, { status: 405 });
}

export async function handleMediaUpload(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  const bucket = env?.MEDIA_BUCKET;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });
  if (!bucket) return json({ error: "Media storage is not configured" }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const alt = String(form.get("alt") || "");
    if (!(file instanceof File)) return json({ error: "Missing file" }, { status: 400 });
    if (!allowedImageTypes.has(file.type) && !allowedVideoTypes.has(file.type)) {
      return json(
        { error: "Only PNG, JPG, JPEG, WebP images and MP4, WEBM, OGG, MOV videos are allowed" },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });
    const result = await db
      .prepare(
        `insert into media_assets (r2_key, file_name, content_type, size_bytes, alt_text, created_by_email)
         values (?, ?, ?, ?, ?, ?)`
      )
      .bind(key, file.name, file.type, file.size, alt, admin.email)
      .run();

    await logActivity(env, admin.email, "upload_media", "media_asset", Number(result.meta.last_row_id), file.name);

    return json(
      {
        id: result.meta.last_row_id,
        key,
        url: `${(env?.PUBLIC_MEDIA_BASE_URL || "/media").replace(/\/$/, "")}/${key}`
      },
      { status: 201 }
    );
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}

export async function handleMediaDelete(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  const bucket = env?.MEDIA_BUCKET;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  try {
    const body = (await request.json()) as { id: number };
    const asset = await db
      .prepare(`select r2_key, file_name from media_assets where id = ?`)
      .bind(body.id)
      .first<{ r2_key: string; file_name: string }>();

    if (!asset) return json({ error: "Media asset not found" }, { status: 404 });

    // Check non-nullable foreign references
    const references: string[] = [];

    const albumCheck = await db
      .prepare(`select count(*) as count from album_covers where image_media_id = ?`)
      .bind(body.id)
      .first<{ count: number }>();
    if (albumCheck && albumCheck.count > 0) references.push("Album Cover");

    const tourCheck = await db
      .prepare(`select count(*) as count from tour_ticket_links where logo_media_id = ?`)
      .bind(body.id)
      .first<{ count: number }>();
    if (tourCheck && tourCheck.count > 0) references.push("Tour Ticket Link logo");

    const musicCheck = await db
      .prepare(`select count(*) as count from music_platform_links where logo_media_id = ?`)
      .bind(body.id)
      .first<{ count: number }>();
    if (musicCheck && musicCheck.count > 0) references.push("Music Platform logo");

    const socialCheck = await db
      .prepare(`select count(*) as count from social_links where logo_media_id = ?`)
      .bind(body.id)
      .first<{ count: number }>();
    if (socialCheck && socialCheck.count > 0) references.push("Social Link logo");

    if (references.length > 0) {
      return json(
        { error: `Cannot delete media. It is currently used by: ${references.join(", ")}.` },
        { status: 409 }
      );
    }

    // Nullify optional references, then delete
    await db.batch([
      db.prepare(`update news_blocks set background_media_id = null where background_media_id = ?`).bind(body.id),
      db.prepare(`update site_settings set bonus_media_id = null where bonus_media_id = ?`).bind(body.id),
      db.prepare(`update video_links set thumbnail_media_id = null where thumbnail_media_id = ?`).bind(body.id),
      db.prepare(`PRAGMA foreign_keys = ON;`),
      db.prepare(`delete from media_assets where id = ?`).bind(body.id)
    ]);

    if (bucket) {
      try {
        await bucket.delete(asset.r2_key);
      } catch (r2Err) {
        console.error("R2 deletion error:", r2Err);
      }
    }

    await logActivity(env, admin.email, "delete_media", "media_asset", body.id, asset.file_name);
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: `Cannot delete media. ${e.message}` }, { status: 409 });
  }
}
