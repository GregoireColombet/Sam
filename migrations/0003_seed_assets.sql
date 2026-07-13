-- Seed starter media assets (static folder fallbacks)
insert or ignore into media_assets (id, r2_key, file_name, content_type, size_bytes, alt_text, created_by_email) values
(101, 'assets/albums/album-1.jpg', 'album-1.jpg', 'image/jpeg', 100000, 'Sam Lee Album 1', 'greg.clb@gmail.com'),
(102, 'assets/albums/album-2.jpg', 'album-2.jpg', 'image/jpeg', 100000, 'Sam Lee Album 2', 'greg.clb@gmail.com'),
(103, 'assets/albums/album-3.jpg', 'album-3.jpg', 'image/jpeg', 100000, 'Sam Lee Album 3', 'greg.clb@gmail.com'),
(104, 'assets/albums/album-4.jpg', 'album-4.jpg', 'image/jpeg', 100000, 'Sam Lee Album 4', 'greg.clb@gmail.com'),
(105, 'assets/albums/album-5.jpg', 'album-5.jpg', 'image/jpeg', 100000, 'Sam Lee Album 5', 'greg.clb@gmail.com'),
(106, 'assets/albums/album-6.jpg', 'album-6.jpg', 'image/jpeg', 100000, 'Sam Lee Album 6', 'greg.clb@gmail.com'),
(107, 'assets/albums/album-7.jpg', 'album-7.jpg', 'image/jpeg', 100000, 'Sam Lee Album 7', 'greg.clb@gmail.com'),
(108, 'assets/albums/album-8.jpg', 'album-8.jpg', 'image/jpeg', 100000, 'Sam Lee Album 8', 'greg.clb@gmail.com');

-- Seed starter album covers
insert or ignore into album_covers (title, image_media_id, sort_order, is_active) values
('Devoted Love (癡心絕對)', 101, 1, 1),
('Let Go (手放開)', 102, 2, 1),
('Recently (最近)', 103, 3, 1),
('Starry Sky (眼底星空)', 104, 4, 1),
('So Cut (切歌)', 105, 5, 1),
('Face (Face 專輯)', 106, 6, 1),
('Live Album (李聖傑微風音樂會)', 107, 7, 1),
('Love Ballads (李聖傑經典情歌)', 108, 8, 1);

-- Seed starter videos (Sam Lee's actual famous MVs)
insert or ignore into video_links (title, provider_en, url_en, provider_zh_tw, url_zh_tw, provider_zh_cn, url_zh_cn, sort_order, is_active) values
('癡心絕對 (Devoted Love) - Official MV', 'youtube', 'https://www.youtube.com/watch?v=nE5nKq80p3g', 'youtube', 'https://www.youtube.com/watch?v=nE5nKq80p3g', 'youtube', 'https://www.youtube.com/watch?v=nE5nKq80p3g', 1, 1),
('手放開 (Let Go) - Official MV', 'youtube', 'https://www.youtube.com/watch?v=FqE1N95fexM', 'youtube', 'https://www.youtube.com/watch?v=FqE1N95fexM', 'youtube', 'https://www.youtube.com/watch?v=FqE1N95fexM', 2, 1),
('最近 (Recently) - Official MV', 'youtube', 'https://www.youtube.com/watch?v=gJg-g_Z1Jq0', 'youtube', 'https://www.youtube.com/watch?v=gJg-g_Z1Jq0', 'youtube', 'https://www.youtube.com/watch?v=gJg-g_Z1Jq0', 3, 1),
('眼底星空 (Starry Sky) - Official MV', 'youtube', 'https://www.youtube.com/watch?v=rWlC9Jc7104', 'youtube', 'https://www.youtube.com/watch?v=rWlC9Jc7104', 'youtube', 'https://www.youtube.com/watch?v=rWlC9Jc7104', 4, 1);

-- Seed starter news block (active, with countdown in Taiwan timezone)
insert or ignore into news_blocks (id, title_en, title_zh_tw, title_zh_cn, body_en, body_zh_tw, body_zh_cn, countdown_at_utc, is_active) values
(1, 'Sam Lee New Album "FACE" World Tour Coming Soon!', '李聖傑 全新專輯【FACE】世界巡迴演唱會即將引爆！', '李圣杰 全新专辑【FACE】世界巡回演唱会即将引爆！', 'Legendary love song king Sam Lee is launching his new world tour "FACE". Stay tuned for ticket release dates!', '情歌歌王李聖傑全新巡迴【FACE】即將開啟，經典名曲重現，敬請期待門票開賣資訊！', '情歌歌王李圣杰全新巡回【FACE】即将开启，经典名曲重现，敬请期待门票开卖资讯！', '2026-10-01T12:00:00Z', 1);

-- Seed some starter tour dates
insert or ignore into tour_dates (id, slug, local_date, local_time, timezone, starts_at_utc, location_en, location_zh_tw, location_zh_cn, description_en, description_zh_tw, description_zh_cn, is_active) values
(201, 'taipei-arena-2026', '2026-11-20', '19:30', 'Asia/Taipei', '2026-11-20T11:30:00Z', 'Taipei Arena', '台北小巨蛋', '台北小巨蛋', 'Sam Lee World Tour "FACE" Live in Taipei Arena!', '李聖傑【FACE】世界巡迴演唱會台北場，首站引爆小巨蛋！', '李圣杰【FACE】世界巡回演唱会台北场，首站引爆小巨蛋！', 1),
(202, 'kaohsiung-arena-2026', '2026-12-18', '19:30', 'Asia/Taipei', '2026-12-18T11:30:00Z', 'Kaohsiung Arena', '高雄巨蛋', '高雄巨蛋', 'Sam Lee World Tour "FACE" Live in Kaohsiung Arena!', '李聖傑【FACE】世界巡迴演唱會高雄場，巨蛋深情開唱！', '李圣杰【FACE】世界巡回演唱会高雄场，巨蛋深情开唱！', 1);
