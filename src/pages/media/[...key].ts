import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key;
  const bucket = locals.runtime?.env.MEDIA_BUCKET;

  if (!key || !bucket) {
    return new Response("Media not found", { status: 404 });
  }

  const object = await bucket.get(key);
  if (!object) {
    return new Response("Media not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
};
