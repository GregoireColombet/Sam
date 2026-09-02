import type { APIRoute } from "astro";
import { getAdminContext, json } from "@/lib/admin";
import {
  handleMedia,
  handleMediaUpload,
  handleMediaDelete,
  runGarbageCollection
} from "@/lib/api/media";
import { handleNews } from "@/lib/api/news";
import { handleTours, handleTourDelete, handleTourLinks } from "@/lib/api/tours";
import { handleAlbums, handleMusic } from "@/lib/api/albums";
import { handleVideos } from "@/lib/api/videos";
import { handleSocials } from "@/lib/api/socials";
import { handleSettings } from "@/lib/api/settings";
import { handleUsers, handleActivity } from "@/lib/api/users";

export const prerender = false;

export const ALL: APIRoute = async ({ request, params, locals }) => {
  const env = locals.runtime?.env;
  const path = params.path || "status";
  const method = request.method;

  // 1. Cron-authorized background garbage collection
  const authHeader = request.headers.get("Authorization");
  const isCronAuthorized = (env as any)?.CRON_SECRET && authHeader === `Bearer ${(env as any).CRON_SECRET}`;

  if (method === "POST" && path === "media/gc" && isCronAuthorized) {
    return runGarbageCollection(env, "system-cron");
  }

  // 2. Authentication Context Guard
  const admin = await getAdminContext(env, request);
  if (!admin) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. System Status
  if (method === "GET" && path === "status") {
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

  // 4. Media endpoints
  if (path === "media") return handleMedia(request, env, admin);
  if (path === "media/upload") return handleMediaUpload(request, env, admin);
  if (path === "media/delete") return handleMediaDelete(request, env, admin);
  if (path === "media/gc") return runGarbageCollection(env, admin.email);

  // 5. Content CRUD endpoints
  if (path === "news") return handleNews(request, env, admin);
  if (path === "tours") return handleTours(request, env, admin);
  if (path === "tours/delete") return handleTourDelete(request, env, admin);
  if (path === "tour-links") return handleTourLinks(request, env, admin);
  if (path === "albums") return handleAlbums(request, env, admin);
  if (path === "music") return handleMusic(request, env, admin);
  if (path === "videos") return handleVideos(request, env, admin);
  if (path === "socials") return handleSocials(request, env, admin);
  if (path === "settings") return handleSettings(request, env, admin);

  // 6. Owner-only management endpoints
  if (path === "users") return handleUsers(request, env, admin);
  if (path === "activity") return handleActivity(request, env, admin);

  return json({ error: `No admin endpoint for ${method} /${path}` }, { status: 404 });
};
