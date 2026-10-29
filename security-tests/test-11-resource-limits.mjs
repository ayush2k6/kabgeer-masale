import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest11() {
  logHeader('TEST 11: Oversized Request & Resource Limits');
  const product = await fetchActiveProduct();

  // Test 1: Address string exceeding 500 characters
  const longAddress = 'A'.repeat(505);
  const r1 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingDetails: {
        email: 'oversize@kabgeer.local',
        address: longAddress,
        city: 'Lucknow',
        pinCode: '226001'
      }
    })
  });
  const d1 = await r1.json().catch(() => null);

  logInfo(`Oversized address (>500 chars) response: HTTP ${r1.status} (${d1?.error})`);

  let p1 = false;
  if (r1.status === 400 && String(d1?.error).toLowerCase().includes('maximum allowed length')) {
    logPass('Address length boundary enforcement passed (HTTP 400)');
    p1 = true;
  } else {
    logFail(`Address length boundary failed: HTTP ${r1.status}`);
  }

  // Test 2: City string exceeding 100 characters
  const longCity = 'C'.repeat(105);
  const r2 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingDetails: {
        email: 'oversize@kabgeer.local',
        address: 'Valid Address',
        city: longCity,
        pinCode: '226001'
      }
    })
  });
  const d2 = await r2.json().catch(() => null);

  logInfo(`Oversized city (>100 chars) response: HTTP ${r2.status} (${d2?.error})`);

  let p2 = false;
  if (r2.status === 400 && String(d2?.error).toLowerCase().includes('maximum allowed length')) {
    logPass('City length boundary enforcement passed (HTTP 400)');
    p2 = true;
  } else {
    logFail(`City length boundary failed: HTTP ${r2.status}`);
  }

  if (p1 && p2) {
    return { test: 'Test 11: Oversized Request and Resource Limits', status: 'PASS', details: 'Payload size limits and field bounds strictly enforced' };
  } else {
    return { test: 'Test 11: Oversized Request and Resource Limits', status: 'FAIL', severity: 'MEDIUM', details: 'Resource bounds not fully enforced' };
  }
}

if (process.argv[1]?.endsWith('test-11-resource-limits.mjs')) {
  runTest11().then(console.log);
}
