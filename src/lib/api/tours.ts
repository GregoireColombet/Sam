import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function handleTours(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    const result = await db.prepare(`select * from tour_dates order by starts_at_utc desc`).all();
    return json(result.results || []);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as any;
      const slug = body.slug || slugify(`${body.location_en}-${body.local_date}`);
      let result;

      if (body.id) {
        result = await db
          .prepare(
            `update tour_dates set
               slug = ?, local_date = ?, local_time = ?, timezone = ?, starts_at_utc = ?,
               location_en = ?, location_zh_tw = ?, location_zh_cn = ?,
               description_en = ?, description_zh_tw = ?, description_zh_cn = ?,
               is_active = ?, updated_at = current_timestamp
             where id = ?`
          )
          .bind(
            slug,
            body.local_date,
            body.local_time,
            body.timezone,
            body.starts_at_utc,
            body.location_en,
            body.location_zh_tw,
            body.location_zh_cn,
            body.description_en,
            body.description_zh_tw,
            body.description_zh_cn,
            body.is_active ? 1 : 0,
            body.id
          )
          .run();
        await logActivity(env, admin.email, "update_tour", "tour_date", body.id, body.location_zh_tw);
      } else {
        result = await db
          .prepare(
            `insert into tour_dates (slug, local_date, local_time, timezone, starts_at_utc, location_en, location_zh_tw, location_zh_cn, description_en, description_zh_tw, description_zh_cn, is_active)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            slug,
            body.local_date,
            body.local_time,
            body.timezone,
            body.starts_at_utc,
            body.location_en,
            body.location_zh_tw,
            body.location_zh_cn,
            body.description_en,
            body.description_zh_tw,
            body.description_zh_cn,
            body.is_active ? 1 : 0
          )
          .run();
        await logActivity(
          env,
          admin.email,
          "create_tour",
          "tour_date",
          Number(result.meta.last_row_id),
          body.location_zh_tw
        );
      }
      return json({ ok: true, id: body.id || result.meta.last_row_id });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /tours` }, { status: 405 });
}

export async function handleTourDelete(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { id: number };
      await db.prepare(`delete from tour_dates where id = ?`).bind(body.id).run();
      await logActivity(env, admin.email, "delete_tour", "tour_date", body.id);
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /tours/delete` }, { status: 405 });
}

export async function handleTourLinks(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    const tourDateId = new URL(request.url).searchParams.get("tour_date_id");
    const result = await db
      .prepare(
        `select l.*, m.r2_key, m.alt_text
         from tour_ticket_links l
         left join media_assets m on m.id = l.logo_media_id
         where l.tour_date_id = ?
         order by l.sort_order asc`
      )
      .bind(tourDateId)
      .all();
    return json(result.results || []);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { tour_date_id: number; links: any[] };
      const incomingLinks = body.links || [];

      const existing = await db
        .prepare(`select id from tour_ticket_links where tour_date_id = ?`)
        .bind(body.tour_date_id)
        .all<{ id: number }>();
      const existingIds = new Set((existing.results || []).map((r) => r.id));

      const incomingIds = new Set(
        incomingLinks.map((l: any) => Number(l.id)).filter((id) => !isNaN(id) && id > 0)
      );
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

      if (toDelete.length > 0) {
        const deleteBatch = toDelete.map((id) =>
          db.prepare(`delete from tour_ticket_links where id = ?`).bind(id)
        );
        await db.batch(deleteBatch);
      }

      const batch: any[] = [];
      incomingLinks.forEach((link, index) => {
        const isActiveVal =
          link.is_active === 1 || link.is_active === true || link.is_active === "on" ? 1 : 0;
        if (link.id && existingIds.has(Number(link.id))) {
          batch.push(
            db
              .prepare(
                `update tour_ticket_links set name = ?, url = ?, logo_media_id = ?, sort_order = ?, is_active = ?, updated_at = current_timestamp where id = ?`
              )
              .bind(link.name, link.url, link.logo_media_id, index, isActiveVal, Number(link.id))
          );
        } else {
          batch.push(
            db
              .prepare(
                `insert into tour_ticket_links (tour_date_id, name, url, logo_media_id, sort_order, is_active)
                 values (?, ?, ?, ?, ?, ?)`
              )
              .bind(body.tour_date_id, link.name, link.url, link.logo_media_id, index, isActiveVal)
          );
        }
      });

      if (batch.length > 0) {
        await db.batch(batch);
      }

      await logActivity(env, admin.email, "update_tour_links", "tour_date", body.tour_date_id);
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /tour-links` }, { status: 405 });
}
