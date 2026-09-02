import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

export async function handleSocials(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    const result = await db
      .prepare(
        `select s.*, m.r2_key, m.alt_text
         from social_links s
         left join media_assets m on m.id = s.logo_media_id
         order by s.sort_order asc`
      )
      .all();
    return json(result.results || []);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { socials: any[] };
      const incomingSocials = body.socials || [];

      const existing = await db.prepare(`select id from social_links`).all<{ id: number }>();
      const existingIds = new Set((existing.results || []).map((r) => r.id));

      const incomingIds = new Set(incomingSocials.map((s) => s.id).filter(Boolean) as number[]);
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

      if (toDelete.length > 0) {
        const deleteBatch = toDelete.map((id) =>
          db.prepare(`delete from social_links where id = ?`).bind(id)
        );
        await db.batch(deleteBatch);
      }

      const batch: any[] = [];
      incomingSocials.forEach((social, index) => {
        const isActiveVal =
          social.is_active === 1 || social.is_active === true || social.is_active === "on" ? 1 : 0;
        if (social.id && existingIds.has(Number(social.id))) {
          batch.push(
            db
              .prepare(
                `update social_links set name = ?, url = ?, logo_media_id = ?, sort_order = ?, is_active = ?, updated_at = current_timestamp where id = ?`
              )
              .bind(social.name, social.url, social.logo_media_id, index, isActiveVal, Number(social.id))
          );
        } else {
          batch.push(
            db
              .prepare(
                `insert into social_links (name, url, logo_media_id, sort_order, is_active)
                 values (?, ?, ?, ?, ?)`
              )
              .bind(social.name, social.url, social.logo_media_id, index, isActiveVal)
          );
        }
      });

      if (batch.length > 0) {
        await db.batch(batch);
      }

      await logActivity(
        env,
        admin.email,
        "update_socials",
        "social_links",
        null,
        `Updated ${body.socials.length} social links`
      );
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /socials` }, { status: 405 });
}
