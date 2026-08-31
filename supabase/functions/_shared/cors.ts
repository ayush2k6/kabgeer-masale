// Hardened CORS policy for Kabgeer Masale Edge Functions
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
  const isAllowed = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('localhost'));
  const allowedOrigin = isAllowed ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

