# Cloudflare Setup

This project can start before the final domain is purchased.

## 1. Create D1

In Cloudflare dashboard:

1. Open Workers & Pages.
2. Open D1 SQL Database.
3. Create database.
4. Name it `sam-production`.

After creation, copy the database ID into `wrangler.toml`.

## 2. Create R2

1. Open R2 Object Storage.
2. Create bucket.
3. Name it `sam-media-production`.

During development, media can be served through `/media/...`.
After the final domain exists, connect a custom R2 domain such as `media.samleemuzik.com`.

## 3. Create Pages Project

After the repository contains the Astro project:

1. Open Workers & Pages.
2. Create application.
3. Choose Pages.
4. Connect to GitHub.
5. Select this repository.
6. Build command: `npm run build`.
7. Output directory: `dist`.

Cloudflare will provide a temporary `*.pages.dev` URL.

## 4. Bind Resources

In the Pages project settings, add:

- D1 binding: `DB` -> `sam-production`
- R2 binding: `MEDIA_BUCKET` -> `sam-media-production`

Add environment variables:

- `PUBLIC_MEDIA_BASE_URL=/media` before a domain exists
- `INITIAL_ADMIN_EMAIL=your-google-email@example.com`
- `ADMIN_PATH=/sam-admin`

## 5. Protect Admin With Cloudflare Access

In Zero Trust:

1. Open Access > Applications.
2. Add a self-hosted application.
3. Use the Pages domain or custom domain, for example `samleemuzik.com`.
4. Path: `/sam-admin/*`.
5. Policy: allow specific Google email addresses.

When the final domain is connected, ensure Access protection is active for that domain.
