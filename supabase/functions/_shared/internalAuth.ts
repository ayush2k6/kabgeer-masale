import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const ADMIN_WHITELIST = [
  'admin@kabgeermasala.com',
  'tanmayyadavbca@gmail.com',
  'admin@kabgeerji.com',
  'ayush@kabgeerji.com'
];

/**
 * Timing-safe string comparison to prevent side-channel timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Safely extracts and decodes a JWT payload without throwing.
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export interface CallerAuthResult {
  authorized: boolean;
  role: 'service_role' | 'admin' | 'anonymous' | 'unauthorized';
  callerId?: string;
  errorMessage?: string;
  statusCode: number;
}

/**
 * Verifies that an incoming request to an internal downstream Edge Function
 * originates from a trusted internal server-side caller (service_role / internal secret)
 * or an authenticated administrator.
 *
 * Rejects public anonymous requests and unprivileged customer tokens.
 */
export async function verifyInternalOrAdminCaller(
  req: Request,
  supabase: SupabaseClient
): Promise<CallerAuthResult> {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const internalSecret = Deno.env.get('INTERNAL_SERVICE_SECRET') || '';

  // 1. Check for dedicated internal service secret header (Supports key rotation)
  const headerSecret = req.headers.get('X-Internal-Secret');
  if (internalSecret && headerSecret && timingSafeEqual(headerSecret, internalSecret)) {
    return { authorized: true, role: 'service_role', statusCode: 200 };
  }

  // 2. Extract bearer token or apikey header
  const authHeader = req.headers.get('Authorization') || '';
  const apiKeyHeader = req.headers.get('apikey') || '';

  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  } else if (apiKeyHeader) {
    token = apiKeyHeader.trim();
  }

  if (!token) {
    return {
      authorized: false,
      role: 'anonymous',
      errorMessage: 'Missing Authorization or internal service credentials.',
      statusCode: 401
    };
  }

  // 3. Direct timing-safe check against server-side service role key
  if (serviceRoleKey && timingSafeEqual(token, serviceRoleKey)) {
    return { authorized: true, role: 'service_role', statusCode: 200 };
  }

  // 4. Inspect JWT token payload for service_role claim
  const payload = decodeJwtPayload(token);
  if (payload && payload.role === 'service_role') {
    // If token matches or was issued for this project ref
    if (serviceRoleKey && timingSafeEqual(token, serviceRoleKey)) {
      return { authorized: true, role: 'service_role', statusCode: 200 };
    }
  }

  // 5. If not a service_role key, check if it is a valid authenticated admin session
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (!authErr && user) {
      const email = (user.email || '').toLowerCase().trim();

      // Check profiles role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isAdmin = profile?.role === 'admin' || ADMIN_WHITELIST.includes(email);
      if (isAdmin) {
        return { authorized: true, role: 'admin', callerId: user.id, statusCode: 200 };
      }

      return {
        authorized: false,
        role: 'unauthorized',
        errorMessage: 'Forbidden: Caller lacks internal or administrative execution permissions.',
        statusCode: 403
      };
    }
  } catch (err: any) {
    console.error('Caller authentication verification error:', err?.message);
  }

  return {
    authorized: false,
    role: 'unauthorized',
    errorMessage: 'Unauthorized: Invalid or expired execution credentials.',
    statusCode: 401
  };
}
