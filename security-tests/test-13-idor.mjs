import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest13() {
  logHeader('TEST 13: Broken Object-Level Authorization (IDOR)');
  const product = await fetchActiveProduct();

  // Step 1: Create two separate orders for distinct test customers
  logInfo('Creating Order A for Customer A (customer-a-idor@kabgeer.local)...');
  const orderResA = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingDetails: {
        firstName: 'Alice',
        lastName: 'CustomerA',
        email: 'customer-a-idor@kabgeer.local',
        address: '100 Alice Street',
        city: 'Lucknow',
        pinCode: '226001'
      }
    })
  });
  const orderDataA = await orderResA.json();
  const orderIdA = orderDataA.orderId;

  logInfo('Creating Order B for Customer B (customer-b-idor@kabgeer.local)...');
  const orderResB = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingDetails: {
        firstName: 'Bob',
        lastName: 'CustomerB',
        email: 'customer-b-idor@kabgeer.local',
        address: '200 Bob Avenue',
        city: 'Lucknow',
        pinCode: '226001'
      }
    })
  });
  const orderDataB = await orderResB.json();
  const orderIdB = orderDataB.orderId;

  logInfo(`Created Order A (${orderIdA}) and Order B (${orderIdB})`);

  let idorVulnerability = false;

  // Test 1: Cross-order unauthorized SELECT on Order B
  logInfo(`Attempting to read Order B (${orderIdB}) without Order B credentials...`);
  const readResB = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderIdB}`, {
    headers: getHeaders()
  });
  const readDataB = await readResB.json().catch(() => null);

  if (Array.isArray(readDataB) && readDataB.length > 0) {
    const leaked = readDataB[0];
    logFail(`CRITICAL IDOR DATA LEAK: Successfully retrieved Order B (${orderIdB}) for customer "${leaked.customer_name}" without authorization!`);
    idorVulnerability = true;
  } else {
    logPass(`Cross-customer order read on Order B blocked by RLS: 0 rows returned.`);
  }

  // Test 2: Cross-order unauthorized UPDATE / mutation on Order B
  logInfo(`Attempting unauthorized status cancellation on Order B (${orderIdB})...`);
  const patchResB = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderIdB}`, {
    method: 'PATCH',
    headers: {
      ...getHeaders(),
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ order_status: 'Cancelled' })
  });
  const patchDataB = await patchResB.json().catch(() => null);

  if (patchResB.status === 200 && Array.isArray(patchDataB) && patchDataB.length > 0) {
    logFail(`CRITICAL IDOR MUTATION: Unauthorized caller cancelled Order B!`);
    idorVulnerability = true;
  } else {
    logPass(`Unauthorized mutation on Order B strictly blocked by RLS (0 rows affected).`);
  }

  // Test 3: Profile IDOR Isolation
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.00000000-0000-0000-0000-000000000001`, {
    headers: getHeaders()
  });
  const profileData = await profileRes.json().catch(() => null);

  if (Array.isArray(profileData) && profileData.length === 0) {
    logPass('Cross-profile IDOR lookup blocked by RLS (0 rows returned).');
  } else {
    logFail('Profile lookup exposed private customer record.');
    idorVulnerability = true;
  }

  if (!idorVulnerability) {
    return {
      test: 'Test 13: Broken Object-Level Authorization (IDOR)',
      status: 'PASS',
      details: 'Dual test orders verified: cross-customer reads, updates, and profile access strictly blocked by RLS'
    };
  } else {
    return {
      test: 'Test 13: Broken Object-Level Authorization (IDOR)',
      status: 'FAIL',
      severity: 'CRITICAL',
      details: 'IDOR vulnerability detected: unauthorized cross-customer order or profile access'
    };
  }
}

if (process.argv[1]?.endsWith('test-13-idor.mjs')) {
  runTest13().then(console.log);
}
