import assert from 'node:assert';

console.log('=== [TESTING BYB BUNDLE FLOW & INVOICE LABELING] ===');

// 1. Test calculation logic
const cart1 = [
  { id: 'prod_1', name: 'Chicken Korma Masala', price: 79, quantity: 2 },
  { id: 'prod_2', name: 'Mutton Stew Masala', price: 79, quantity: 2 }
];

const totalUnits = cart1.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
const isBundle = totalUnits >= 4;
const subtotal = cart1.reduce((sum, i) => sum + i.price * i.quantity, 0);
const discount = isBundle ? Math.round(subtotal * 0.10 * 100) / 100 : 0;

console.log(`Cart: 2 items, 4 total units.`);
console.log(`Subtotal: ₹${subtotal.toFixed(2)}, isBundle: ${isBundle}, Discount (10%): ₹${discount.toFixed(2)}`);
assert.strictEqual(isBundle, true, 'Cart with 4 units must qualify as BYB!');
assert.strictEqual(subtotal, 316, 'Subtotal should be 316');
assert.strictEqual(discount, 31.6, 'Discount should be 31.6');
console.log('✔ PASS: 4 units correctly qualify for BYB with 10% discount!');

// 2. Test invoice special discount labeling logic
const formatInvoiceSpecialDiscount = (order, isByb) => {
  const couponCode = order.coupon_code || null;
  if (isByb) {
    return couponCode
      ? `Special Discount (Build Your Bundle • ${couponCode}):`
      : 'Special Discount (Build Your Bundle - 10% Off):';
  }
  return couponCode
    ? `Special Discount (Coupon: ${couponCode}):`
    : 'Special Discount:';
};

const bybOrderWithoutCoupon = { display_order_id: 'BYB-20261114-1234', coupon_code: null };
const label1 = formatInvoiceSpecialDiscount(bybOrderWithoutCoupon, true);
assert.strictEqual(label1, 'Special Discount (Build Your Bundle - 10% Off):');
console.log(`✔ PASS: Standard BYB invoice label: "${label1}"`);

const bybOrderWithTestPay = { display_order_id: 'BYB-20261002-6571', coupon_code: 'TESTPAY1' };
const label2 = formatInvoiceSpecialDiscount(bybOrderWithTestPay, true);
assert.strictEqual(label2, 'Special Discount (Build Your Bundle • TESTPAY1):');
console.log(`✔ PASS: BYB with coupon invoice label: "${label2}"`);

console.log('=== ALL BYB FLOW CHECKS PASSED ===');
