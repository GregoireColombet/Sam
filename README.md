# Sam Lee Website

Astro + Cloudflare project for a multilingual artist website with a Cloudflare-protected admin area.

## Stack

- Astro
- Cloudflare Pages
- Cloudflare D1
- Cloudflare R2
- Cloudflare Access for Google login

## Public Site

- `/en`
- `/zh-TW`
- `/zh-CN`
- `/[locale]/music`
- `/[locale]/tour/[slug]`
- `/[locale]/merch`

Traditional Chinese is the fallback locale.

## Admin

Admin lives at:

```txt
/sam-admin
```

Cloudflare Access should protect:

```txt
/sam-admin/*
```

The app also checks that the authenticated Google email exists in `admin_users`.
The first owner can be bootstrapped with `INITIAL_ADMIN_EMAIL`.

## Local Development

Install dependencies:

```sh
npm install
```

Run the site:

```sh
npm run dev
```

Apply local D1 migrations:

```sh
npm run db:migrate:local
```

## Cloudflare Names

Recommended production resource names:

- D1 database: `sam-production`
- R2 bucket: `sam-media-production`
- Pages project: `sam-lee-site`

Update `wrangler.toml` with the real Cloudflare D1 database ID before production deployment.
