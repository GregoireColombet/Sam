import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

export async function handleVideos(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    const result = await db
      .prepare(
        `select v.*, m.r2_key, m.alt_text
         from video_links v
         left join media_assets m on m.id = v.thumbnail_media_id
         order by v.sort_order asc`
      )
      .all();
    return json(result.results || []);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { videos: any[] };
      const incomingVideos = body.videos || [];

      const existing = await db.prepare(`select id from video_links`).all<{ id: number }>();
      const existingIds = new Set((existing.results || []).map((r) => r.id));

      const incomingIds = new Set(incomingVideos.map((v) => v.id).filter(Boolean) as number[]);
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

      if (toDelete.length > 0) {
        const deleteBatch = toDelete.map((id) =>
          db.prepare(`delete from video_links where id = ?`).bind(id)
        );
        await db.batch(deleteBatch);
      }

      const batch: any[] = [];
      incomingVideos.forEach((video, index) => {
        const isActiveVal =
          video.is_active === 1 || video.is_active === true || video.is_active === "on" ? 1 : 0;
        const providerEnVal = video.providerEn || video.provider_en || "cloudflare";
        const providerZhTwVal = video.providerZhTw || video.provider_zh_tw || "cloudflare";
        const providerZhCnVal = video.providerZhCn || video.provider_zh_cn || "cloudflare";
        const urlEnVal = video.urlEn || video.url_en;
        const urlZhTwVal = video.urlZhTw || video.url_zh_tw;
        const urlZhCnVal = video.urlZhCn || video.url_zh_cn;
        const thumbnailMediaIdVal = video.thumbnail_media_id || null;

        if (video.id && existingIds.has(Number(video.id))) {
          batch.push(
            db
              .prepare(
                `update video_links set title = ?, provider_en = ?, url_en = ?, provider_zh_tw = ?, url_zh_tw = ?, provider_zh_cn = ?, url_zh_cn = ?, thumbnail_media_id = ?, sort_order = ?, is_active = ?, updated_at = current_timestamp where id = ?`
              )
              .bind(
                video.title,
                providerEnVal,
                urlEnVal,
                providerZhTwVal,
                urlZhTwVal,
                providerZhCnVal,
                urlZhCnVal,
                thumbnailMediaIdVal,
                index,
                isActiveVal,
                Number(video.id)
              )
          );
        } else {
          batch.push(
            db
              .prepare(
                `insert into video_links (title, provider_en, url_en, provider_zh_tw, url_zh_tw, provider_zh_cn, url_zh_cn, thumbnail_media_id, sort_order, is_active)
                 values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                video.title,
                providerEnVal,
                urlEnVal,
                providerZhTwVal,
                urlZhTwVal,
                providerZhCnVal,
                urlZhCnVal,
                thumbnailMediaIdVal,
                index,
                isActiveVal
              )
          );
        }
      });

      if (batch.length > 0) {
        await db.batch(batch);
      }

      await logActivity(
        env,
        admin.email,
        "update_videos",
        "video_links",
        null,
        `Updated ${body.videos.length} videos`
      );
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /videos` }, { status: 405 });
}
