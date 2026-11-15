import assert from 'assert';

console.log('=== [TESTING CSV EXPORT FORMATTING & LINE-BREAK ELIMINATION] ===\n');

// Replicate the exact cleanStr and escapeCsv logic from AdminDashboardPage.jsx
const cleanStr = (val) => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\r\n\t]+/g, ' ')   // Eliminate all linebreaks and tabs
    .replace(/\s{2,}/g, ' ')      // Collapse multiple whitespace
    .trim();
};

const escapeCsv = (val) => {
  const clean = cleanStr(val);
  if (!clean) return '""';
  return `"${clean.replace(/"/g, '""')}"`;
};

// 1. Test line break neutralization in messy inputs
const hostileAddress = "Flat 402, Building B\r\nNear Royal Garden,\nOpp. Metro Pillar #52\tNew Delhi";
const sanitizedAddr = cleanStr(hostileAddress);
assert(!sanitizedAddr.includes('\n'), "Must not contain \\n");
assert(!sanitizedAddr.includes('\r'), "Must not contain \\r");
assert(!sanitizedAddr.includes('\t'), "Must not contain \\t");
console.log('✔ PASS: Address line breaks and tabs neutralized into single space:', sanitizedAddr);

// 2. Test quote escaping in CSV
const customerWithQuotes = 'Ramesh "The Chef" Kumar';
const escapedName = escapeCsv(customerWithQuotes);
assert.strictEqual(escapedName, '"Ramesh ""The Chef"" Kumar"');
console.log('✔ PASS: RFC 4180 internal quote escaping verified:', escapedName);

// 3. Test concise item summary formatting
const mockItems = [
  { product_name: 'Shahi Garam Masala (100g)\nSpecial Blend', quantity: 2 },
  { product_name: 'Awadhi Biryani Masala (100g)', quantity: 1 }
];
const itemsList = mockItems.map(it => `${it.quantity}x ${cleanStr(it.product_name)}`);
itemsList.push('2x Mini Masala Sample Pack');
const summary = itemsList.join(', ');
assert(!summary.includes('\n'));
assert.strictEqual(summary, '2x Shahi Garam Masala (100g) Special Blend, 1x Awadhi Biryani Masala (100g), 2x Mini Masala Sample Pack');
console.log('✔ PASS: Clean, uncluttered items summary:', summary);

// 4. Test multi-row integrity (exactly 1 physical line per order)
const mockOrders = [
  {
    id: 'ord-1',
    display_order_id: 'BYB-20261114-9386',
    created_at: '2026-11-15T02:12:18.000Z',
    customer_name: 'Tanmay Yadav\n(Verified Customer)',
    customer_phone: '8355082882',
    customer_email: 'tanmay@example.com',
    shipping_address: { address_line1: 'Line 1\r\nLine 2', city: 'Lucknow\n', state: 'UP', postal_code: '226001' },
    payment_status: 'Paid',
    order_status: 'Processing',
    total_amount: 2145.20
  },
  {
    id: 'ord-2',
    display_order_id: 'ORD-20261114-1111',
    created_at: '2026-11-14T10:00:00.000Z',
    customer_name: 'Amina Khan',
    customer_phone: '9876543210',
    customer_email: 'amina@example.com',
    shipping_address: { address_line1: 'House 5, Street 2', city: 'Delhi', state: 'Delhi', postal_code: '110001' },
    payment_status: 'Paid',
    order_status: 'Delivered',
    total_amount: 550.00
  }
];

const headers = ['Order ID', 'Customer Name', 'Address', 'Total'];
const rows = mockOrders.map(o => [
  escapeCsv(o.display_order_id),
  escapeCsv(o.customer_name),
  escapeCsv(cleanStr(o.shipping_address.address_line1)),
  escapeCsv(o.total_amount.toFixed(2))
].join(','));

const fullCsv = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
const lines = fullCsv.split('\r\n');

// Must be exactly 1 header line + 2 order lines = 3 lines total (zero row leakage)
assert.strictEqual(lines.length, 3, "CSV must have exactly 3 physical lines (1 header + 2 orders)");
console.log('✔ PASS: Row integrity verified (zero multi-line leakage, exactly 1 row per order)');

console.log('\n========================================================================');
console.log('ALL CSV EXPORT FORMATTING & INTEGRITY TESTS PASSED!');
console.log('========================================================================\n');
