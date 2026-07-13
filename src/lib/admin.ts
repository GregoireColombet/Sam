export type AdminRole = "owner" | "editor";

export type AdminContext = {
  email: string;
  role: AdminRole;
};

export function getAccessEmail(request: Request) {
  return (
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("x-authenticated-user-email") ||
    request.headers.get("x-sam-dev-email") ||
    ""
  ).toLowerCase();
}

export async function getAdminContext(env: RuntimeEnv | undefined, request: Request): Promise<AdminContext | null> {
  const email = getAccessEmail(request);
  if (!email) return null;

  const initialEmail = (env?.INITIAL_ADMIN_EMAIL || "").toLowerCase();
  const db = env?.DB;

  if (!db) {
    return initialEmail && email === initialEmail ? { email, role: "owner" } : null;
  }

  const existing = await db.prepare(
    `select email, role, is_active from admin_users where lower(email) = lower(?) limit 1`
  ).bind(email).first<{ email: string; role: AdminRole; is_active: number }>();

  if (existing?.is_active === 1) {
    return { email: existing.email, role: existing.role };
  }

  if (initialEmail && email === initialEmail) {
    await db.prepare(
      `insert or ignore into admin_users (email, role, is_active) values (?, 'owner', 1)`
    ).bind(email).run();
    await logActivity(env, email, "bootstrap_owner", "admin_user", null, `Initial owner ${email} created`);
    return { email, role: "owner" };
  }

  return null;
}

export async function logActivity(
  env: RuntimeEnv | undefined,
  adminEmail: string,
  action: string,
  entityType?: string | null,
  entityId?: number | null,
  details?: string | null
) {
  const db = env?.DB;
  if (!db) return;
  await db.prepare(
    `insert into activity_logs (admin_email, action, entity_type, entity_id, details)
     values (?, ?, ?, ?, ?)`
  ).bind(adminEmail, action, entityType || null, entityId || null, details || null).run();
}

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers || {})
    }
  });
}
