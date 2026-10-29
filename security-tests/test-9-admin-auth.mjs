import { SUPABASE_URL, getHeaders, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest9() {
  logHeader('TEST 9: Unauthorized Admin Operations & Privilege Escalation');

  // Test 1: RPC get_all_orders_admin with anonymous client
  const rpcOrdersRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_all_orders_admin`, {
    method: 'POST',
    headers: getHeaders(),
    body: '{}'
  });
  const rpcOrdersData = await rpcOrdersRes.json().catch(() => null);

  if (rpcOrdersRes.status === 401 || rpcOrdersRes.status === 403) {
    logPass(`PostgreSQL RPC 'get_all_orders_admin' execution blocked for anon client (HTTP ${rpcOrdersRes.status}: ${rpcOrdersData?.message || rpcOrdersData?.error})`);
  } else {
    logFail(`PostgreSQL RPC 'get_all_orders_admin' was NOT blocked! HTTP ${rpcOrdersRes.status}`);
  }

  // Test 2: RPC admin_update_order_status with anonymous client
  const rpcUpdateRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_order_status`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      target_order_id: '00000000-0000-0000-0000-000000000000',
      new_status: 'Cancelled'
    })
  });
  const rpcUpdateData = await rpcUpdateRes.json().catch(() => null);

  if (rpcUpdateRes.status === 401 || rpcUpdateRes.status === 403) {
    logPass(`PostgreSQL RPC 'admin_update_order_status' execution blocked for anon client (HTTP ${rpcUpdateRes.status}: ${rpcUpdateData?.message || rpcUpdateData?.error})`);
  } else {
    logFail(`PostgreSQL RPC 'admin_update_order_status' was NOT blocked! HTTP ${rpcUpdateRes.status}`);
  }

  // Test 3: Edge Function admin-manage-orders with NO authentication header
  const edgeNoAuthRes = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage-orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action: 'list' })
  });
  const edgeNoAuthData = await edgeNoAuthRes.json().catch(() => null);

  logInfo(`admin-manage-orders (no auth) response: HTTP ${edgeNoAuthRes.status}, Orders count: ${edgeNoAuthData?.orders?.length}`);

  // Test 4: Edge Function admin-manage-orders with body spoofed email
  const edgeSpoofRes = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage-orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      action: 'list',
      adminEmail: 'admin@kabgeermasala.com'
    })
  });
  const edgeSpoofData = await edgeSpoofRes.json().catch(() => null);

  logInfo(`admin-manage-orders (spoofed body email) response: HTTP ${edgeSpoofRes.status}, Orders count: ${edgeSpoofData?.orders?.length}`);

  let isVulnerable = false;

  if (edgeNoAuthRes.status === 200 && Array.isArray(edgeNoAuthData?.orders)) {
    logWarn(`VULNERABILITY: admin-manage-orders allows unauthenticated callers with NO Bearer token to list all orders!`);
    isVulnerable = true;
  }

  if (edgeSpoofRes.status === 200 && Array.isArray(edgeSpoofData?.orders)) {
    logWarn(`VULNERABILITY: admin-manage-orders trusts unauthenticated 'adminEmail' from client request body!`);
    isVulnerable = true;
  }

  if (isVulnerable) {
    return {
      test: 'Test 9: Unauthorized Admin Operations',
      status: 'FAIL',
      severity: 'CRITICAL',
      details: 'admin-manage-orders Edge Function lacks server-side JWT verification, permitting unauthenticated access to admin order listings and state modifications'
    };
  }

  logPass('Admin operations authorization enforced.');
  return { test: 'Test 9: Unauthorized Admin Operations', status: 'PASS', details: 'All admin functions enforce authorization' };
}

if (process.argv[1]?.endsWith('test-9-admin-auth.mjs')) {
  runTest9().then(console.log);
}
