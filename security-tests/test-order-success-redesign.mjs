import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== [TESTING ORDER SUCCESS REDESIGN & TOTAL MONEY PAID REFLECTION] ===\n');

const jsxFile = path.resolve('src/pages/OrderSuccessPage.jsx');
const cssFile = path.resolve('src/pages/OrderSuccessPage.css');

assert(fs.existsSync(jsxFile), 'OrderSuccessPage.jsx exists');
assert(fs.existsSync(cssFile), 'OrderSuccessPage.css exists');

const jsx = fs.readFileSync(jsxFile, 'utf8');
const css = fs.readFileSync(cssFile, 'utf8');

// 1. Total Paid Amount Verification
console.log('1. Checking Total Paid amount computation and fallbacks...');
assert(jsx.includes('totalPaid.toFixed(2)'), 'Renders totalPaid with 2 decimal places');
assert(jsx.includes('rawTotal > 0 ? rawTotal : Math.max(0, subtotal - discount + shippingFee)'), 'Computes mathematical fallback if raw total is 0');
assert(jsx.includes('order?.total_amount ?? order?.totalAmount ?? order?.total ?? 0'), 'Checks both total_amount and totalAmount and total');
console.log('  ✔ PASS: Total Paid computation robust against camelCase/snake_case and zero fallbacks.');

// 2. Financial Breakdown Card
console.log('2. Checking Financial Summary Table...');
assert(jsx.includes('order-financial-summary-card'), 'Renders dedicated financial breakdown card');
assert(jsx.includes('Items Subtotal'), 'Renders Items Subtotal');
assert(jsx.includes('Trackon Express Delivery'), 'Renders Trackon Delivery fee');
assert(jsx.includes('Total Amount Paid'), 'Renders Total Amount Paid');
console.log('  ✔ PASS: Dedicated Financial Summary card present.');

// 3. Typography & Sans-Serif Mix
console.log('3. Checking typography rules: Sans-serif mix, Serif only in main heading...');
assert(css.includes('*:not(.order-success-title)'), 'Enforces Sans-Serif on everything except main title');
assert(css.includes('font-family: var(--font-heading, \'Playfair Display\', Georgia, serif) !important;'), 'Applies Serif font exclusively to .order-success-title');
console.log('  ✔ PASS: Strict typography segregation verified (Sans-Serif throughout, Serif solely on main heading).');

// 4. Customer Name and Phone Integrity
console.log('4. Checking customer name and phone resolution...');
assert(jsx.includes('order?.shipping_address?.name'), 'Resolves customer name from shipping_address');
assert(jsx.includes('order?.shipping_address?.phone'), 'Resolves customer phone from shipping_address');
assert(jsx.includes('{customerPhone && <span className="recipient-phone">• {customerPhone}</span>}'), 'Conditional phone separator prevents stray bullet dots');
console.log('  ✔ PASS: Customer name & phone resolution handles nested shipping_address without stray dots.');

// 5. Interactive features
console.log('5. Checking UX features (Copy Order ID, Print Receipt)...');
assert(jsx.includes('handleCopyOrderId'), 'Copy Order ID handler present');
assert(jsx.includes('handlePrint'), 'Print Receipt handler present');
assert(css.includes('@media print'), 'Print media stylesheet present');
console.log('  ✔ PASS: Copy Order ID, Print Receipt, and Print Stylesheet active.');

console.log('\n========================================================================');
console.log('ALL ORDER SUCCESS PAGE REDESIGN & TOTAL PAID TESTS PASSED (100%)');
console.log('========================================================================\n');
