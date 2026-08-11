import type { APIRoute } from "astro";
import { getAdminContext, json, logActivity } from "@/lib/admin";

export const prerender = false;

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);

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
  const path = params.path || "status";
  const db = env?.DB;
  const bucket = env?.MEDI_BUCKET || env?.MEDIA_BUCKET;
  const method = request.method;

  // Allow authorization via CRON_SECRET for the garbage collect endpoint
  const authHeader = request.headers.get("Authorization");
  const isCronAuthorized = (env as any)?.CRON_SECRET && authHeader === `Bearer ${(env as any).CRON_SECRET}`;

  if (method === "POST" && path === "media/gc" && isCronAuthorized) {
    if (!db) return json({ error: "Database not configured" }, { status: 503 });
    if (!bucket) return json({ error: "Media storage is not configured" }, { status: 503 });

    try {
      const d1Assets = await db.prepare(`select r2_key from media_assets`).all<{ r2_key: string }>();
      const validKeys = new Set((d1Assets.results || []).map(row => row.r2_key));

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

      await logActivity(env, "system-cron", "garbage_collect", "media_asset", null, `Purged ${deleted.length} orphaned R2 files.`);
      return json({ ok: true, purged: deleted });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  const admin = await getAdminContext(env, request);

  if (!admin) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return json({ error: "Database not configured" }, { status: 503 });
  }

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
      if (!allowedImageTypes.has(file.type) && !allowedVideoTypes.has(file.type)) {
        return json({ error: "Only PNG, JPG, JPEG, WebP images and MP4, WEBM, OGG, MOV videos are allowed" }, { status: 400 });
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

      // Try deleting from D1 first (blocks if referenced due to foreign key check)
      await db.batch([
        db.prepare(`PRAGMA foreign_keys = ON;`),
        db.prepare(`delete from media_assets where id = ?`).bind(body.id)
      ]);

      // If D1 deletion succeeded, try deleting from R2 next
      if (bucket) {
        try {
          await bucket.delete(asset.r2_key);
        } catch (r2Err) {
          console.error("R2 deletion error:", r2Err);
          // R2 file will be cleaned up by garbage collection
        }
      }

      await logActivity(env, admin.email, "delete_media", "media_asset", body.id, asset.file_name);
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: "Cannot delete media. It might be referenced by other content." }, { status: 409 });
    }
  }

  if (method === "POST" && path === "media/gc") {
    if (!bucket) return json({ error: "Media storage is not configured" }, { status: 503 });

    try {
      // 1. Get all valid keys in D1
      const d1Assets = await db.prepare(`select r2_key from media_assets`).all<{ r2_key: string }>();
      const validKeys = new Set((d1Assets.results || []).map(row => row.r2_key));

      // 2. List all files in R2 bucket
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

      // 3. Delete orphaned files from R2
      const deleted: string[] = [];
      for (const key of orphanedKeys) {
        await bucket.delete(key);
        deleted.push(key);
      }

      await logActivity(env, admin.email, "garbage_collect", "media_asset", null, `Purged ${deleted.length} orphaned R2 files.`);
      return json({ ok: true, purged: deleted });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
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
      try {
        const albumsResult = await db.prepare(
          `select a.*, m.r2_key, m.alt_text
           from album_covers a
           left join media_assets m on m.id = a.image_media_id
           order by a.sort_order asc`
        ).all();
        const linksResult = await db.prepare(
          `select * from album_platform_links`
        ).all();

        const albums = (albumsResult.results || []) as any[];
        const links = (linksResult.results || []) as any[];

        const mapped = albums.map(album => ({
          ...album,
          links: links.filter(l => l.album_id === album.id)
        }));
        return json(mapped);
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
    if (method === "POST") {
      try {
        const body = await request.json() as { albums: any[] };
        
        // Delete all albums (cascades to links)
        await db.prepare(`delete from album_covers`).run();

        // Sequentially insert each album and its custom links
        for (let index = 0; index < body.albums.length; index++) {
          const album = body.albums[index];
          const insertAlbum = await db.prepare(
            `insert into album_covers (title, image_media_id, sort_order, is_active)
             values (?, ?, ?, ?) RETURNING id`
          ).bind(album.title, album.image_media_id, index, album.is_active ? 1 : 0).first<{ id: number }>();

          const newAlbumId = insertAlbum?.id;
          if (newAlbumId && album.links && Array.isArray(album.links)) {
            const linkBatch = album.links.map((link: any) =>
              db.prepare(
                `insert into album_platform_links (album_id, platform_id, url)
                 values (?, ?, ?)`
              ).bind(newAlbumId, link.platformId || link.platform_id, link.url)
            );
            if (linkBatch.length > 0) {
              await db.batch(linkBatch);
            }
          }
        }

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

  // 8.5 Music Links CRUD
  if (path === "music") {
    if (method === "GET") {
      const result = await db.prepare(
        `select p.*, m.r2_key, m.alt_text
         from music_platform_links p
         left join media_assets m on m.id = p.logo_media_id
         order by p.sort_order asc`
      ).all();
      return json(result.results || []);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as { musicLinks: any[] };

        // 1. Fetch existing platform IDs
        const existingResult = await db.prepare(`select id from music_platform_links`).all();
        const existingIds = (existingResult.results || []).map((row: any) => Number(row.id));

        // 2. Identify incoming IDs
        const incomingIds = new Set(body.musicLinks.map((link: any) => Number(link.id)).filter(id => !isNaN(id)));

        // 3. Find deleted IDs
        const deletedIds = existingIds.filter(id => !incomingIds.has(id));

        if (deletedIds.length > 0) {
          // 4. Check if any deleted platform is referenced in album_platform_links
          const queryPlaceholders = deletedIds.map(() => "?").join(",");
          const checkRefs = await db.prepare(
            `select count(*) as count from album_platform_links where platform_id in (${queryPlaceholders})`
          ).bind(...deletedIds).first<{ count: number }>();

          if (checkRefs && checkRefs.count > 0) {
            return json(
              { error: "Can not delete the platform, there is albums using it. Delete first all the albums, then the platform" },
              { status: 400 }
            );
          }
        }

        // Delete all music platforms first
        await db.prepare(`delete from music_platform_links`).run();

        // Batch insert the new platform list, keeping original IDs if they exist
        const batch: any[] = [];
        body.musicLinks.forEach((link, index) => {
          if (link.id) {
            batch.push(
              db.prepare(
                `insert into music_platform_links (id, name, url, logo_media_id, sort_order, is_active)
                 values (?, ?, ?, ?, ?, ?)`
              ).bind(Number(link.id), link.name, link.url, link.logo_media_id, index, link.is_active ? 1 : 0)
            );
          } else {
            batch.push(
              db.prepare(
                `insert into music_platform_links (name, url, logo_media_id, sort_order, is_active)
                 values (?, ?, ?, ?, ?)`
              ).bind(link.name, link.url, link.logo_media_id, index, link.is_active ? 1 : 0)
            );
          }
        });

        if (batch.length > 0) {
          await db.batch(batch);
        }

        await logActivity(env, admin.email, "update_music_links", "music_platform_links", null, `Updated ${body.musicLinks.length} music platform links`);
        return json({ ok: true });
      } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
      }
    }
  }

  if (path === "settings") {
    if (method === "GET") {
      const settings = await db.prepare(`select * from site_settings where id = 1`).first();
      return json(settings || null);
    }
    if (method === "POST") {
      try {
        const body = await request.json() as any;
        await db.prepare(
          `insert into site_settings (
             id, merch_url_en, merch_url_zh_tw, merch_url_zh_cn, merch_is_active,
             bonus_title_en, bonus_title_zh_tw, bonus_title_zh_cn,
             bonus_text_en, bonus_text_zh_tw, bonus_text_zh_cn, bonus_media_id
           )
           values (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
             updated_at=current_timestamp`
        ).bind(
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
          body.bonus_media_id || null
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
