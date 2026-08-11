-- Migration to add platform custom links to music albums
CREATE TABLE IF NOT EXISTS album_platform_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id INTEGER NOT NULL REFERENCES album_covers(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES music_platform_links(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT current_timestamp,
  updated_at TEXT NOT NULL DEFAULT current_timestamp,
  UNIQUE(album_id, platform_id)
);
