create table if not exists admin_users (
  id integer primary key autoincrement,
  email text not null unique,
  role text not null check (role in ('owner', 'editor')),
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists activity_logs (
  id integer primary key autoincrement,
  admin_email text not null,
  action text not null,
  entity_type text,
  entity_id integer,
  details text,
  created_at text not null default current_timestamp
);

create table if not exists media_assets (
  id integer primary key autoincrement,
  r2_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null,
  alt_text text not null default '',
  created_by_email text,
  created_at text not null default current_timestamp
);

create table if not exists news_blocks (
  id integer primary key autoincrement,
  title_en text not null,
  title_zh_tw text not null,
  title_zh_cn text not null,
  body_en text not null,
  body_zh_tw text not null,
  body_zh_cn text not null,
  background_media_id integer references media_assets(id),
  countdown_at_utc text,
  publish_at_utc text,
  unpublish_at_utc text,
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists tour_dates (
  id integer primary key autoincrement,
  slug text not null unique,
  local_date text not null,
  local_time text not null,
  timezone text not null,
  starts_at_utc text not null,
  location_en text not null,
  location_zh_tw text not null,
  location_zh_cn text not null,
  description_en text not null,
  description_zh_tw text not null,
  description_zh_cn text not null,
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists tour_ticket_links (
  id integer primary key autoincrement,
  tour_date_id integer not null references tour_dates(id) on delete cascade,
  name text not null,
  url text not null,
  logo_media_id integer not null references media_assets(id),
  sort_order integer not null default 0,
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists album_covers (
  id integer primary key autoincrement,
  title text not null,
  image_media_id integer not null references media_assets(id),
  sort_order integer not null default 0,
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists video_links (
  id integer primary key autoincrement,
  title text not null,
  provider_en text not null,
  url_en text not null,
  provider_zh_tw text not null,
  url_zh_tw text not null,
  provider_zh_cn text not null,
  url_zh_cn text not null,
  thumbnail_media_id integer references media_assets(id),
  sort_order integer not null default 0,
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists music_platform_links (
  id integer primary key autoincrement,
  name text not null,
  url text not null,
  logo_media_id integer not null references media_assets(id),
  sort_order integer not null default 0,
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists social_links (
  id integer primary key autoincrement,
  name text not null,
  url text not null,
  logo_media_id integer not null references media_assets(id),
  sort_order integer not null default 0,
  is_active integer not null default 1,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

create table if not exists site_settings (
  id integer primary key check (id = 1),
  merch_url_en text,
  merch_url_zh_tw text,
  merch_url_zh_cn text,
  merch_is_active integer not null default 0,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);

insert or ignore into site_settings (id) values (1);
