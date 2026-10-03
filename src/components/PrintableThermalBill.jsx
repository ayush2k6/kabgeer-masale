import React, { useState } from 'react';
import { Printer, X, FileText, Tag, Check, Truck, ShieldCheck, MapPin, Phone, Mail, Globe, Package } from 'lucide-react';
import logo from '../assets/logo.png';
import './PrintableThermalBill.css';

// Code 39 Barcode SVG Generator (100% native vector barcode, crisp on 203/300 DPI thermal printers)
const CODE39_MAP = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

export const SvgBarcode = ({ value, height = 40, showText = true }) => {
  if (!value) return null;
  const cleanVal = String(value).toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
  const encodedStr = `*${cleanVal}*`;
  
  let currentX = 0;
  const bars = [];
  const narrowWidth = 1.6;
  const wideWidth = 4.2;
  const gapWidth = 1.6;

  for (let i = 0; i < encodedStr.length; i++) {
    const char = encodedStr[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['*'];
    
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
      const width = isWide ? wideWidth : narrowWidth;
      
      if (isBar) {
        bars.push(
          <rect
            key={`${i}-${j}`}
            x={currentX}
            y={0}
            width={width}
            height={height}
            fill="#000000"
          />
        );
      }
      currentX += width;
    }
    currentX += gapWidth;
  }

  return (
    <div className="barcode-svg-container" style={{ textAlign: 'center', width: '100%' }}>
      <svg
        viewBox={`0 0 ${currentX} ${height}`}
        style={{ width: '100%', maxWidth: '280px', height: `${height}px`, display: 'block', margin: '0 auto' }}
        preserveAspectRatio="none"
      >
        {bars}
      </svg>
      {showText && <div className="barcode-text-caption">*{cleanVal}*</div>}
    </div>
  );
};

// Convert number to Indian currency words
const numberToWordsIndian = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (num) => {
    let s = '';
    if (num >= 100) {
      s += a[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      s += b[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      s += a[num] + ' ';
    }
    return s;
  };

  let crore = Math.floor(n / 10000000);
  let lakh = Math.floor((n % 10000000) / 100000);
  let thousand = Math.floor((n % 100000) / 1000);
  let remainder = n % 1000;
  let result = '';

  if (crore) result += convertLessThanOneThousand(crore) + 'Crore ';
  if (lakh) result += convertLessThanOneThousand(lakh) + 'Lakh ';
  if (thousand) result += convertLessThanOneThousand(thousand) + 'Thousand ';
  if (remainder) result += convertLessThanOneThousand(remainder);

  return `Rupees ${result.trim()} Only`;
};

const PrintableThermalBill = ({ order, onClose, onUpdateShipping }) => {
  const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' (4x6 sticker) or 'invoice' (A4)
  const [courierName, setCourierName] = useState(order?.courier_partner || 'Trackon');
  const [awbNumber, setAwbNumber] = useState(order?.trackon_awb || order?.shiprocket_awb || '');

  if (!order) return null;

  const displayOrderId = order.display_order_id || order.id || 'KAB-ORDER';
  const isPrepaid = String(order.payment_status || '').toLowerCase() === 'paid';
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-IN');

  const addr = order.shipping_address || {};
  const customerName = `${addr.firstName || order.customer_name || 'Customer'} ${addr.lastName || ''}`.trim();
  const customerPhone = addr.phone || order.customer_phone || '—';
  const customerEmail = order.customer_email || '—';
  const items = order.order_items || [];
  const totalAmount = Number(order.total_amount) || 0;
  const subtotal = Number(order.subtotal) || totalAmount;
  const discount = Number(order.discount) || 0;
  const tax = Number(order.tax) || 0;
  const shippingFee = Number(order.shipping_fee) || 0;
  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="thermal-modal-backdrop" onClick={onClose}>
      <div className="thermal-modal-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Controls (Screen Only) */}
        <div className="thermal-modal-header no-print">
          <div className="thermal-modal-title">
            <Printer size={20} color="#1a2f22" />
            <div>
              <h3>Print Order Bill & Shipping Label</h3>
              <p>Ready for pasting onto parcels (4"x6" Thermal Sticker or A4 Tax Invoice)</p>
            </div>
          </div>

          <div className="thermal-controls-right">
            {/* Format Toggle Buttons */}
            <div className="format-toggle-group">
              <button
                type="button"
                className={`format-btn ${printFormat === 'thermal' ? 'active' : ''}`}
                onClick={() => setPrintFormat('thermal')}
                title="Direct Thermal 4x6 inch Sticker Label"
              >
                <Tag size={14} /> 4"x6" Thermal Sticker
              </button>
              <button
                type="button"
                className={`format-btn ${printFormat === 'invoice' ? 'active' : ''}`}
                onClick={() => setPrintFormat('invoice')}
                title="Full A4 Commercial Tax Invoice"
              >
                <FileText size={14} /> A4 Tax Invoice & Slip
              </button>
            </div>

            <button
              type="button"
              className="btn-print-action"
              onClick={handleTriggerPrint}
            >
              <Printer size={16} /> Print Now
            </button>

            <button
              type="button"
              className="btn-modal-close"
              onClick={onClose}
              aria-label="Close Print Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Edit Bar (Screen Only) */}
        <div className="thermal-quick-edit-bar no-print">
          <div className="quick-edit-item">
            <label>Courier Partner:</label>
            <select
              value={courierName}
              onChange={(e) => {
                setCourierName(e.target.value);
                if (onUpdateShipping) onUpdateShipping(e.target.value, awbNumber);
              }}
              className="quick-edit-input"
            >
              <option value="Trackon">Trackon Courier</option>
              <option value="Shiprocket">Shiprocket</option>
              <option value="India Post">India Post</option>
              <option value="DTDC">DTDC</option>
              <option value="Delhivery">Delhivery</option>
              <option value="Blue Dart">Blue Dart</option>
              <option value="Self Delivery">Self / Hand Delivery</option>
            </select>
          </div>

          <div className="quick-edit-item">
            <label>AWB / Tracking Number:</label>
            <input
              type="text"
              placeholder="e.g. TRK-LKO-123456"
              value={awbNumber}
              onChange={(e) => {
                setAwbNumber(e.target.value);
                if (onUpdateShipping) onUpdateShipping(courierName, e.target.value);
              }}
              className="quick-edit-input monospace"
            />
          </div>

          <div className="quick-edit-info">
            <span>Payment Mode: <strong>{isPrepaid ? 'PREPAID ONLINE' : 'COD'}</strong></span>
            <span>Total Pcs: <strong>{totalQty} items</strong></span>
          </div>
        </div>

        {/* Printable View Container */}
        <div className="thermal-preview-scrollable">
          <div
            id="printable-thermal-bill"
            className={`printable-bill-wrapper ${printFormat === 'thermal' ? 'mode-thermal-4x6' : 'mode-invoice-a4'}`}
          >
            {printFormat === 'thermal' ? (
              /* =========================================================
                 1. THERMAL 4" x 6" (100mm x 150mm) SHIPPING PARCEL LABEL
                 ========================================================= */
              <div className="thermal-4x6-card">
                
                {/* 1. Header with Brand & Routing Barcode */}
                <div className="t-row t-header">
                  <div className="t-brand-col">
                    <div className="t-company-name">KABGEER MASALE</div>
                    <div className="t-tagline">Authentic Royal Lucknowi Spices</div>
                    <div className="t-origin-city">Lucknow, UP - 226001, India</div>
                  </div>
                  <div className="t-courier-badge-col">
                    <div className="t-courier-name">{courierName.toUpperCase()}</div>
                    <div className={`t-payment-pill ${isPrepaid ? 'pill-prepaid' : 'pill-cod'}`}>
                      {isPrepaid ? 'PREPAID - DO NOT COLLECT CASH' : 'COD - COLLECT CASH'}
                    </div>
                  </div>
                </div>

                {/* 2. Order ID & Main Barcode */}
                <div className="t-row t-barcode-section">
                  <div className="t-barcode-meta">
                    <span className="t-meta-label">ORDER ID:</span>
                    <span className="t-order-id-val">#{displayOrderId}</span>
                    <span className="t-date-val">{formattedDate}</span>
                  </div>
                  <SvgBarcode value={awbNumber || displayOrderId} height={36} />
                  {awbNumber && (
                    <div className="t-awb-subtext">
                      AWB / CONSIGNMENT: <strong>{awbNumber}</strong>
                    </div>
                  )}
                </div>

                {/* 3. SHIP TO / Consignee Destination Box (Primary focus for delivery agent) */}
                <div className="t-row t-ship-to-box">
                  <div className="t-box-title">DELIVER TO / SHIP TO:</div>
                  <div className="t-customer-name">{customerName.toUpperCase()}</div>
                  <div className="t-address-line">
                    {addr.address || 'Address provided on order'}
                    {addr.apartment ? `, ${addr.apartment}` : ''}
                  </div>
                  <div className="t-address-line">
                    {addr.city ? `${addr.city}, ` : ''}{addr.state || ''}
                  </div>
                  
                  {/* High Contrast PIN Code */}
                  <div className="t-pincode-badge">
                    <span className="pincode-label">PIN CODE:</span>
                    <span className="pincode-number">{addr.pinCode || '—'}</span>
                  </div>

                  <div className="t-contact-row">
                    <div className="t-phone">
                      <strong>PHONE:</strong> {customerPhone}
                    </div>
                    {customerEmail !== '—' && (
                      <div className="t-email">
                        <strong>EMAIL:</strong> {customerEmail}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Manifest / Items Breakdown */}
                <div className="t-row t-items-section">
                  <div className="t-items-header">
                    <span>ITEM DESCRIPTION ({items.length} PKTS, {totalQty} PCS)</span>
                    <span>QTY</span>
                    <span>PRICE</span>
                  </div>
                  <div className="t-items-list">
                    {items.map((it, idx) => (
                      <div key={it.id || idx} className="t-item-line">
                        <span className="t-item-name">
                          {idx + 1}. {it.product_name}
                        </span>
                        <span className="t-item-qty">{it.quantity}</span>
                        <span className="t-item-price">₹{(Number(it.total_price) || (Number(it.unit_price) * it.quantity) || 0).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Financial Summary Box */}
                <div className="t-row t-totals-section">
                  <div className="t-totals-grid">
                    <div className="t-subtotal">Subtotal: ₹{subtotal.toFixed(0)}</div>
                    {discount > 0 && <div className="t-discount">Discount: -₹{discount.toFixed(0)}</div>}
                    <div className="t-shipping">Shipping: {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(0)}`}</div>
                  </div>
                  <div className="t-grand-total">
                    <span className="t-total-label">NET AMOUNT:</span>
                    <span className="t-total-val">₹{totalAmount.toFixed(0)}</span>
                  </div>
                </div>

                {/* 6. Return Address & Seller Details */}
                <div className="t-row t-return-footer">
                  <div className="t-return-title">IF UNDELIVERED, PLEASE RETURN TO:</div>
                  <div className="t-return-details">
                    <strong>KABGEER MASALE</strong> (Olympic Foods & Essentials)<br />
                    Lucknow, Uttar Pradesh - 226001, India<br />
                    Customer Support: <strong>+91-80900-86636</strong> | enquiry@kabgeermasala.com
                  </div>
                  <div className="t-fssai-stamp">
                    ✓ 100% PURE & NATURAL AWADHI SPICES • PACKED UNDER STRICT HYGIENIC CONDITIONS
                  </div>
                </div>

              </div>
            ) : (
              /* =========================================================
                 2. FULL A4 COMMERCIAL TAX INVOICE & PACKING SLIP
                 ========================================================= */
              <div className="invoice-a4-card">
                
                {/* Invoice Top Header */}
                <div className="inv-header">
                  <div className="inv-brand-box">
                    <img src={logo} alt="Kabgeer Masale" className="inv-logo" />
                    <div>
                      <h1 className="inv-brand-title">KABGEER MASALE</h1>
                      <div className="inv-brand-sub">Crafted by Olympic Foods and Essentials</div>
                      <div className="inv-address-line">Heritage Lucknowi Spice Blends & Gourmet Formulations</div>
                      <div className="inv-address-line">Lucknow, Uttar Pradesh - 226001, India</div>
                      <div className="inv-address-line">Customer Care: +91-80900-86636 | Email: enquiry@kabgeermasala.com</div>
                      <div className="inv-address-line">Website: www.kabgeermasala.com</div>
                    </div>
                  </div>

                  <div className="inv-meta-box">
                    <div className="inv-badge-type">TAX INVOICE / PACKING SLIP</div>
                    <table className="inv-meta-table">
                      <tbody>
                        <tr>
                          <td><strong>Invoice No:</strong></td>
                          <td>#{displayOrderId}</td>
                        </tr>
                        <tr>
                          <td><strong>Date:</strong></td>
                          <td>{formattedDate}</td>
                        </tr>
                        <tr>
                          <td><strong>Payment:</strong></td>
                          <td>
                            <span className={isPrepaid ? 'inv-tag-prepaid' : 'inv-tag-cod'}>
                              {isPrepaid ? 'PAID ONLINE (Razorpay)' : 'CASH ON DELIVERY'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Courier:</strong></td>
                          <td>{courierName}</td>
                        </tr>
                        {awbNumber && (
                          <tr>
                            <td><strong>AWB No:</strong></td>
                            <td className="monospace">{awbNumber}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="inv-divider" />

                {/* Addresses Row */}
                <div className="inv-parties-grid">
                  <div className="inv-party-card">
                    <div className="inv-party-header">
                      <MapPin size={13} />
                      <span>BILL TO / SHIP TO (CONSIGNEE)</span>
                    </div>
                    <div className="inv-party-body">
                      <div className="inv-cust-name">{customerName}</div>
                      <div>{addr.address || 'Address provided on order'}</div>
                      {addr.apartment && <div>{addr.apartment}</div>}
                      <div>{addr.city ? `${addr.city}, ` : ''}{addr.state || ''} - <strong>{addr.pinCode || '—'}</strong></div>
                      <div>{addr.country || 'India'}</div>
                      <div style={{ marginTop: '4px' }}><strong>Phone:</strong> {customerPhone}</div>
                      <div><strong>Email:</strong> {customerEmail}</div>
                    </div>
                  </div>

                  <div className="inv-party-card">
                    <div className="inv-party-header">
                      <Package size={13} />
                      <span>DISPATCH & DISPATCHER DETAILS</span>
                    </div>
                    <div className="inv-party-body">
                      <div><strong>Seller:</strong> Olympic Foods and Essentials</div>
                      <div><strong>Brand:</strong> Kabgeer Masale</div>
                      <div><strong>Dispatch Hub:</strong> Lucknow Central Hub, UP</div>
                      <div><strong>Category:</strong> Spices, Condiments & Seasonings</div>
                      <div><strong>Nature of Goods:</strong> 100% Pure Vegetarian Lucknowi Spices</div>
                      <div style={{ marginTop: '6px' }}>
                        <SvgBarcode value={awbNumber || displayOrderId} height={28} showText={false} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="inv-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Product Description & Spice Formulation</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>HSN Code</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Unit Rate</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const unitPrice = Number(item.unit_price) || 0;
                      const itemTotal = Number(item.total_price) || (unitPrice * item.quantity);
                      return (
                        <tr key={item.id || index}>
                          <td style={{ textAlign: 'center' }}>{index + 1}</td>
                          <td>
                            <strong>{item.product_name}</strong>
                            <div className="inv-item-subtext">Authentic Heritage Recipe • 100% Pure</div>
                          </td>
                          <td style={{ textAlign: 'center' }} className="monospace">0910</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>₹{unitPrice.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals & Words Row */}
                <div className="inv-footer-summary-grid">
                  <div className="inv-amount-words-box">
                    <div className="inv-words-title">AMOUNT IN WORDS:</div>
                    <div className="inv-words-val">{numberToWordsIndian(totalAmount)}</div>
                    
                    <div className="inv-declaration-box">
                      <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                    </div>
                  </div>

                  <div className="inv-totals-box">
                    <div className="inv-tot-row">
                      <span>Subtotal (Items):</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="inv-tot-row" style={{ color: '#15803d' }}>
                        <span>Discount Applied:</span>
                        <span>-₹{discount.toFixed(2)}</span>
                      </div>
                    )}
                    {tax > 0 && (
                      <div className="inv-tot-row">
                        <span>GST / Taxes:</span>
                        <span>+₹{tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="inv-tot-row">
                      <span>Shipping & Handling:</span>
                      <span>{shippingFee === 0 ? 'FREE' : `+₹${shippingFee.toFixed(2)}`}</span>
                    </div>
                    <div className="inv-tot-row inv-final-total-row">
                      <span>Grand Total:</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Signatory & Quality Stamp */}
                <div className="inv-sign-row">
                  <div className="inv-terms-col">
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>Thank you for choosing Kabgeer Masale!</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      For queries, bulk supply, or culinary feedback, WhatsApp us at <strong>+91-80900-86636</strong>.
                    </div>
                  </div>

                  <div className="inv-signature-col">
                    <div className="inv-for-company">For KABGEER MASALE</div>
                    <div className="inv-sign-line" />
                    <div className="inv-auth-title">Authorized Signatory</div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintableThermalBill;
