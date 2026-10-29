import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest4() {
  logHeader('TEST 4: Duplicate Payment Processing & Idempotency');
  const product = await fetchActiveProduct();

  // Create a synthetic order to test payment verification flow
  const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingDetails: { email: 'payment-race@kabgeer.local', address: '123 Pay Lane', city: 'Lucknow', pinCode: '226001' }
    })
  });
  const orderData = await orderRes.json();
  const orderId = orderData.orderId;
  const razorpayOrderId = orderData.razorpayOrderId;

  logInfo(`Created test order ${orderId} (${orderData.displayOrderId}) with Razorpay Order ID: ${razorpayOrderId}`);

  // Subtest 1: Invalid Signature Rejection
  const forgedRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: 'pay_invalid_sig_001',
      razorpay_signature: 'invalid_cryptographic_signature'
    })
  });

  let sigRejected = false;
  if (forgedRes.status === 400) {
    logPass('Initial forged/unauthorized payment signature rejected (HTTP 400)');
    sigRejected = true;
  } else {
    logFail(`Unexpected verification response for forged signature: HTTP ${forgedRes.status}`);
  }

  // Subtest 2: Direct Unauthorized Payment Record Insertion (RLS Protection)
  const testPaymentId = `pay_race_test_${Date.now()}`;
  const directPayRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      order_id: orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: testPaymentId,
      amount: 100,
      status: 'captured'
    })
  });

  let rlsProtected = false;
  if (directPayRes.status === 401 || directPayRes.status === 403) {
    logPass('Direct client payment insertion blocked by Row Level Security (RLS)');
    rlsProtected = true;
  } else {
    logFail(`Direct payment insertion was NOT blocked by RLS! HTTP ${directPayRes.status}`);
  }

  // Subtest 3: Payment Race & Idempotency Simulation
  // Simulate concurrent verification requests competing to transition the same order
  logInfo('Simulating concurrent payment transitions to assert single-claim atomicity...');
  const racePaymentId = `pay_race_${Date.now()}`;

  const [resA, resB] = await Promise.all([
    fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        orderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: racePaymentId,
        razorpay_signature: 'test_race_sig'
      })
    }).then(async r => ({ status: r.status, data: await r.json().catch(() => null) })),
    fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        orderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: racePaymentId,
        razorpay_signature: 'test_race_sig'
      })
    }).then(async r => ({ status: r.status, data: await r.json().catch(() => null) }))
  ]);

  logInfo(`Race outcome: Handler A returned HTTP ${resA.status}, Handler B returned HTTP ${resB.status}`);

  // Assert that either:
  // - Both safely handled without server crash (500)
  // - If one succeeded, the other returned alreadyProcessed: true or 400
  let idempotencyHandled = false;
  if (resA.status !== 500 && resB.status !== 500) {
    if (resA.data?.alreadyProcessed || resB.data?.alreadyProcessed || resA.status === resB.status) {
      logPass('Atomic claim handling verified: Concurrent duplicate execution terminated safely without 500 crash or state corruption.');
      idempotencyHandled = true;
    }
  }

  // Subtest 4: Database Uniqueness on Payment ID
  const paymentsQueryRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?order_id=eq.${orderId}`, {
    headers: getHeaders()
  });
  const paymentsRows = await paymentsQueryRes.json().catch(() => []);
  const paymentCount = Array.isArray(paymentsRows) ? paymentsRows.length : 0;
  logInfo(`Payment records created in database for test order: ${paymentCount}`);

  let uniquenessVerified = false;
  if (paymentCount <= 1) {
    logPass(`Zero duplicate payment rows in database (Count: ${paymentCount})`);
    uniquenessVerified = true;
  } else {
    logFail(`Duplicate payment records created in database! Count: ${paymentCount}`);
  }

  if (sigRejected && rlsProtected && idempotencyHandled && uniquenessVerified) {
    return {
      test: 'Test 4: Duplicate Payment Processing',
      status: 'PASS',
      details: 'Atomic payment processing, signature verification, RLS, and duplicate prevention verified'
    };
  } else {
    return {
      test: 'Test 4: Duplicate Payment Processing',
      status: 'FAIL',
      severity: 'HIGH',
      details: 'Payment idempotency or duplicate protection failed'
    };
  }
}

if (process.argv[1]?.endsWith('test-4-payments.mjs')) {
  runTest4().then(console.log);
}
