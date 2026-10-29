import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest10() {
  logHeader('TEST 10: Type Confusion & Numeric Edge Cases');
  const product = await fetchActiveProduct();

  const edgeCases = [
    {
      description: 'Negative Quantity (-5)',
      payload: {
        items: [{ productId: product.id, quantity: -5 }],
        shippingDetails: { email: 'type@test.local', address: 'Street', city: 'City', pinCode: '226001' }
      },
      check: (status, data) => status === 200 && data.summary?.itemsCount === 1 // Clamped safely to 1
    },
    {
      description: 'Zero Quantity (0)',
      payload: {
        items: [{ productId: product.id, quantity: 0 }],
        shippingDetails: { email: 'type@test.local', address: 'Street', city: 'City', pinCode: '226001' }
      },
      check: (status, data) => status === 200 && data.summary?.itemsCount === 1
    },
    {
      description: 'Excessively Large Quantity (9999999)',
      payload: {
        items: [{ productId: product.id, quantity: 9999999 }],
        shippingDetails: { email: 'type@test.local', address: 'Street', city: 'City', pinCode: '226001' }
      },
      // Clamped to 99, which then checks stock (or returns insufficient stock 400)
      check: (status, data) => status === 400 || (status === 200 && data.summary?.itemsCount <= 99)
    },
    {
      description: 'Invalid Email Format (not-an-email)',
      payload: {
        items: [{ productId: product.id, quantity: 1 }],
        shippingDetails: { email: 'invalid-email-format', address: 'Street', city: 'City', pinCode: '226001' }
      },
      check: (status, data) => status === 400 && String(data.error).toLowerCase().includes('email')
    },
    {
      description: 'Invalid 5-digit PIN code (12345)',
      payload: {
        items: [{ productId: product.id, quantity: 1 }],
        shippingDetails: { email: 'valid@test.local', address: 'Street', city: 'City', pinCode: '12345' }
      },
      check: (status, data) => status === 400 && String(data.error).toLowerCase().includes('pin')
    },
    {
      description: 'Non-Existent Product UUID',
      payload: {
        items: [{ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
        shippingDetails: { email: 'valid@test.local', address: 'Street', city: 'City', pinCode: '226001' }
      },
      check: (status, data) => status === 400 && (String(data.error).toLowerCase().includes('not found') || String(data.error).toLowerCase().includes('failed to fetch products'))
    }
  ];

  let passedCount = 0;

  for (const ec of edgeCases) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ec.payload)
    });
    const data = await res.json().catch(() => null);
    const passed = ec.check(res.status, data || {});

    if (passed) {
      logPass(`${ec.description}: Handled safely (HTTP ${res.status}: ${data?.error || `Clamped Qty: ${data?.summary?.itemsCount}`})`);
      passedCount++;
    } else {
      logFail(`${ec.description}: Failed edge case handling! HTTP ${res.status}: ${JSON.stringify(data)}`);
    }
  }

  logInfo(`Type confusion checks passed: ${passedCount} / ${edgeCases.length}`);

  if (passedCount === edgeCases.length) {
    return { test: 'Test 10: Type Confusion and Numeric Edge Cases', status: 'PASS', details: 'All numeric bounds, clampings, and schema validations passed' };
  } else {
    return { test: 'Test 10: Type Confusion and Numeric Edge Cases', status: 'FAIL', severity: 'MEDIUM', details: `${edgeCases.length - passedCount} edge cases unhandled` };
  }
}

if (process.argv[1]?.endsWith('test-10-type-confuse.mjs')) {
  runTest10().then(console.log);
}
