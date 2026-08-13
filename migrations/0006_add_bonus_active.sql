-- Add bonus_is_active column to site_settings
ALTER TABLE site_settings ADD COLUMN bonus_is_active INTEGER DEFAULT 0;
