// Hardened CORS policy for Kabgeer Masale Edge Functions
// Allowed development and verified production origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://kabgeerji.com',
  'https://www.kabgeerji.com',
  'https://kabgeermasale.vercel.app',
  'https://kabgeer-masale.vercel.app',
  'https://kabgeer-masale-v1.vercel.app',
  'https://kabgeer-masalee.vercel.app'
];

export const getCorsHeaders = (origin?: string | null) => {
  const isVercelApp = origin && origin.endsWith('.vercel.app');
  const allowedOrigin = (origin && (ALLOWED_ORIGINS.includes(origin) || isVercelApp))
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
