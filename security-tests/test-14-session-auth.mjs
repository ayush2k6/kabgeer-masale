import { SUPABASE_URL, getHeaders, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest14() {
  logHeader('TEST 14: Authentication & Session Security');

  // Test 1: Forged JWT Token with fake signature
  const forgedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkF0dGFja2VyIiwicm9sZSI6ImFkbWluIiwiZXhwIjoyNTM0MDIzMDA3OTl9.forged_signature_xyz';

  const forgedAuthRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${forgedJwt}`
    }
  });
  const forgedAuthData = await forgedAuthRes.json().catch(() => null);

  logInfo(`Forged JWT verification response: HTTP ${forgedAuthRes.status} (${forgedAuthData?.message || forgedAuthData?.error_description})`);

  let p1 = false;
  if (forgedAuthRes.status === 401 || forgedAuthRes.status === 403) {
    logPass('Forged JWT signature rejected by Supabase Auth (HTTP 401)');
    p1 = true;
  } else {
    logFail(`Forged JWT was accepted! HTTP ${forgedAuthRes.status}`);
  }

  // Test 2: Expired JWT Token
  const expiredJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkV4cGlyZWQiLCJleHAiOjE1MTYyMzkwMjJ9.signature';
  const expiredRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${expiredJwt}`
    }
  });

  let p2 = false;
  if (expiredRes.status === 401 || expiredRes.status === 403) {
    logPass('Expired JWT rejected by Supabase Auth (HTTP 401)');
    p2 = true;
  } else {
    logFail(`Expired JWT was accepted! HTTP ${expiredRes.status}`);
  }

  // Test 3: Garbage Authorization header
  const garbageRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      ...getHeaders(),
      'Authorization': 'Bearer garbage-malformed-string'
    }
  });

  let p3 = false;
  if (garbageRes.status === 401 || garbageRes.status === 403) {
    logPass('Malformed Bearer token rejected by Supabase Auth (HTTP 401)');
    p3 = true;
  } else {
    logFail(`Malformed Bearer token accepted! HTTP ${garbageRes.status}`);
  }

  if (p1 && p2 && p3) {
    return { test: 'Test 14: Authentication and Session Security', status: 'PASS', details: 'All forged, expired, and malformed JWTs strictly rejected' };
  } else {
    return { test: 'Test 14: Authentication and Session Security', status: 'FAIL', severity: 'CRITICAL', details: 'Session authentication flaws detected' };
  }
}

if (process.argv[1]?.endsWith('test-14-session-auth.mjs')) {
  runTest14().then(console.log);
}
