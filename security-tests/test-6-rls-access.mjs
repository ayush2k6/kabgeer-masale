import { SUPABASE_URL, getHeaders, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest6() {
  logHeader('TEST 6: Database Access Control & Row Level Security (RLS)');

  const operations = [
    {
      table: 'orders',
      op: 'INSERT',
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/orders`,
      body: { display_order_id: 'HACK-RLS-01', customer_name: 'Attacker', customer_email: 'attacker@evil.local', customer_phone: '9999999999', shipping_address: {}, billing_address: {}, total_amount: 1, customer_type: 'guest' }
    },
    {
      table: 'payments',
      op: 'INSERT',
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/payments`,
      body: { amount: 1, razorpay_order_id: 'rzp_hack', status: 'captured' }
    },
    {
      table: 'inventory',
      op: 'UPDATE',
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/inventory?stock_quantity=gt.90`,
      body: { stock_quantity: 0 }
    },
    {
      table: 'products',
      op: 'UPDATE',
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/products?is_active=eq.true`,
      body: { price: 1 }
    },
    {
      table: 'profiles',
      op: 'SELECT',
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/profiles?select=*`
    },
    {
      table: 'orders',
      op: 'SELECT',
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/orders?select=id,customer_name,customer_email,customer_phone,shipping_address`
    }
  ];

  let anyInsertVulnerability = false;
  let orderDataLeak = false;

  for (const op of operations) {
    const res = await fetch(op.url, {
      method: op.method,
      headers: { ...getHeaders(), 'Prefer': 'return=representation' },
      body: op.body ? JSON.stringify(op.body) : undefined
    });
    const data = await res.json().catch(() => null);

    if (op.op === 'INSERT' || op.op === 'UPDATE') {
      if (res.status === 401 || res.status === 403 || (res.status === 200 && Array.isArray(data) && data.length === 0)) {
        logPass(`${op.op} on public.${op.table} successfully BLOCKED by RLS (HTTP ${res.status})`);
      } else {
        logFail(`${op.op} on public.${op.table} WAS NOT BLOCKED! HTTP ${res.status}: ${JSON.stringify(data)}`);
        anyInsertVulnerability = true;
      }
    } else if (op.op === 'SELECT') {
      if (op.table === 'profiles') {
        if (Array.isArray(data) && data.length === 0) {
          logPass(`SELECT on public.profiles returned 0 rows for anonymous client (Protected)`);
        } else {
          logWarn(`SELECT on public.profiles returned ${data?.length} rows to anonymous client!`);
        }
      } else if (op.table === 'orders') {
        if (Array.isArray(data) && data.length > 0) {
          logWarn(`VULNERABILITY: SELECT on public.orders returned ${data.length} guest order records with full PII (customer_name, customer_email, shipping_address) to unauthenticated anonymous client!`);
          orderDataLeak = true;
        } else {
          logPass('SELECT on public.orders returned 0 rows for anonymous client (Protected)');
        }
      }
    }
  }

  if (orderDataLeak) {
    return {
      test: 'Test 6: Database Access Control and RLS',
      status: 'FAIL',
      severity: 'HIGH',
      details: 'Guest orders (customer_id IS NULL) are readable by anonymous public API clients via PostgREST'
    };
  }

  if (anyInsertVulnerability) {
    return {
      test: 'Test 6: Database Access Control and RLS',
      status: 'FAIL',
      severity: 'CRITICAL',
      details: 'Unauthorized mutations allowed on financial tables'
    };
  }

  return { test: 'Test 6: Database Access Control and RLS', status: 'PASS', details: 'All RLS policies active and enforcing isolation' };
}

if (process.argv[1]?.endsWith('test-6-rls-access.mjs')) {
  runTest6().then(console.log);
}
