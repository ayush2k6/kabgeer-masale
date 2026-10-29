import { SUPABASE_URL, getHeaders, fetchActiveProduct, logHeader, logPass, logFail, logWarn, logInfo } from './config.mjs';

export async function runTest5() {
  logHeader('TEST 5: Client-Side Price & Fee Tampering');
  const product = await fetchActiveProduct();
  const legitimatePrice = product.price;

  logInfo(`Legitimate Catalog Price for '${product.name}': ₹${legitimatePrice}`);

  // Attack 1: Attempt to alter unit price to ₹1 in items array
  const priceTamperRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1, price: 1.00 }],
      shippingDetails: { email: 'tamper-price@kabgeer.local', address: '123 Price Lane', city: 'Lucknow', pinCode: '226001' }
    })
  });
  const priceTamperData = await priceTamperRes.json();
  const subtotalUsed = priceTamperData.summary?.subtotal;

  if (subtotalUsed === legitimatePrice) {
    logPass(`Catalog unit price tampering prevented: Server fetched authoritative price ₹${legitimatePrice} (ignored forged price ₹1)`);
  } else {
    logFail(`Catalog unit price tampering succeeded! Server used subtotal ₹${subtotalUsed}`);
  }

  // Attack 2: Attempt to alter shipping fee from standard ₹50 to ₹0
  // and discountAmount to subtotal - 1 to force total = ₹1
  const feeTamperRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      shippingDetails: { email: 'tamper-fee@kabgeer.local', address: '123 Price Lane', city: 'Lucknow', pinCode: '226001' },
      pricingConfig: {
        shippingFee: 0,
        discountAmount: legitimatePrice - 1
      }
    })
  });
  const feeTamperData = await feeTamperRes.json();
  const finalTotal = feeTamperData.summary?.total;

  logInfo(`Tampered Shipping/Discount Request: Submitted discount ₹${legitimatePrice - 1}, shipping ₹0.`);
  logInfo(`Server Final Total Result: ₹${finalTotal} (${feeTamperData.amount} paise)`);

  if (finalTotal === 1) {
    logWarn(`VULNERABILITY: Client-side discount and shipping fee tampering accepted! Order created for ₹1 instead of ₹${legitimatePrice + 50}.`);
    return {
      test: 'Test 5: Client-Side Price Tampering',
      status: 'FAIL',
      severity: 'CRITICAL',
      details: 'Client can arbitrarily zero shipping fees and inject arbitrary discounts to purchase products for ₹1'
    };
  }

  logPass('Client-side fee and discount tampering rejected.');
  return { test: 'Test 5: Client-Side Price Tampering', status: 'PASS', details: 'All pricing calculated authoritatively on server' };
}

if (process.argv[1]?.endsWith('test-5-price-tamper.mjs')) {
  runTest5().then(console.log);
}
