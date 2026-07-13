import type { APIRoute } from "astro";
import { getAdminContext, json, logActivity } from "@/lib/admin";

export const prerender = false;

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

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

export const ALL: APIRoute = async ({ request, params, locals }) => {
  const env = locals.runtime?.env;
  const admin = await getAdminContext(env, request);

  if (!admin) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = env?.DB;
  const bucket = env?.MEDI_BUCKET || env?.MEDIA_BUCKET;
  if (!db) {
    return json({ error: "Database not configured" }, { status: 503 });
  }

  const path = params.path || "status";
  const method = request.method;

  // 1. Status Check
  if (method === "GET" && path === "status") {
    return json({
      ok: true,
      admin,
      bindings: {
        db: Boolean(db),
        mediaBucket: Boolean(bucket),
        publicMediaBaseUrl: env?.PUBLIC_MEDIA_BASE_URL || "/media"
      }
    });
  }

  // 2. Media Assets CRUD
  if (path === "media") {
    if (method === "GET") {
      try {
        const result = await db.prepare(
          `select * from media_assets order by created_at desc`
        ).all();
        return json(result.results || []);
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  if (method === "POST" && path === "media/upload") {
    if (!bucket) return json({ error: "Media storage is not configured" }, { status: 503 });

    try {
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
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  if (method === "POST" && path === "media/delete") {
    try {
      const body = await request.json() as { id: number };
      const asset = await db.prepare(
        `select r2_key, file_name from media_assets where id = ?`
      ).bind(body.id).first<{ r2_key: string; file_name: string }>();

      if (!asset) return json({ error: "Media asset not found" }, { status: 404 });

      // Try deleting from R2 first
      if (bucket) {
        await bucket.delete(asset.r2_key);
      }

      // Delete from D1
      await db.prepare(`delete from media_assets where id = ?`).bind(body.id).run();
      await logActivity(env, admin.email, "delete_media", "media_asset", body.id, asset.file_name);
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: "Cannot delete media. It might be referenced by other content." }, { status: 409 });
    }
  }

  // 3. News Block CRUD
  if (path === "news") {
    if (method === "GET") {
      const news = await db.prepare(`select * from news_blocks where id = 1`).first();
      return json(news || null);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as any;
        await db.prepare(
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
        ).bind(
          body.title_en, body.title_zh_tw, body.title_zh_cn,
          body.body_en, body.body_zh_tw, body.body_zh_cn,
          body.background_media_id || null,
          body.countdown_at_utc || null,
          body.is_active ? 1 : 0
        ).run();

        await logActivity(env, admin.email, "update_news", "news_block", 1, body.title_zh_tw);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 4. Tour Dates CRUD
  if (path === "tours") {
    if (method === "GET") {
      const result = await db.prepare(`select * from tour_dates order by starts_at_utc desc`).all();
      return json(result.results || []);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as any;
        const slug = body.slug || slugify(`${body.location_en}-${body.local_date}`);
        let result;

        if (body.id) {
          result = await db.prepare(
            `update tour_dates set
               slug = ?, local_date = ?, local_time = ?, timezone = ?, starts_at_utc = ?,
               location_en = ?, location_zh_tw = ?, location_zh_cn = ?,
               description_en = ?, description_zh_tw = ?, description_zh_cn = ?,
               is_active = ?, updated_at = current_timestamp
             where id = ?`
          ).bind(
            slug, body.local_date, body.local_time, body.timezone, body.starts_at_utc,
            body.location_en, body.location_zh_tw, body.location_zh_cn,
            body.description_en, body.description_zh_tw, body.description_zh_cn,
            body.is_active ? 1 : 0, body.id
          ).run();
          await logActivity(env, admin.email, "update_tour", "tour_date", body.id, body.location_zh_tw);
        } else {
          result = await db.prepare(
            `insert into tour_dates (slug, local_date, local_time, timezone, starts_at_utc, location_en, location_zh_tw, location_zh_cn, description_en, description_zh_tw, description_zh_cn, is_active)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            slug, body.local_date, body.local_time, body.timezone, body.starts_at_utc,
            body.location_en, body.location_zh_tw, body.location_zh_cn,
            body.description_en, body.description_zh_tw, body.description_zh_cn,
            body.is_active ? 1 : 0
          ).run();
          await logActivity(env, admin.email, "create_tour", "tour_date", Number(result.meta.last_row_id), body.location_zh_tw);
        }
        return json({ ok: true, id: body.id || result.meta.last_row_id });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  if (path === "tours/delete") {
    if (method === "POST") {
      try {
        const body = await request.json() as { id: number };
        await db.prepare(`delete from tour_dates where id = ?`).bind(body.id).run();
        await logActivity(env, admin.email, "delete_tour", "tour_date", body.id);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 5. Tour Ticket Links
  if (path === "tour-links") {
    if (method === "GET") {
      const tourDateId = new URL(request.url).searchParams.get("tour_date_id");
      const result = await db.prepare(
        `select l.*, m.r2_key, m.alt_text
         from tour_ticket_links l
         left join media_assets m on m.id = l.logo_media_id
         where l.tour_date_id = ?
         order by l.sort_order asc`
      ).bind(tourDateId).all();
      return json(result.results || []);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as { tour_date_id: number; links: any[] };
        
        // Re-write all ticket links in a simple transaction/batch
        const batch = [
          db.prepare(`delete from tour_ticket_links where tour_date_id = ?`).bind(body.tour_date_id)
        ];
        
        body.links.forEach((link, index) => {
          batch.push(
            db.prepare(
              `insert into tour_ticket_links (tour_date_id, name, url, logo_media_id, sort_order, is_active)
               values (?, ?, ?, ?, ?, ?)`
            ).bind(body.tour_date_id, link.name, link.url, link.logo_media_id, index, link.is_active ? 1 : 0)
          );
        });
        
        await db.batch(batch);
        await logActivity(env, admin.email, "update_tour_links", "tour_date", body.tour_date_id);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 6. Album Covers CRUD
  if (path === "albums") {
    if (method === "GET") {
      const result = await db.prepare(
        `select a.*, m.r2_key, m.alt_text
         from album_covers a
         left join media_assets m on m.id = a.image_media_id
         order by a.sort_order asc`
      ).all();
      return json(result.results || []);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as { albums: any[] };
        const batch = [db.prepare(`delete from album_covers`)];
        
        body.albums.forEach((album, index) => {
          batch.push(
            db.prepare(
              `insert into album_covers (title, image_media_id, sort_order, is_active)
               values (?, ?, ?, ?)`
            ).bind(album.title, album.image_media_id, index, album.is_active ? 1 : 0)
          );
        });
        
        await db.batch(batch);
        await logActivity(env, admin.email, "update_albums", "album_covers", null, `Updated ${body.albums.length} album covers`);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 7. Video Links CRUD
  if (path === "videos") {
    if (method === "GET") {
      const result = await db.prepare(
        `select v.*, m.r2_key, m.alt_text
         from video_links v
         left join media_assets m on m.id = v.thumbnail_media_id
         order by v.sort_order asc`
      ).all();
      return json(result.results || []);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as { videos: any[] };
        const batch = [db.prepare(`delete from video_links`)];
        
        body.videos.forEach((video, index) => {
          batch.push(
            db.prepare(
              `insert into video_links (title, provider_en, url_en, provider_zh_tw, url_zh_tw, provider_zh_cn, url_zh_cn, thumbnail_media_id, sort_order, is_active)
               values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              video.title,
              video.providerEn, video.urlEn,
              video.providerZhTw, video.urlZhTw,
              video.providerZhCn, video.urlZhCn,
              video.thumbnail_media_id || null,
              index,
              video.is_active ? 1 : 0
            )
          );
        });
        
        await db.batch(batch);
        await logActivity(env, admin.email, "update_videos", "video_links", null, `Updated ${body.videos.length} videos`);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 8. Social Links CRUD
  if (path === "socials") {
    if (method === "GET") {
      const result = await db.prepare(
        `select s.*, m.r2_key, m.alt_text
         from social_links s
         left join media_assets m on m.id = s.logo_media_id
         order by s.sort_order asc`
      ).all();
      return json(result.results || []);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as { socials: any[] };
        const batch = [db.prepare(`delete from social_links`)];
        
        body.socials.forEach((social, index) => {
          batch.push(
            db.prepare(
              `insert into social_links (name, url, logo_media_id, sort_order, is_active)
               values (?, ?, ?, ?, ?)`
            ).bind(social.name, social.url, social.logo_media_id, index, social.is_active ? 1 : 0)
          );
        });
        
        await db.batch(batch);
        await logActivity(env, admin.email, "update_socials", "social_links", null, `Updated ${body.socials.length} social links`);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 9. Site Settings (Merch)
  if (path === "settings") {
    if (method === "GET") {
      const settings = await db.prepare(`select * from site_settings where id = 1`).first();
      return json(settings || null);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as any;
        await db.prepare(
          `insert into site_settings (id, merch_url_en, merch_url_zh_tw, merch_url_zh_cn, merch_is_active)
           values (1, ?, ?, ?, ?)
           on conflict(id) do update set
             merch_url_en=excluded.merch_url_en,
             merch_url_zh_tw=excluded.merch_url_zh_tw,
             merch_url_zh_cn=excluded.merch_url_zh_cn,
             merch_is_active=excluded.merch_is_active,
             updated_at=current_timestamp`
        ).bind(
          body.merch_url_en || null,
          body.merch_url_zh_tw || null,
          body.merch_url_zh_cn || null,
          body.merch_is_active ? 1 : 0
        ).run();

        await logActivity(env, admin.email, "update_settings", "site_settings", 1);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 10. Owner-only: Users CRUD
  if (path === "users") {
    if (admin.role !== "owner") {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (method === "GET") {
      const result = await db.prepare(`select id, email, role, is_active from admin_users order by email asc`).all();
      return json(result.results || []);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as any;
        let result;
        if (body.id) {
          result = await db.prepare(
            `update admin_users set role = ?, is_active = ?, updated_at = current_timestamp where id = ?`
          ).bind(body.role, body.is_active ? 1 : 0, body.id).run();
          await logActivity(env, admin.email, "update_user", "admin_user", body.id, `${body.email} role=${body.role} active=${body.is_active}`);
        } else {
          result = await db.prepare(
            `insert into admin_users (email, role, is_active) values (?, ?, ?)`
          ).bind(body.email.toLowerCase().trim(), body.role, body.is_active ? 1 : 0).run();
          await logActivity(env, admin.email, "create_user", "admin_user", Number(result.meta.last_row_id), body.email);
        }
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  // 11. Owner-only: Activity Audit Trail
  if (path === "activity") {
    if (admin.role !== "owner") {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (method === "GET") {
      const result = await db.prepare(`select * from activity_logs order by created_at desc limit 250`).all();
      return json(result.results || []);
    }
  }

  return json({ error: `No admin endpoint for ${method} /${path}` }, { status: 404 });
};
