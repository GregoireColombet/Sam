import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

export async function handleAlbums(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    try {
      const albumsResult = await db
        .prepare(
          `select a.*, m.r2_key, m.alt_text
           from album_covers a
           left join media_assets m on m.id = a.image_media_id
           order by a.production_date desc`
        )
        .all();
      const linksResult = await db.prepare(`select * from album_platform_links`).all();

      const albums = (albumsResult.results || []) as any[];
      const links = (linksResult.results || []) as any[];

      const mapped = albums.map((album) => ({
        ...album,
        links: links.filter((l) => l.album_id === album.id)
      }));
      return json(mapped);
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { albums: any[] };
      const incomingAlbums = body.albums || [];

      // 1. Get existing albums from DB
      const existing = await db.prepare(`select id from album_covers`).all<{ id: number }>();
      const existingIds = new Set((existing.results || []).map((r) => r.id));

      // 2. Identify which ones to delete
      const incomingIds = new Set(incomingAlbums.map((a) => a.id).filter(Boolean) as number[]);
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

      if (toDelete.length > 0) {
        const deleteBatch = toDelete.map((id) =>
          db.prepare(`delete from album_covers where id = ?`).bind(id)
        );
        await db.batch(deleteBatch);
      }

      // 3. Update or Insert each incoming album
      for (const album of incomingAlbums) {
        let albumId = album.id;
        const isSingleVal =
          album.is_single === 1 || album.is_single === true || album.is_single === "on" ? 1 : 0;
        const prodDate = album.production_date || album.productionDate || "2000-01-01";

        if (albumId && existingIds.has(albumId)) {
          await db
            .prepare(
              `update album_covers set title = ?, image_media_id = ?, production_date = ?, is_single = ?, updated_at = current_timestamp where id = ?`
            )
            .bind(album.title, album.image_media_id, prodDate, isSingleVal, albumId)
            .run();
        } else {
          const insertResult = await db
            .prepare(
              `insert into album_covers (title, image_media_id, production_date, is_single)
               values (?, ?, ?, ?) RETURNING id`
            )
            .bind(album.title, album.image_media_id, prodDate, isSingleVal)
            .first<{ id: number }>();
          albumId = insertResult?.id;
        }

        if (albumId) {
          // Sync platform links for this album
          await db.prepare(`delete from album_platform_links where album_id = ?`).bind(albumId).run();
          if (album.links && Array.isArray(album.links)) {
            const linkBatch = album.links.map((link: any) =>
              db
                .prepare(
                  `insert into album_platform_links (album_id, platform_id, url)
                   values (?, ?, ?)`
                )
                .bind(albumId, link.platformId || link.platform_id, link.url)
            );
            if (linkBatch.length > 0) {
              await db.batch(linkBatch);
            }
          }
        }
      }

      await logActivity(
        env,
        admin.email,
        "update_albums",
        "album_covers",
        null,
        `Updated ${body.albums.length} album covers`
      );
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /albums` }, { status: 405 });
}

export async function handleMusic(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (request.method === "GET") {
    const result = await db
      .prepare(
        `select p.*, m.r2_key, m.alt_text
         from music_platform_links p
         left join media_assets m on m.id = p.logo_media_id
         order by p.sort_order asc`
      )
      .all();
    return json(result.results || []);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { musicLinks: any[] };
      const incomingMusic = body.musicLinks || [];

      // 1. Fetch existing platform IDs
      const existingResult = await db.prepare(`select id from music_platform_links`).all<{ id: number }>();
      const existingIds = new Set((existingResult.results || []).map((row) => Number(row.id)));

      // 2. Identify deleted ones
      const incomingIds = new Set(
        incomingMusic.map((link) => Number(link.id)).filter((id) => !isNaN(id) && id > 0)
      );
      const deletedIds = [...existingIds].filter((id) => !incomingIds.has(id));

      if (deletedIds.length > 0) {
        const queryPlaceholders = deletedIds.map(() => "?").join(",");
        const checkRefs = await db
          .prepare(
            `select count(*) as count from album_platform_links where platform_id in (${queryPlaceholders})`
          )
          .bind(...deletedIds)
          .first<{ count: number }>();

        if (checkRefs && checkRefs.count > 0) {
          return json(
            { error: "Cannot delete the platform, there are albums using it. Remove it from all albums first." },
            { status: 400 }
          );
        }

        const deleteBatch = deletedIds.map((id) =>
          db.prepare(`delete from music_platform_links where id = ?`).bind(id)
        );
        await db.batch(deleteBatch);
      }

      // 3. Update or Insert
      const batch: any[] = [];
      incomingMusic.forEach((link, index) => {
        const isActiveVal =
          link.is_active === 1 || link.is_active === true || link.is_active === "on" ? 1 : 0;
        if (link.id && existingIds.has(Number(link.id))) {
          batch.push(
            db
              .prepare(
                `update music_platform_links set name = ?, url = ?, logo_media_id = ?, sort_order = ?, is_active = ?, updated_at = current_timestamp where id = ?`
              )
              .bind(link.name, link.url, link.logo_media_id, index, isActiveVal, Number(link.id))
          );
        } else {
          batch.push(
            db
              .prepare(
                `insert into music_platform_links (name, url, logo_media_id, sort_order, is_active)
                 values (?, ?, ?, ?, ?)`
              )
              .bind(link.name, link.url, link.logo_media_id, index, isActiveVal)
          );
        }
      });

      if (batch.length > 0) {
        await db.batch(batch);
      }

      await logActivity(
        env,
        admin.email,
        "update_music_links",
        "music_platform_links",
        null,
        `Updated ${body.musicLinks.length} music platform links`
      );
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /music` }, { status: 405 });
}
