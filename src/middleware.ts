import { defineMiddleware } from "astro:middleware";
import { getAdminContext } from "./lib/admin";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Check if we are visiting an admin route (either exactly "/sam-admin" or starting with "/sam-admin/")
  if (pathname === "/sam-admin" || pathname.startsWith("/sam-admin/")) {
    const env = context.locals.runtime?.env;
    const admin = await getAdminContext(env, context.request);
    
    // Share admin context with the rest of the application
    context.locals.admin = admin;

    // Check auth, excluding the login page itself
    if (pathname !== "/sam-admin/login") {
      // For API routes, return 401 if unauthorized
      if (pathname.startsWith("/sam-admin/api/")) {
        if (!admin) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }
      } else {
        // For pages, redirect to login if unauthorized
        if (!admin) {
          return context.redirect("/sam-admin/login");
        }
      }
    }
  }

  return next();
});
