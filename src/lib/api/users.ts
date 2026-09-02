import type { AdminContext } from "@/lib/admin";
import { json, logActivity } from "@/lib/admin";

export async function handleUsers(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (admin.role !== "owner") {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.method === "GET") {
    const result = await db
      .prepare(`select id, email, role, is_active from admin_users order by email asc`)
      .all();
    return json(result.results || []);
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as any;
      let result;
      if (body.id) {
        result = await db
          .prepare(`update admin_users set role = ?, is_active = ?, updated_at = current_timestamp where id = ?`)
          .bind(body.role, body.is_active ? 1 : 0, body.id)
          .run();
        await logActivity(
          env,
          admin.email,
          "update_user",
          "admin_user",
          body.id,
          `${body.email} role=${body.role} active=${body.is_active}`
        );
      } else {
        result = await db
          .prepare(`insert into admin_users (email, role, is_active) values (?, ?, ?)`)
          .bind(body.email.toLowerCase().trim(), body.role, body.is_active ? 1 : 0)
          .run();
        await logActivity(
          env,
          admin.email,
          "create_user",
          "admin_user",
          Number(result.meta.last_row_id),
          body.email
        );
      }
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: `Method ${request.method} not allowed on /users` }, { status: 405 });
}

export async function handleActivity(request: Request, env: RuntimeEnv | undefined, admin: AdminContext) {
  const db = env?.DB;
  if (!db) return json({ error: "Database not configured" }, { status: 503 });

  if (admin.role !== "owner") {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.method === "GET") {
    const result = await db.prepare(`select * from activity_logs order by created_at desc limit 250`).all();
    return json(result.results || []);
  }

  return json({ error: `Method ${request.method} not allowed on /activity` }, { status: 405 });
}
