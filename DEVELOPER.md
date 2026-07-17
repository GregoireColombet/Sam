# Sam Lee Official Site - Developer Guide

This document describes the code organization, architecture patterns, and coding conventions for the Sam Lee Astro project. Any developer or AI assistant extending this codebase should follow the guidelines and structures documented below.

---

## Technical Stack
- **Framework**: Astro (v5)
- **Database**: Cloudflare D1 (SQLite-based distributed database)
- **Media Storage**: Cloudflare R2 bucket
- **Deployment & Hosting**: Cloudflare Pages / Workers
- **Styling**: Vanilla CSS (highly tailored variables, dark/light theme systems)

---

## Directory Structure

```text
├── .wrangler/               # Cloudflare local dev cache
├── docs/                    # Deployment & database documentation
├── migrations/              # D1 SQL migrations (0001_initial, etc.)
├── public/                  # Static assets (logo, fonts, favicon)
├── src/
│   ├── components/          # Reusable UI components (SiteNav, Hero, etc.)
│   ├── layouts/             # Page shell wrappers (BaseLayout, AdminLayout)
│   ├── lib/                 # Shared server and client code libraries
│   │   ├── admin.ts         # Authentication context and session management
│   │   ├── db.ts            # D1 database queries and row mapping functions
│   │   ├── i18n.ts          # Localization routing and translation helpers
│   │   ├── types.ts         # Global TypeScript definitions
│   │   └── utils.ts         # Common utility functions (formatting, etc.)
│   ├── pages/               # File-based routing
│   │   ├── [locale]/        # Trilingual pages (about, merch, music, tour)
│   │   ├── media/           # R2 media asset passthrough endpoint
│   │   └── sam-admin/       # Admin Dashboard pages
│   │       ├── api/         # Admin REST CRUD endpoint (`[...path].ts`)
│   │       ├── content.astro# Content Manager page (HTML & SSR query)
│   │       └── content.client.ts # Companion client script for content forms
│   └── middleware.ts        # Admin route authentication guards
├── astro.config.mjs         # Astro configuration (Cloudflare adapter)
├── package.json             # NPM dependencies & scripts
├── tsconfig.json            # TypeScript configuration
└── wrangler.toml            # Cloudflare resources configuration
```

---

## Architecture & Code Conventions

### 1. Localization (i18n)
The project supports three locales: English (`en`), Traditional Chinese (`zh-TW`), and Simplified Chinese (`zh-CN`).
- **Data Structure**: Multi-language fields in the database use separate columns (e.g. `title_en`, `title_zh_tw`, `title_zh_cn`) and map to `LocalizedText` in TypeScript:
  ```typescript
  export type LocalizedText = {
    en: string;
    zhTW: string;
    zhCN: string;
  };
  ```
- **Usage**: Always use the central translation helpers defined in `src/lib/i18n.ts`:
  - Use `getLocalized(news.title, locale)` to fetch the localized text. Do **not** write inline ternaries (`locale === "en" ? ...`).
  - Use `getLocalizedVideoUrl(video, locale)` for localized video links.
  - Use `localePath(locale, "/path")` to generate correct locale-aware URLs.

### 2. Separation of Concerns (File Splitting)
- **Astro files (`.astro`)** should focus primarily on server-side rendering (SSR), fetching initial data from `src/lib/db.ts`, and rendering semantic HTML/CSS structures.
- **Client-Side Scripts**: If a page or component has complex client-side interactivity (such as the content manager forms, modals, sorting logic), the JavaScript must be extracted into a companion file named `[filename].client.ts` in the same directory.
- **Reference**: Import client scripts in the Astro file using:
  ```html
  <script src="./filename.client.ts"></script>
  ```
- **Styles**: Keep CSS scoped to components/pages using `<style>` tags or place them in global styles (`BaseLayout.astro` / `AdminLayout.astro`).

### 3. Reusable Modules
- **D1 Queries**: All D1 database queries, batch commands, and mapping methods should live inside `src/lib/db.ts`. Do not write raw SQL queries or mapping logic inside frontmatter scripts of `.astro` pages.
- **Shared Utilities**: General-purpose helper functions (e.g., formatting file sizes, dates, math) belong in `src/lib/utils.ts`. Import them on both server (Astro frontmatter) and client (Vite bundle scripts) as needed.

### 4. Admin Routing & Authentication
- Admin pages reside under `src/pages/sam-admin/`.
- Access controls are enforced by `src/middleware.ts`. The context is automatically mapped to `Astro.locals.admin`.
- Endpoint handlers under `src/pages/sam-admin/api/[...path].ts` receive request parameters and handle CRUD endpoints. Restrict write endpoints to authenticated admin roles (Editor / Owner).

---

## Guidelines for Extensions & Contributions
When adding a new feature:
1. **Define Types**: Ensure all data shapes are strictly defined in `src/lib/types.ts`.
2. **Database Migrations**: Add new tables or schema changes as SQL files in the `migrations/` directory. Run them locally or remotely using:
   - Local: `npm run db:migrate:local`
   - Production: `npm run db:migrate:remote`
3. **Maintain DRY Principle**: Look inside `src/lib/` for existing utilities and localization helpers before writing custom ones.
4. **Validation**: Always run `npm run build` locally before committing code to check for TypeScript errors and ensure Astro bundle compatibility.
