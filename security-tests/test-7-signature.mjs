import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest7() {
  logHeader('TEST 7: Payment Signature Forgery & Cryptographic Validation');
  const product = await fetchActiveProduct();

  // Create test order
  const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingDetails: { email: 'sig-test@kabgeer.local', address: '123 Crypto Lane', city: 'Lucknow', pinCode: '226001' }
    })
  });
  const orderData = await orderRes.json();
  const orderId = orderData.orderId;
  const razorpayOrderId = orderData.razorpayOrderId;

  logInfo(`Generated test order: ${orderId} with Razorpay Order ID: ${razorpayOrderId}`);

  // Test Case 1: Empty Signature
  const r1 = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: 'pay_test_001',
      razorpay_signature: ''
    })
  });
  const d1 = await r1.json().catch(() => null);

  // Test Case 2: Fabricated Fake Signature
  const r2 = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: 'pay_test_002',
      razorpay_signature: 'deadbeefcafe1234567890abcdefdeadbeefcafe1234567890abcdefdeadbeef'
    })
  });
  const d2 = await r2.json().catch(() => null);

  // Test Case 3: Mismatched Razorpay Order ID
  const r3 = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      orderId,
      razorpay_order_id: 'order_completely_different_999',
      razorpay_payment_id: 'pay_test_003',
      razorpay_signature: 'deadbeefcafe1234567890abcdefdeadbeefcafe1234567890abcdefdeadbeef'
    })
  });
  const d3 = await r3.json().catch(() => null);

  logInfo(`Empty signature test response: HTTP ${r1.status}`);
  logInfo(`Fabricated signature test response: HTTP ${r2.status} (${d2?.error})`);
  logInfo(`Mismatched order ID test response: HTTP ${r3.status} (${d3?.error})`);

  let allPassed = true;

  if (r1.status === 400) {
    logPass('Empty signature successfully rejected (HTTP 400)');
  } else {
    logFail(`Empty signature accepted or unexpected status: HTTP ${r1.status}`);
    allPassed = false;
  }

  if (r2.status === 400 && String(d2?.error).toLowerCase().includes('signature')) {
    logPass('Fabricated cryptographic signature rejected with authorization error (HTTP 400)');
  } else {
    logFail(`Fabricated signature was NOT rejected! HTTP ${r2.status}: ${JSON.stringify(d2)}`);
    allPassed = false;
  }

  if (r3.status === 400 && String(d3?.error).toLowerCase().includes('mismatched')) {
    logPass('Mismatched Razorpay order ID successfully blocked');
  } else {
    logFail(`Mismatched Razorpay order ID check failed: HTTP ${r3.status}`);
    allPassed = false;
  }

  if (allPassed) {
    return { test: 'Test 7: Payment Signature Forgery', status: 'PASS', details: 'HMAC-SHA256 signature and order alignment verified' };
  } else {
    return { test: 'Test 7: Payment Signature Forgery', status: 'FAIL', severity: 'CRITICAL', details: 'Payment verification failed security constraints' };
  }
}

if (process.argv[1]?.endsWith('test-7-signature.mjs')) {
  runTest7().then(console.log);
}
