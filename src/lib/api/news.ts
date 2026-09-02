import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

export async function handleNews(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    const news = await db.prepare(`select * from news_blocks where id = 1`).first();
    return json(news || null);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as any;
      await db
        .prepare(
          `insert into news_blocks (id, title_en, title_zh_tw, title_zh_cn, body_en, body_zh_tw, body_zh_cn, background_media_id, countdown_at_utc, is_active)
           values (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           on conflict(id) do update set
             title_en=excluded.title_en,
             title_zh_tw=excluded.title_zh_tw,
             title_zh_cn=excluded.title_zh_cn,
             body_en=excluded.body_en,
             body_zh_tw=excluded.body_zh_tw,
             body_zh_cn=excluded.body_zh_cn,
             background_media_id=excluded.background_media_id,
             countdown_at_utc=excluded.countdown_at_utc,
             is_active=excluded.is_active,
             updated_at=current_timestamp`
        )
        .bind(
          body.title_en,
          body.title_zh_tw,
          body.title_zh_cn,
          body.body_en,
          body.body_zh_tw,
          body.body_zh_cn,
          body.background_media_id || null,
          body.countdown_at_utc || null,
          body.is_active ? 1 : 0
        )
        .run();

      await logActivity(env, admin.email, "update_news", "news_block", 1, body.title_zh_tw);
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /news` }, { status: 405 });
}
