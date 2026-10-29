import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest2() {
  logHeader('TEST 2: Concurrent Inventory Checkout & Race Conditions');

  // Fetch current stock of an active product
  const invRes = await fetch(`${SUPABASE_URL}/rest/v1/inventory?select=product_id,stock_quantity&limit=1`, {
    headers: getHeaders()
  });
  const invData = await invRes.json();
  const targetItem = invData[0];

  if (!targetItem) {
    logWarn('No inventory items found in public.inventory');
    return { test: 'Test 2: Concurrent Inventory Checkout', status: 'BLOCKED', details: 'No inventory items available' };
  }

  const initialStock = targetItem.stock_quantity;
  logInfo(`Target Product ID: ${targetItem.product_id}, Baseline Stock: ${initialStock}`);

  // Test 1: Excess Stock Ceiling Enforcement
  const excessQty = initialStock + 50;
  const excessOrderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: targetItem.product_id, quantity: excessQty }],
      shippingDetails: { email: 'stock-excess@kabgeer.local', address: '123 Stock St', city: 'Lucknow', pinCode: '226001' }
    })
  });
  const excessData = await excessOrderRes.json().catch(() => null);

  let excessPassed = false;
  if (excessOrderRes.status === 400 && String(excessData?.error).toLowerCase().includes('stock')) {
    logPass(`Stock ceiling enforced: Order with excess quantity ${excessQty} rejected with: "${excessData.error}"`);
    excessPassed = true;
  } else {
    logFail(`Stock ceiling failed: Server responded with status ${excessOrderRes.status}`);
  }

  // Test 2: Direct Unauthorized Inventory Mutation Prevention (RLS)
  // Verify anonymous attackers cannot tamper with stock_quantity directly via PostgREST
  const directTamperRes = await fetch(`${SUPABASE_URL}/rest/v1/inventory?product_id=eq.${targetItem.product_id}`, {
    method: 'PATCH',
    headers: {
      ...getHeaders(),
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ stock_quantity: 99999 })
  });
  const tamperData = await directTamperRes.json().catch(() => null);

  let rlsPassed = false;
  if (Array.isArray(tamperData) && tamperData.length === 0) {
    logPass('Direct inventory tampering strictly blocked by database RLS (0 rows updated)');
    rlsPassed = true;
  } else if (directTamperRes.status === 401 || directTamperRes.status === 403) {
    logPass(`Direct inventory tampering rejected by RLS (HTTP ${directTamperRes.status})`);
    rlsPassed = true;
  } else {
    logFail('CRITICAL: Anonymous client modified stock_quantity directly!');
  }

  // Test 3: Simulated Concurrent Reservation Under Competition
  logInfo('Simulating concurrent checkout competition on active inventory...');
  const burstSize = 3;
  const burstPromises = Array.from({ length: burstSize }).map((_, i) =>
    fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        items: [{ productId: targetItem.product_id, quantity: 1 }],
        shippingDetails: { email: `concurrent-stock-${i}@kabgeer.local`, address: '123 Race Way', city: 'Lucknow', pinCode: '226001' },
        idempotencyKey: `stock_comp_${Date.now()}_${i}`
      })
    }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }))
  );

  const burstResults = await Promise.all(burstPromises);
  const successCount = burstResults.filter(r => r.status === 200).length;
  logInfo(`Concurrent reservation burst: ${successCount}/${burstSize} orders initialized.`);

  // Test 4: Final Non-Negative Database Quantity Assertion
  const finalInvRes = await fetch(`${SUPABASE_URL}/rest/v1/inventory?product_id=eq.${targetItem.product_id}&select=stock_quantity`, {
    headers: getHeaders()
  });
  const finalInvData = await finalInvRes.json();
  const finalStock = finalInvData[0]?.stock_quantity;

  logInfo(`Final verified inventory quantity: ${finalStock}`);
  const stockValid = finalStock !== undefined && finalStock >= 0;

  if (stockValid) {
    logPass(`Inventory constraint verified: stock_quantity (${finalStock}) is strictly non-negative.`);
  } else {
    logFail(`Inventory integrity violated: invalid or negative stock quantity (${finalStock})`);
  }

  if (excessPassed && rlsPassed && stockValid) {
    return {
      test: 'Test 2: Concurrent Inventory Checkout',
      status: 'PASS',
      details: 'Stock ceiling enforced, RLS protected, and non-negative constraints verified'
    };
  } else {
    return {
      test: 'Test 2: Concurrent Inventory Checkout',
      status: 'FAIL',
      severity: 'HIGH',
      details: 'Inventory integrity or concurrency protection failed'
    };
  }
}

if (process.argv[1]?.endsWith('test-2-inventory.mjs')) {
  runTest2().then(console.log);
}
