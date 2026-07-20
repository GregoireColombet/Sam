import type {
  LandingContent,
  PlatformLink,
  TourDate,
  VideoLink
} from "./types";

function mediaUrl(env: RuntimeEnv | undefined, key: string | null) {
  if (!key) return "";
  if (key.startsWith("assets/") || key.startsWith("/assets/") || key.startsWith("http://") || key.startsWith("https://")) {
    return key.startsWith("/") ? key : `/${key}`;
  }
  const base = env?.PUBLIC_MEDIA_BASE_URL || "/media";
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

function mapTour(row: Record<string, unknown>): TourDate {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    dateUtc: String(row.starts_at_utc),
    localDate: String(row.local_date),
    localTime: String(row.local_time),
    timezone: String(row.timezone),
    ticketLinkCount: Number(row.ticket_link_count || 0),
    location: {
      en: String(row.location_en || ""),
      zhTW: String(row.location_zh_tw || ""),
      zhCN: String(row.location_zh_cn || "")
    },
    description: {
      en: String(row.description_en || ""),
      zhTW: String(row.description_zh_tw || ""),
      zhCN: String(row.description_zh_cn || "")
    }
  };
}

function mapPlatform(row: Record<string, unknown>, env: RuntimeEnv | undefined): PlatformLink {
  return {
    id: Number(row.id),
    name: String(row.name || ""),
    url: String(row.url || ""),
    logo: {
      id: Number(row.logo_media_id || 0),
      url: mediaUrl(env, String(row.logo_key || "")),
      alt: String(row.logo_alt || row.name || "")
    }
  };
}

export async function getLandingContent(env?: RuntimeEnv): Promise<LandingContent> {
  const db = env?.DB;
  if (!db) return emptyLandingContent();

  try {
    const now = new Date().toISOString();
    const [news, toursResult, albums, videos, socials, merch] = await Promise.all([
      db.prepare(
        `select n.*, m.r2_key as background_key, m.alt_text as background_alt
         from news_blocks n
         left join media_assets m on m.id = n.background_media_id
         where n.is_active = 1
           and (n.publish_at_utc is null or n.publish_at_utc <= ?)
           and (n.unpublish_at_utc is null or n.unpublish_at_utc > ?)
         order by n.updated_at desc
         limit 1`
      ).bind(now, now).first<Record<string, unknown>>(),
      db.prepare(
        `select t.*, count(l.id) as ticket_link_count
         from tour_dates t
         left join tour_ticket_links l on l.tour_date_id = t.id and l.is_active = 1
         where t.is_active = 1
         group by t.id
         order by t.starts_at_utc asc`
      ).all<Record<string, unknown>>(),
      db.prepare(
        `select a.*, m.r2_key as image_key, m.alt_text as image_alt
         from album_covers a
         join media_assets m on m.id = a.image_media_id
         where a.is_active = 1
         order by a.sort_order asc, a.id asc`
      ).all<Record<string, unknown>>(),
      db.prepare(
        `select v.*, m.r2_key as thumbnail_key, m.alt_text as thumbnail_alt
         from video_links v
         left join media_assets m on m.id = v.thumbnail_media_id
         where v.is_active = 1
         order by v.sort_order asc, v.id asc`
      ).all<Record<string, unknown>>(),
      db.prepare(
        `select s.*, m.r2_key as logo_key, m.alt_text as logo_alt
         from social_links s
         join media_assets m on m.id = s.logo_media_id
         where s.is_active = 1
         order by s.sort_order asc, s.id asc`
      ).all<Record<string, unknown>>(),
      db.prepare(`select merch_url_en, merch_url_zh_tw, merch_url_zh_cn from site_settings where id = 1`)
        .first<Record<string, unknown>>()
    ]);

    return {
      news: news
        ? {
            title: {
              en: String(news.title_en || ""),
              zhTW: String(news.title_zh_tw || ""),
              zhCN: String(news.title_zh_cn || "")
            },
            body: {
              en: String(news.body_en || ""),
              zhTW: String(news.body_zh_tw || ""),
              zhCN: String(news.body_zh_cn || "")
            },
            countdownAtUtc: news.countdown_at_utc ? String(news.countdown_at_utc) : undefined,
            background: news.background_key
              ? {
                  id: Number(news.background_media_id || 0),
                  url: mediaUrl(env, String(news.background_key)),
                  alt: String(news.background_alt || "")
                }
              : undefined
          }
        : null,
      tours: (toursResult.results || []).map(mapTour),
      albums: (albums.results || []).map((row) => ({
        id: Number(row.id),
        title: String(row.title || ""),
        image: {
          id: Number(row.image_media_id || 0),
          url: mediaUrl(env, String(row.image_key || "")),
          alt: String(row.image_alt || row.title || "")
        }
      })),
      videos: (videos.results || []).map((row) => mapVideo(row, env)),
      socialLinks: (socials.results || []).map((row) => mapPlatform(row, env)),
      merchUrl: merch?.merch_url_zh_tw ? String(merch.merch_url_zh_tw) : null
    };
  } catch {
    return emptyLandingContent();
  }
}

export async function getMusicLinks(env?: RuntimeEnv): Promise<PlatformLink[]> {
  const db = env?.DB;
  if (!db) return [];
  try {
    const result = await db.prepare(
      `select p.*, m.r2_key as logo_key, m.alt_text as logo_alt
       from music_platform_links p
       join media_assets m on m.id = p.logo_media_id
       where p.is_active = 1
       order by p.sort_order asc, p.id asc`
    ).all<Record<string, unknown>>();
    return (result.results || []).map((row) => mapPlatform(row, env));
  } catch {
    return [];
  }
}

export async function getTourBySlug(env: RuntimeEnv | undefined, slug: string) {
  const db = env?.DB;
  if (!db) return null;
  try {
    const tour = await db.prepare(`select * from tour_dates where slug = ? and is_active = 1`)
      .bind(slug)
      .first<Record<string, unknown>>();
    if (!tour) return null;
    const links = await db.prepare(
      `select l.*, m.r2_key as logo_key, m.alt_text as logo_alt
       from tour_ticket_links l
       join media_assets m on m.id = l.logo_media_id
       where l.tour_date_id = ? and l.is_active = 1
       order by l.sort_order asc, l.id asc`
    ).bind(tour.id).all<Record<string, unknown>>();
    return {
      tour: mapTour({ ...tour, ticket_link_count: links.results?.length || 0 }),
      links: (links.results || []).map((row) => mapPlatform(row, env))
    };
  } catch {
    return null;
  }
}

export async function getMerchUrl(env?: RuntimeEnv, locale = "zh-TW") {
  const db = env?.DB;
  if (!db) return null;
  try {
    const settings = await db.prepare(
      `select merch_url_en, merch_url_zh_tw, merch_url_zh_cn, merch_is_active
       from site_settings where id = 1`
    ).first<Record<string, unknown>>();
    if (!settings || Number(settings.merch_is_active || 0) !== 1) return null;
    if (locale === "en") return settings.merch_url_en ? String(settings.merch_url_en) : null;
    if (locale === "zh-CN") return settings.merch_url_zh_cn ? String(settings.merch_url_zh_cn) : null;
    return settings.merch_url_zh_tw ? String(settings.merch_url_zh_tw) : null;
  } catch {
    return null;
  }
}

function mapVideo(row: Record<string, unknown>, env: RuntimeEnv | undefined): VideoLink {
  return {
    id: Number(row.id),
    title: String(row.title || ""),
    providerEn: String(row.provider_en || ""),
    urlEn: String(row.url_en || ""),
    providerZhTw: String(row.provider_zh_tw || ""),
    urlZhTw: String(row.url_zh_tw || ""),
    providerZhCn: String(row.provider_zh_cn || ""),
    urlZhCn: String(row.url_zh_cn || ""),
    thumbnail: row.thumbnail_key
      ? {
          id: Number(row.thumbnail_media_id || 0),
          url: mediaUrl(env, String(row.thumbnail_key)),
          alt: String(row.thumbnail_alt || row.title || "")
        }
      : undefined
  };
}

export function emptyLandingContent(): LandingContent {
  return {
    news: null,
    tours: [],
    albums: [],
    videos: [],
    socialLinks: [],
    merchUrl: null
  };
}
