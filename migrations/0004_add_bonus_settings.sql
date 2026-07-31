-- Add bonus page configuration columns to site_settings
ALTER TABLE site_settings ADD COLUMN bonus_title_en TEXT;
ALTER TABLE site_settings ADD COLUMN bonus_title_zh_tw TEXT;
ALTER TABLE site_settings ADD COLUMN bonus_title_zh_cn TEXT;
ALTER TABLE site_settings ADD COLUMN bonus_text_en TEXT;
ALTER TABLE site_settings ADD COLUMN bonus_text_zh_tw TEXT;
ALTER TABLE site_settings ADD COLUMN bonus_text_zh_cn TEXT;
ALTER TABLE site_settings ADD COLUMN bonus_media_id INTEGER REFERENCES media_assets(id);
