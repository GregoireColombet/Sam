import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

export async function handleSettings(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    const settings = await db.prepare(`select * from site_settings where id = 1`).first();
    return json(settings || null);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as any;
      await db
        .prepare(
          `insert into site_settings (
             id, merch_url_en, merch_url_zh_tw, merch_url_zh_cn, merch_is_active,
             bonus_title_en, bonus_title_zh_tw, bonus_title_zh_cn,
             bonus_text_en, bonus_text_zh_tw, bonus_text_zh_cn, bonus_media_id, bonus_is_active
           )
           values (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           on conflict(id) do update set
             merch_url_en=excluded.merch_url_en,
             merch_url_zh_tw=excluded.merch_url_zh_tw,
             merch_url_zh_cn=excluded.merch_url_zh_cn,
             merch_is_active=excluded.merch_is_active,
             bonus_title_en=excluded.bonus_title_en,
             bonus_title_zh_tw=excluded.bonus_title_zh_tw,
             bonus_title_zh_cn=excluded.bonus_title_zh_cn,
             bonus_text_en=excluded.bonus_text_en,
             bonus_text_zh_tw=excluded.bonus_text_zh_tw,
             bonus_text_zh_cn=excluded.bonus_text_zh_cn,
             bonus_media_id=excluded.bonus_media_id,
             bonus_is_active=excluded.bonus_is_active,
             updated_at=current_timestamp`
        )
        .bind(
          body.merch_url_en || null,
          body.merch_url_zh_tw || null,
          body.merch_url_zh_cn || null,
          body.merch_is_active ? 1 : 0,
          body.bonus_title_en || null,
          body.bonus_title_zh_tw || null,
          body.bonus_title_zh_cn || null,
          body.bonus_text_en || null,
          body.bonus_text_zh_tw || null,
          body.bonus_text_zh_cn || null,
          body.bonus_media_id || null,
          body.bonus_is_active ? 1 : 0
        )
        .run();

      await logActivity(env, admin.email, "update_settings", "site_settings", 1);
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /settings` }, { status: 405 });
}
