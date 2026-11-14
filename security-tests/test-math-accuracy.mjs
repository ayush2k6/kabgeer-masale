import assert from 'node:assert';

console.log('=== [COMMERCIAL GST & PRICING MATHEMATICAL RIGOR TEST] ===\n');

function computeInvoiceMath({ items, discount = 0, shippingFee = 0, isIntraState = true }) {
  const subtotal = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalAmount = Math.max(1, Math.round((subtotal - discount + shippingFee) * 100) / 100);

  const netGoodsValue = Math.max(0, subtotal - discount);
  const taxableGoodsSubtotal = netGoodsValue / 1.05;
  const goodsGst = netGoodsValue - taxableGoodsSubtotal;

  const taxableShipping = shippingFee > 0 ? (shippingFee / 1.05) : 0;
  const shippingGst = shippingFee > 0 ? (shippingFee - taxableShipping) : 0;

  const totalTaxable = taxableGoodsSubtotal + taxableShipping;
  const totalGst = goodsGst + shippingGst;
  const cgstAmount = isIntraState ? (totalGst / 2) : 0;
  const sgstAmount = isIntraState ? (totalGst / 2) : 0;
  const igstAmount = !isIntraState ? totalGst : 0;

  // Checkout page inclusive GST note calculation
  const checkoutInclusiveGst = Math.round((netGoodsValue * 0.05 / 1.05) * 100) / 100;

  // Table row simulation
  const itemRows = items.map(it => {
    const itemTotal = it.price * it.quantity;
    const itemTaxable = itemTotal / 1.05;
    const itemGst = itemTotal - itemTaxable;
    return { name: it.name, qty: it.quantity, taxable: itemTaxable, gst: itemGst, amount: itemTotal };
  });

  const discountRow = discount > 0 ? {
    name: 'Special Discount',
    qty: 1,
    taxable: -(discount / 1.05),
    gst: -(discount - (discount / 1.05)),
    amount: -discount
  } : null;

  const shippingRow = shippingFee > 0 ? {
    name: 'Shipping',
    qty: 1,
    taxable: taxableShipping,
    gst: shippingGst,
    amount: shippingFee
  } : null;

  const allTableRows = [...itemRows, ...(discountRow ? [discountRow] : []), ...(shippingRow ? [shippingRow] : [])];
  const tableSumTaxable = allTableRows.reduce((sum, r) => sum + r.taxable, 0);
  const tableSumGst = allTableRows.reduce((sum, r) => sum + r.gst, 0);
  const tableSumAmount = allTableRows.reduce((sum, r) => sum + r.amount, 0);

  return {
    subtotal,
    discount,
    shippingFee,
    totalAmount,
    netGoodsValue,
    totalTaxable,
    totalGst,
    cgstAmount,
    sgstAmount,
    igstAmount,
    checkoutInclusiveGst,
    tableSumTaxable,
    tableSumGst,
    tableSumAmount,
    totalQty
  };
}

// TEST 1: Standard BYB Order (4 Masalas, 10% Discount, ₹50 Shipping)
console.log('--- TEST 1: Standard BYB Order (4 Masalas, 10% OFF, ₹50 Delivery) ---');
const res1 = computeInvoiceMath({
  items: [
    { name: 'Chicken Korma Masala', price: 79, quantity: 2 },
    { name: 'Mutton Stew Masala', price: 79, quantity: 2 }
  ],
  discount: 31.60,
  shippingFee: 50.00,
  isIntraState: true
});

console.log(`Subtotal: ₹${res1.subtotal.toFixed(2)}`);
console.log(`Discount: -₹${res1.discount.toFixed(2)}`);
console.log(`Shipping: ₹${res1.shippingFee.toFixed(2)}`);
console.log(`Grand Total: ₹${res1.totalAmount.toFixed(2)}`);
console.log(`Checkout Inclusive GST Note: ₹${res1.checkoutInclusiveGst.toFixed(2)}`);
console.log(`Table Sum (Taxable + GST): ₹${(res1.tableSumTaxable + res1.tableSumGst).toFixed(2)}`);

assert.strictEqual(res1.subtotal, 316.00);
assert.strictEqual(res1.totalAmount, 334.40);
assert.strictEqual(res1.checkoutInclusiveGst, 13.54, 'Checkout inclusive GST on discounted ₹284.40 should be ₹13.54, NOT ₹15.05');
assert.strictEqual(Math.round(res1.tableSumAmount * 100) / 100, 334.40, 'Table sum of amount column must match Grand Total');
assert.strictEqual(Math.round((res1.tableSumTaxable + res1.tableSumGst) * 100) / 100, 334.40, 'Taxable + GST must match Grand Total');
console.log('✔ PASS: Standard BYB math adds up with 0.00 paisa variance!\n');

// TEST 2: Developer Live Test Coupon TESTPAY1 (Sets total to ₹1.00)
console.log('--- TEST 2: TESTPAY1 Live Developer Test Coupon (Grand Total ₹1.00) ---');
const res2 = computeInvoiceMath({
  items: [
    { name: 'Chicken Korma Masala', price: 79, quantity: 2 },
    { name: 'Mutton Stew Masala', price: 79, quantity: 2 }
  ],
  discount: 315.00,
  shippingFee: 0,
  isIntraState: true
});

console.log(`Subtotal: ₹${res2.subtotal.toFixed(2)}`);
console.log(`Discount: -₹${res2.discount.toFixed(2)}`);
console.log(`Grand Total: ₹${res2.totalAmount.toFixed(2)}`);
console.log(`Checkout Inclusive GST: ₹${res2.checkoutInclusiveGst.toFixed(2)}`);
console.log(`Table Sum (Taxable + GST): ₹${(res2.tableSumTaxable + res2.tableSumGst).toFixed(2)}`);

assert.strictEqual(res2.totalAmount, 1.00);
assert.strictEqual(res2.checkoutInclusiveGst, 0.05, 'Checkout GST on ₹1.00 test must be ₹0.05, NOT ₹15.05');
assert.strictEqual(Math.round(res2.tableSumAmount * 100) / 100, 1.00, 'Table sum must match ₹1.00');
assert.strictEqual(Math.round((res2.tableSumTaxable + res2.tableSumGst) * 100) / 100, 1.00, 'Taxable + GST must match ₹1.00');
console.log('✔ PASS: TESTPAY1 coupon math adds up with 0.00 paisa variance!\n');

// TEST 3: Regular Order (2 Masalas, No BYB, ₹50 Shipping)
console.log('--- TEST 3: Regular Non-Bundle Order (2 Masalas, No Discount, ₹50 Shipping) ---');
const res3 = computeInvoiceMath({
  items: [
    { name: 'Biryani Masala', price: 79, quantity: 2 }
  ],
  discount: 0,
  shippingFee: 50.00,
  isIntraState: true
});

console.log(`Subtotal: ₹${res3.subtotal.toFixed(2)}`);
console.log(`Grand Total: ₹${res3.totalAmount.toFixed(2)}`);
console.log(`Checkout Inclusive GST: ₹${res3.checkoutInclusiveGst.toFixed(2)}`);

assert.strictEqual(res3.totalAmount, 208.00);
assert.strictEqual(res3.checkoutInclusiveGst, 7.52, 'GST on ₹158 should be ₹7.52');
assert.strictEqual(Math.round(res3.tableSumAmount * 100) / 100, 208.00);
assert.strictEqual(Math.round((res3.tableSumTaxable + res3.tableSumGst) * 100) / 100, 208.00);
console.log('✔ PASS: Non-bundle regular order math verified!\n');

console.log('=== ALL 3 MATHEMATICAL RIGOR SUITES PASSED (100% PAISA-PERFECT) ===');
