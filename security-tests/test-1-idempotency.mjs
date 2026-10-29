import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest1() {
  logHeader('TEST 1: Duplicate Order Creation & Idempotency');
  const product = await fetchActiveProduct();

  const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const syntheticPayload = {
    items: [{ productId: product.id, quantity: 1 }],
    shippingDetails: {
      firstName: 'AuditConcurrent',
      lastName: 'Tester',
      email: 'audit-concurrency@kabgeer-audit.local',
      phone: '9876543210',
      address: 'Plot 42 Concurrency Lane',
      city: 'Lucknow',
      pinCode: '226001'
    },
    pricingConfig: {
      shippingFee: 50,
      discountAmount: 0
    }
  };

  logInfo(`Firing 5 concurrent order creation requests with identical idempotency key: ${idempotencyKey}`);

  const startTime = Date.now();
  const promises = Array.from({ length: 5 }).map(() =>
    fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Idempotency-Key': idempotencyKey,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        ...syntheticPayload,
        idempotencyKey
      })
    })
      .then(async (res) => ({
        status: res.status,
        data: await res.json().catch(() => null)
      }))
      .catch((err) => ({
        status: 0,
        error: err.message,
        data: null
      }))
  );

  const results = await Promise.all(promises);
  const elapsed = Date.now() - startTime;

  const successfulOrders = results.filter((r) => r.status === 200 && r.data?.orderId);
  const uniqueOrderIds = new Set(successfulOrders.map((r) => r.data.orderId));
  const uniqueDisplayIds = new Set(successfulOrders.map((r) => r.data.displayOrderId));

  logInfo(`5 Concurrent Requests Completed in ${elapsed}ms. HTTP 200 Count: ${successfulOrders.length}`);
  logInfo(`Unique Database Order UUIDs created: ${uniqueOrderIds.size}`);
  logInfo(`Unique Display Order IDs generated: ${uniqueDisplayIds.size}`);

  if (uniqueOrderIds.size === 1) {
    logPass('Idempotency enforced: Multiple concurrent requests returned the same order without duplication.');
    return { test: 'Test 1: Duplicate Order Creation and Idempotency', status: 'PASS', details: 'Requests deduplicated to 1 order' };
  } else if (uniqueOrderIds.size > 1) {
    logWarn(`Race condition / Idempotency absence: ${uniqueOrderIds.size} separate orders were created for identical concurrent submissions.`);
    return {
      test: 'Test 1: Duplicate Order Creation and Idempotency',
      status: 'FAIL',
      severity: 'MEDIUM',
      details: `${uniqueOrderIds.size} duplicate orders created without idempotency deduplication`
    };
  } else {
    logFail('All order creation requests failed unexpectedly.');
    return { test: 'Test 1: Duplicate Order Creation and Idempotency', status: 'FAIL', severity: 'HIGH', details: 'Endpoint failed to process requests' };
  }
}

if (process.argv[1]?.endsWith('test-1-idempotency.mjs')) {
  runTest1().then(console.log);
}
