-- Rename is_active column to is_single in album_covers table
ALTER TABLE album_covers RENAME COLUMN is_active TO is_single;
