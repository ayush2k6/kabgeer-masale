import fs from 'fs';
import path from 'path';

// Read environment configuration safely without logging secret values
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env = {};
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (!env[key]) env[key] = val;
          }
        }
      }
    }
  }
  return env;
}

const env = loadEnv();

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://cfvopnzcqbtqcupdomto.supabase.co';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export function getHeaders(token = null) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (SUPABASE_ANON_KEY) {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

export async function fetchActiveProduct() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,sku,price,is_active&is_active=eq.true&limit=1`, {
      headers: getHeaders()
    });
    const products = await res.json();
    if (Array.isArray(products) && products.length > 0) {
      return products[0];
    }
  } catch (err) {
    // fallback if fetch fails
  }
  return { id: 'chole', name: 'Chole Masale', price: 69 };
}

export const Colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

export function logHeader(title) {
  console.log(`\n${Colors.bold}${Colors.cyan}=== [${title}] ===${Colors.reset}`);
}

export function logPass(msg) {
  console.log(`  ${Colors.green}✔ PASS:${Colors.reset} ${msg}`);
}

export function logFail(msg) {
  console.log(`  ${Colors.red}✖ FAIL:${Colors.reset} ${msg}`);
}

export function logWarn(msg) {
  console.log(`  ${Colors.yellow}⚠ WARN / VULNERABILITY:${Colors.reset} ${msg}`);
}

export function logInfo(msg) {
  console.log(`  ${Colors.gray}ℹ INFO:${Colors.reset} ${msg}`);
}
