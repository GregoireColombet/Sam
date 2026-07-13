/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type RuntimeEnv = {
  DB?: D1Database;
  MEDIA_BUCKET?: R2Bucket;
  MEDI_BUCKET?: R2Bucket;
  PUBLIC_MEDIA_BASE_URL?: string;
  INITIAL_ADMIN_EMAIL?: string;
  ADMIN_PATH?: string;
};

declare namespace App {
  interface Locals {
    runtime?: {
      env: RuntimeEnv;
    };
  }
}
