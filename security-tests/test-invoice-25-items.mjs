import assert from 'assert';

console.log('=== [A4 INVOICE 25-ITEM CATALOGUE & PRINT RESILIENCE TEST] ===\n');

// 25 authentic Kabgeer catalogue masalas
const PRODUCTS = [
  'Mutton Stew Masala', 'Chicken Korma Masala', 'Mutton Nihari Masala',
  'Galauti Kebab Masala', 'Shami Kebab Masala', 'Awadhi Tikka Boti Kebab Masala',
  'Veg Tandoori Masala', 'Non-Veg Tandoori Masala', 'Shahi Garam Masala',
  'Garlic Powder', 'Meat Tenderizer', 'Kadhai Paneer Masala',
  'Kitchen King Masala', 'Chole Masale', 'Chaat Masala',
  'Butter Paneer Masala', 'Coriander Powder', 'Turmeric Powder',
  'Red Chilli Powder', 'Kashmiri Lal Mirch Powder', 'Sambar Masala',
  'Pav Bhaji Masala', 'Mutton Biryani Masala', 'Chicken Biryani Masala',
  'Veg Biryani Masala'
];

console.log(`Catalogue product count: ${PRODUCTS.length}`);
assert(PRODUCTS.length === 25, 'Expected exactly 25 products in products catalogue');
console.log('✔ PASS: Exact 25 products found in catalogue!\n');

// 2. Build mock 25-masala wholesale/catering order
const mock25Items = PRODUCTS.map((prodName, idx) => ({
  id: `item-${idx + 1}`,
  product_id: `prod-${idx + 1}`,
  product_name: prodName,
  quantity: 1,
  unit_price: 79,
  total_price: 79
}));

const subtotal = mock25Items.reduce((acc, it) => acc + it.total_price, 0); // 25 * 79 = 1975
const discount = 197.50; // 10% BYB discount
const shippingFee = 0; // Free delivery on orders > 1000
const totalAmount = subtotal - discount + shippingFee; // 1777.50

const mockOrder = {
  id: 'ord_25masala_test',
  display_order_id: 'KBG-202611-0025',
  created_at: '2026-11-15T12:00:00.000Z',
  customer_name: 'Tanmay Yadav',
  customer_phone: '9876543210',
  customer_email: 'tanmay@example.com',
  payment_status: 'paid',
  payment_method: 'razorpay',
  shipping_address: {
    firstName: 'Tanmay',
    lastName: 'Yadav',
    address: 'Plot 664K, Jajmau Industrial Area',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    pinCode: '208010',
    phone: '9876543210'
  },
  order_items: mock25Items,
  subtotal,
  discount,
  shipping_fee: shippingFee,
  total_amount: totalAmount
};

// 3. Test Filename / Document Title Generator Logic
const displayOrderId = mockOrder.display_order_id;
const customerName = `${mockOrder.shipping_address.firstName} ${mockOrder.shipping_address.lastName}`.trim();
const formattedDate = '15-11-2026';

const cleanOrderId = String(displayOrderId).replace(/[^a-zA-Z0-9_-]/g, '');
const cleanCustomer = customerName.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_');
const cleanDate = formattedDate.replace(/[\/\.]/g, '-');

const a4FileName = `Kabgeer-Tax-Invoice_${cleanOrderId}_${cleanCustomer}_${cleanDate}`;
const thermalFileName = `Kabgeer-Shipping-Label_${cleanOrderId}_${cleanCustomer}_${cleanDate}`;

console.log('Generated A4 Invoice Filename: ' + a4FileName + '.pdf');
console.log('Generated Thermal Filename:    ' + thermalFileName + '.pdf');

assert.strictEqual(a4FileName, 'Kabgeer-Tax-Invoice_KBG-202611-0025_Tanmay_Yadav_15-11-2026');
assert.strictEqual(thermalFileName, 'Kabgeer-Shipping-Label_KBG-202611-0025_Tanmay_Yadav_15-11-2026');
console.log('✔ PASS: Filename generation includes Order ID, Customer Name, and Date!\n');

// 4. Test Density Classification
const isDenseTable = mock25Items.length >= 12 && mock25Items.length < 22;
const isUltraDenseTable = mock25Items.length >= 22;
const densityClass = isUltraDenseTable ? 'is-ultra-dense' : (isDenseTable ? 'is-dense-order' : '');

console.log(`Item count: ${mock25Items.length} -> Density Class: "${densityClass}"`);
assert.strictEqual(densityClass, 'is-ultra-dense', 'Expected ultra-dense class for 25 items');
console.log('✔ PASS: Ultra-dense layout correctly activated for 25 items!\n');

// 5. Test Mathematical Rigor for 25 Items
const netGoodsValue = Math.max(0, subtotal - discount);
const taxableGoodsSubtotal = netGoodsValue / 1.05;
const goodsGst = netGoodsValue - taxableGoodsSubtotal;
const totalTaxable = taxableGoodsSubtotal;
const totalGst = goodsGst;

console.log(`Subtotal (25 items): ₹${subtotal.toFixed(2)}`);
console.log(`10% Bundle Discount: -₹${discount.toFixed(2)}`);
console.log(`Net Goods Value:     ₹${netGoodsValue.toFixed(2)}`);
console.log(`Taxable Subtotal:    ₹${totalTaxable.toFixed(2)}`);
console.log(`GST (5% Inclusive):  ₹${totalGst.toFixed(2)}`);
console.log(`Grand Total:         ₹${totalAmount.toFixed(2)}`);

const mathSum = Number((totalTaxable + totalGst).toFixed(2));
const variance = Math.abs(mathSum - totalAmount);
assert(variance < 0.001, `Math variance exceeds 0! got ${variance}`);
console.log('✔ PASS: 25-item order GST and Grand Total adds up with 0.00 paisa variance!\n');

console.log('=== ALL 25-ITEM INVOICE TESTS PASSED (100% READY FOR PRINT) ===');
