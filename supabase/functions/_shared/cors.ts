// Strict, Hardened CORS Policy for Kabgeer Masale Edge Functions
// Only exact, verified production origins and explicit local development ports are permitted.
// Wildcards and open preview regex patterns are strictly prohibited.

const EXACT_VERIFIED_ORIGINS = [
  // Production Storefront Domains
  'https://kabgeermasala.com',
  'https://www.kabgeermasala.com',
  'https://kabgeerji.com',
  'https://www.kabgeerji.com',
  // Verified Production Vercel Deployments
  'https://kabgeermasale.vercel.app',
  'https://kabgeer-masale.vercel.app',
  'https://kabgeer-masale-v1.vercel.app',
  'https://kabgeer-masalee.vercel.app',
  // Local Development Environments (Explicit Ports Only)
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

/**
 * Validates whether an incoming Origin exactly matches the authorized allowlist.
 * Never performs unrestricted wildcard or partial domain regex matching.
 */
function isOriginPermitted(origin: string, additionalOrigins: string[] = []): boolean {
  if (!origin || typeof origin !== 'string') return false;
  const trimmed = origin.trim().toLowerCase();

  // 1. Exact match against verified allowlist
  if (EXACT_VERIFIED_ORIGINS.some(o => o.toLowerCase() === trimmed)) {
    return true;
  }

  // 2. Exact match against server-side configured ALLOWED_ORIGINS environment variable
  if (additionalOrigins.some(o => o.toLowerCase() === trimmed)) {
    return true;
  }

  return false;
}

/**
 * Returns strict dynamic CORS headers.
 * If the incoming origin is in the exact allowlist, it is echoed back with 'Vary: Origin'.
 * If the origin is unverified, arbitrary, or missing, it defaults securely to the primary production domain.
 * Never reflects arbitrary origins or emits wildcard '*'.
 */
export function getCorsHeaders(reqOrOrigin?: Request | string | null): Record<string, string> {
  let origin: string | null = null;
  if (typeof reqOrOrigin === 'string') {
    origin = reqOrOrigin;
  } else if (reqOrOrigin && typeof reqOrOrigin === 'object' && 'headers' in reqOrOrigin) {
    origin = reqOrOrigin.headers.get('Origin') || reqOrOrigin.headers.get('origin');
  }

  // Parse optional runtime-configurable origins from Supabase environment secret
  let envOrigins: string[] = [];
  try {
    const rawEnv = (globalThis as any).Deno?.env?.get('ALLOWED_ORIGINS') || '';
    if (rawEnv) {
      envOrigins = rawEnv.split(',').map((o: string) => o.trim()).filter(Boolean);
    }
  } catch {
    // Non-Deno or restricted environment fallback
  }

  const isPermitted = origin ? isOriginPermitted(origin, envOrigins) : false;
  // If untrusted, do NOT reflect caller origin; fallback strictly to primary domain
  const activeOrigin = isPermitted && origin ? origin : 'https://kabgeermasala.com';

  return {
    'Access-Control-Allow-Origin': activeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Vary': 'Origin'
  };
}

/**
 * Default fallback CORS headers (strictly non-wildcard).
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://kabgeermasala.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Vary': 'Origin'
};
