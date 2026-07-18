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
  const db = env?.DB;

  // 1. Try local session cookie first (for local dev or if Cloudflare Access is not configured)
  const token = getSessionToken(request);
  if (token && db) {
    try {
      const session = await db.prepare(
        `select u.email, u.role, u.is_active, s.expires_at
         from admin_sessions s
         join admin_users u on u.id = s.admin_user_id
         where s.id = ? limit 1`
      ).bind(token).first<{ email: string; role: AdminRole; is_active: number; expires_at: string }>();

      if (session && session.is_active === 1 && new Date(session.expires_at) > new Date()) {
        return { email: session.email, role: session.role };
      }
    } catch (e) {
      console.error("Session lookup error:", e);
    }
  }

  // 2. Try Cloudflare Access headers (for production setup)
  const email = getAccessEmail(request);
  if (!email) return null;

  const initialEmail = (
    env?.INITIAL_ADMIN_EMAIL ||
    (globalThis as any).process?.env?.INITIAL_ADMIN_EMAIL ||
    (import.meta.env?.INITIAL_ADMIN_EMAIL) ||
    ""
  ).toLowerCase().trim();

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

export function getSessionToken(request: Request): string {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;)\s*sam_session\s*=\s*([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function hashPassword(password: string): Promise<string> {
  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256"
    },
    passwordKey,
    256 // 32 bytes (256 bits)
  );
  
  const hashHex = Array.from(new Uint8Array(derivedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$${iterations}$${saltHex}$${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  
  const iterations = parseInt(parts[1], 10);
  const saltHex = parts[2];
  const hashHex = parts[3];
  
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256"
    },
    passwordKey,
    256
  );
  
  const verifyHashHex = Array.from(new Uint8Array(derivedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
  return verifyHashHex === hashHex;
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
