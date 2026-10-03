import React, { useState } from 'react';
import { Printer, X, FileText, Tag, Check, Truck, ShieldCheck, MapPin, Phone, Mail, Globe, Package, Building2, CreditCard } from 'lucide-react';
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

export const SvgBarcode = ({ value, height = 36, showText = true }) => {
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
        style={{ width: '100%', maxWidth: '260px', height: `${height}px`, display: 'block', margin: '0 auto' }}
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
  if (n === 0) return 'RUPEES ZERO ONLY';
  const a = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convertLessThanOneThousand = (num) => {
    let s = '';
    if (num >= 100) {
      s += a[Math.floor(num / 100)] + ' HUNDRED ';
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

  if (crore) result += convertLessThanOneThousand(crore) + 'CRORE ';
  if (lakh) result += convertLessThanOneThousand(lakh) + 'LAKH ';
  if (thousand) result += convertLessThanOneThousand(thousand) + 'THOUSAND ';
  if (remainder) result += convertLessThanOneThousand(remainder);

  return `RUPEES ${result.trim()} ONLY`;
};

const PrintableThermalBill = ({ order, onClose, onUpdateShipping }) => {
  const [printFormat, setPrintFormat] = useState('invoice'); // default to 'invoice' (A4) or 'thermal' (4x6)
  const [courierName, setCourierName] = useState(order?.courier_partner || 'Trackon');
  const [awbNumber, setAwbNumber] = useState(order?.trackon_awb || order?.shiprocket_awb || '');

  if (!order) return null;

  const displayOrderId = order.display_order_id || order.id || 'KAB-ORDER';
  const isPrepaid = String(order.payment_status || '').toLowerCase() === 'paid';
  
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN');

  const formattedDateTime = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString('en-IN');

  const addr = order.shipping_address || {};
  const customerName = `${addr.firstName || order.customer_name || 'Customer'} ${addr.lastName || ''}`.trim();
  const customerPhone = addr.phone || order.customer_phone || '—';
  const customerEmail = order.customer_email || '—';
  const items = order.order_items || [];
  const totalAmount = Number(order.total_amount) || 0;
  const subtotal = Number(order.subtotal) || totalAmount;
  const discount = Number(order.discount) || 0;
  const shippingFee = Number(order.shipping_fee) || 0;
  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  // Accurate GST breakdown (5% inclusive on spices)
  const isIntraState = String(addr.state || '').toLowerCase().includes('uttar pradesh') || String(addr.state || '').toLowerCase() === 'up';
  const taxableSubtotal = (totalAmount - shippingFee) / 1.05;
  const totalGst = (totalAmount - shippingFee) - taxableSubtotal;
  const cgstAmount = isIntraState ? totalGst / 2 : 0;
  const sgstAmount = isIntraState ? totalGst / 2 : 0;
  const igstAmount = !isIntraState ? totalGst : 0;

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
              <h3>Deliverable Order Invoice & Shipping Label</h3>
              <p>Olympic Foods & Essentials • Brand: Kabgeer Masale</p>
            </div>
          </div>

          <div className="thermal-controls-right">
            {/* Format Toggle Buttons */}
            <div className="format-toggle-group">
              <button
                type="button"
                className={`format-btn ${printFormat === 'invoice' ? 'active' : ''}`}
                onClick={() => setPrintFormat('invoice')}
                title="Full A4 Executive Commercial Tax Invoice"
              >
                <FileText size={14} /> 📄 Premium A4 Tax Invoice
              </button>
              <button
                type="button"
                className={`format-btn ${printFormat === 'thermal' ? 'active' : ''}`}
                onClick={() => setPrintFormat('thermal')}
                title="Direct Thermal 4x6 inch Sticker Label"
              >
                <Tag size={14} /> 🏷️ 4"x6" Thermal Sticker
              </button>
            </div>

            <button
              type="button"
              className="btn-print-action"
              onClick={handleTriggerPrint}
            >
              <Printer size={16} /> Print Document
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
            <label>AWB / Consignment No.:</label>
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
            <span>Total Units: <strong>{totalQty} items</strong></span>
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
                
                {/* 1. Header with Brand, Seller Entity & Credentials */}
                <div className="t-row t-header">
                  <div className="t-brand-col">
                    <div className="t-company-name">OLYMPIC FOODS AND ESSENTIALS</div>
                    <div className="t-tagline">Brand: <strong>KABGEER MASALE</strong></div>
                    <div className="t-origin-city">Kanpur / Lucknow, U.P. - 208010 • Ph: 8090086636</div>
                    <div className="t-credentials-line">
                      <span>GSTIN: <strong>09DZXPM8025C1ZV</strong></span>
                      <span> | FSSAI: <strong>12723045000296</strong></span>
                    </div>
                  </div>
                  <div className="t-courier-badge-col">
                    <div className="t-courier-name">{courierName.toUpperCase()}</div>
                    <div className={`t-payment-pill ${isPrepaid ? 'pill-prepaid' : 'pill-cod'}`}>
                      {isPrepaid ? 'PREPAID - DO NOT COLLECT CASH' : 'COD - COLLECT CASH'}
                    </div>
                  </div>
                </div>

                {/* 2. Order ID, Barcode & Routing */}
                <div className="t-row t-barcode-section">
                  <div className="t-barcode-meta">
                    <span className="t-meta-label">ORDER / INVOICE NO:</span>
                    <span className="t-order-id-val">#{displayOrderId}</span>
                    <span className="t-date-val">{formattedDate}</span>
                  </div>
                  <SvgBarcode value={awbNumber || displayOrderId} height={34} />
                  {awbNumber && (
                    <div className="t-awb-subtext">
                      AWB / CONSIGNMENT NO: <strong>{awbNumber}</strong>
                    </div>
                  )}
                </div>

                {/* 3. SHIP TO / Consignee Destination Box */}
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

                {/* 4. Manifest / Items Breakdown with HSN */}
                <div className="t-row t-items-section">
                  <div className="t-items-header">
                    <span>ITEM DESCRIPTION (HSN: 09109990)</span>
                    <span>QTY</span>
                    <span>AMOUNT</span>
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
                    <div className="t-subtotal">Taxable Value: ₹{taxableSubtotal.toFixed(0)}</div>
                    <div className="t-gst">GST (5% Inclusive): ₹{totalGst.toFixed(0)}</div>
                    <div className="t-shipping">Shipping: {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(0)}`}</div>
                  </div>
                  <div className="t-grand-total">
                    <span className="t-total-label">TOTAL PAID:</span>
                    <span className="t-total-val">₹{totalAmount.toFixed(0)}</span>
                  </div>
                </div>

                {/* 6. Return Address & Official Registered Details */}
                <div className="t-row t-return-footer">
                  <div className="t-return-title">IF UNDELIVERED, PLEASE RETURN TO:</div>
                  <div className="t-return-details">
                    <strong>OLYMPIC FOODS AND ESSENTIALS</strong> (Brand: <strong>KABGEER</strong>)<br />
                    Plot No 664K, Tadbagiya, Wajidpur, Jajmau, Kanpur, U.P. - 208010<br />
                    Phone: <strong>8090086636 / 9619696507</strong> | MSME: UDYAM-UP-43-0057977
                  </div>
                  <div className="t-fssai-stamp">
                    ✓ FSSAI NO: 12723045000296 • 100% PURE & NATURAL AWADHI SPICES • GST INCLUSIVE
                  </div>
                </div>

              </div>
            ) : (
              /* =========================================================
                 2. PREMIUM EXECUTIVE A4 COMMERCIAL TAX INVOICE
                 ========================================================= */
              <div className="invoice-a4-card">
                
                {/* 1. Header Section with Brand Logo, Entity & Invoice Number */}
                <div className="a4-header-row">
                  <div className="a4-brand-identity">
                    <img src={logo} alt="Kabgeer Masale Logo" className="a4-brand-logo-img" />
                    <div className="a4-brand-text-col">
                      <div className="a4-entity-name">OLYMPIC FOODS AND ESSENTIALS</div>
                      <div className="a4-brand-subheading">
                        Brand: <span className="a4-brand-highlight">KABGEER MASALE</span>
                      </div>
                      <div className="a4-address-text">
                        Plot No 664K, Tadbagiya, Wajidpur, Jajmau, Kanpur, U.P. - 208010
                      </div>
                      <div className="a4-contact-text">
                        Phone: <strong>+91-80900-86636 / 9619696507</strong> • Email: <strong>enquiry@kabgeermasala.com</strong>
                      </div>
                    </div>
                  </div>

                  <div className="a4-invoice-meta-badge-box">
                    <div className="a4-invoice-type-tag">TAX INVOICE</div>
                    <div className="a4-inv-number-row">
                      <span className="a4-inv-label">Invoice No:</span>
                      <span className="a4-inv-number-val">OFE/{displayOrderId}</span>
                    </div>
                    <div className="a4-inv-date-row">
                      <span className="a4-inv-label">Invoice Date:</span>
                      <span className="a4-inv-date-val">{formattedDate}</span>
                    </div>
                    <div className="a4-inv-barcode-wrapper">
                      <SvgBarcode value={awbNumber || displayOrderId} height={26} showText={false} />
                    </div>
                  </div>
                </div>

                {/* 2. Official Statutory Credentials Strip */}
                <div className="a4-statutory-strip">
                  <div className="a4-stat-item">
                    <span className="a4-stat-label">GSTIN:</span>
                    <span className="a4-stat-val">09DZXPM8025C1ZV</span>
                  </div>
                  <div className="a4-stat-divider" />
                  <div className="a4-stat-item">
                    <span className="a4-stat-label">FSSAI NO:</span>
                    <span className="a4-stat-val">12723045000296</span>
                  </div>
                  <div className="a4-stat-divider" />
                  <div className="a4-stat-item">
                    <span className="a4-stat-label">MSME REG:</span>
                    <span className="a4-stat-val">UDYAM-UP-43-0057977</span>
                  </div>
                  <div className="a4-stat-divider" />
                  <div className="a4-stat-item">
                    <span className="a4-stat-label">ORIGIN:</span>
                    <span className="a4-stat-val">INDIA</span>
                  </div>
                </div>

                {/* 3. Billed To (Buyer) & Shipping Details Grid */}
                <div className="a4-parties-grid">
                  
                  {/* Buyer / Consignee Card */}
                  <div className="a4-party-card a4-buyer-card">
                    <div className="a4-card-header">
                      <MapPin size={13} />
                      <span>BILLED TO / SHIP TO (CONSIGNEE)</span>
                    </div>
                    <div className="a4-card-body">
                      <div className="a4-customer-name-heading">{customerName}</div>
                      <div className="a4-address-lines">
                        {addr.address || 'Address provided during online checkout'}
                        {addr.apartment ? `, ${addr.apartment}` : ''}
                      </div>
                      <div className="a4-address-city">
                        {addr.city ? `${addr.city}, ` : ''}{addr.state || ''} - <strong className="a4-pin-highlight">{addr.pinCode || '—'}</strong>
                      </div>
                      <div className="a4-contact-meta">
                        <div><strong>Phone:</strong> {customerPhone}</div>
                        <div><strong>Email:</strong> {customerEmail}</div>
                      </div>
                      <div className="a4-payment-status-pill">
                        <span className={isPrepaid ? 'pill-paid' : 'pill-unpaid'}>
                          {isPrepaid ? '✓ PREPAID ONLINE (RAZORPAY)' : 'CASH ON DELIVERY (COD)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping & Dispatch Card */}
                  <div className="a4-party-card a4-shipping-card">
                    <div className="a4-card-header">
                      <Truck size={13} />
                      <span>DISPATCH & LOGISTICS ROUTE</span>
                    </div>
                    <div className="a4-card-body">
                      <table className="a4-keyvalue-table">
                        <tbody>
                          <tr>
                            <td><strong>Courier Partner:</strong></td>
                            <td>{courierName}</td>
                          </tr>
                          {awbNumber && (
                            <tr>
                              <td><strong>AWB / Consignment:</strong></td>
                              <td className="monospace font-bold">{awbNumber}</td>
                            </tr>
                          )}
                          <tr>
                            <td><strong>Destination City:</strong></td>
                            <td className="font-bold">{(addr.city || 'INDIA').toUpperCase()}</td>
                          </tr>
                          <tr>
                            <td><strong>State Code / Region:</strong></td>
                            <td>{addr.state || 'UTTAR PRADESH'} {isIntraState ? '(Intra-State UP)' : '(Inter-State)'}</td>
                          </tr>
                          <tr>
                            <td><strong>Dispatch Hub:</strong></td>
                            <td>Kanpur / Lucknow Central Hub, UP</td>
                          </tr>
                          <tr>
                            <td><strong>Nature of Supply:</strong></td>
                            <td>B2C E-Commerce / Consumer Goods</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* 4. Itemized Product Table */}
                <div className="a4-table-wrapper">
                  <table className="a4-invoice-table">
                    <thead>
                      <tr>
                        <th style={{ width: '38px', textAlign: 'center' }}>#</th>
                        <th>Item Description & Spice Formulation</th>
                        <th style={{ width: '85px', textAlign: 'center' }}>HSN Code</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>MRP (₹)</th>
                        <th style={{ width: '48px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Taxable Val</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>{isIntraState ? 'GST (5%)' : 'IGST (5%)'}</th>
                        <th style={{ width: '95px', textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const itemTotal = Number(item.total_price) || (Number(item.unit_price) * item.quantity);
                        const unitRate = Number(item.unit_price) || (itemTotal / item.quantity);
                        const itemTaxable = itemTotal / 1.05;
                        const itemGst = itemTotal - itemTaxable;

                        return (
                          <tr key={item.id || index}>
                            <td style={{ textAlign: 'center' }} className="a4-cell-idx">{index + 1}</td>
                            <td>
                              <div className="a4-item-title">{item.product_name}</div>
                              <div className="a4-item-subtitle">Authentic Royal Lucknowi Spice Formulation • 100% Pure</div>
                            </td>
                            <td style={{ textAlign: 'center' }} className="monospace a4-hsn-cell">09109990</td>
                            <td style={{ textAlign: 'center' }}>₹{unitRate.toFixed(0)}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }} className="a4-qty-cell">{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>₹{(unitRate / 1.05).toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{itemTaxable.toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>₹{itemGst.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }} className="a4-amount-cell">₹{itemTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}

                      {shippingFee > 0 && (
                        <tr className="a4-shipping-row">
                          <td style={{ textAlign: 'center' }} className="a4-cell-idx">{items.length + 1}</td>
                          <td>
                            <div className="a4-item-title">Express Courier Shipping & Packaging</div>
                            <div className="a4-item-subtitle">Safe doorstep parcel delivery</div>
                          </td>
                          <td style={{ textAlign: 'center' }} className="monospace a4-hsn-cell">996812</td>
                          <td style={{ textAlign: 'center' }}>₹{shippingFee.toFixed(0)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>1</td>
                          <td style={{ textAlign: 'right' }}>₹{(shippingFee / 1.05).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>₹{(shippingFee / 1.05).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>₹{(shippingFee - (shippingFee / 1.05)).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }} className="a4-amount-cell">₹{shippingFee.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="a4-table-footer-row">
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL:</td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>{totalQty + (shippingFee > 0 ? 1 : 0)}</td>
                        <td></td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{taxableSubtotal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{totalGst.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.95rem' }} className="a4-final-cell">₹{totalAmount.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 5. Bottom Section: Words, Banking, Terms & Signatory */}
                <div className="a4-bottom-wrapper">
                  
                  {/* Left Column: Words, Bank & Terms */}
                  <div className="a4-bottom-left-col">
                    
                    {/* Amount in Words */}
                    <div className="a4-words-panel">
                      <span className="a4-words-title">AMOUNT IN WORDS:</span>
                      <span className="a4-words-content">{numberToWordsIndian(totalAmount)}</span>
                    </div>

                    {/* Bank Details Card */}
                    <div className="a4-bank-details-card">
                      <div className="a4-bank-header">
                        <CreditCard size={12} />
                        <span>COMPANY'S BANK DETAILS (FOR NEFT / RTGS)</span>
                      </div>
                      <div className="a4-bank-grid">
                        <div><strong>A/c Holder:</strong> OLYMPIC FOODS AND ESSENTIALS</div>
                        <div><strong>Bank Name:</strong> UCO BANK</div>
                        <div><strong>Account No:</strong> <span className="monospace font-bold">16310510001257</span></div>
                        <div><strong>IFSC Code:</strong> <span className="monospace font-bold">UCBA0001631</span></div>
                        <div><strong>Branch:</strong> DEFENCE COLONY, KANPUR</div>
                      </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="a4-terms-card">
                      <div className="a4-terms-header">TERMS & CONDITIONS:</div>
                      <ol className="a4-terms-list">
                        <li>All products are inclusive of applicable GST (5% on spice blends).</li>
                        <li>Garlic Powder is an exempted category with 0% GST tax rate.</li>
                        <li>All disputes are subject to Kanpur Jurisdiction only.</li>
                        <li>Any physical defect or transit discrepancy must be reported within 7 days of delivery.</li>
                      </ol>
                    </div>

                  </div>

                  {/* Right Column: Financial Summary & Authorized Signature */}
                  <div className="a4-bottom-right-col">
                    
                    {/* Financial Summary Card */}
                    <div className="a4-financial-summary-card">
                      <div className="a4-fin-row">
                        <span>Items Subtotal:</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="a4-fin-row a4-fin-discount">
                          <span>Special Discount:</span>
                          <span>-₹{discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="a4-fin-row">
                        <span>Taxable Value:</span>
                        <span>₹{taxableSubtotal.toFixed(2)}</span>
                      </div>
                      {isIntraState ? (
                        <>
                          <div className="a4-fin-row a4-fin-tax">
                            <span>CGST (2.5%):</span>
                            <span>₹{cgstAmount.toFixed(2)}</span>
                          </div>
                          <div className="a4-fin-row a4-fin-tax">
                            <span>SGST (2.5%):</span>
                            <span>₹{sgstAmount.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="a4-fin-row a4-fin-tax">
                          <span>IGST (5.0%):</span>
                          <span>₹{igstAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="a4-fin-row">
                        <span>Shipping & Handling:</span>
                        <span>{shippingFee === 0 ? 'FREE' : `+₹${shippingFee.toFixed(2)}`}</span>
                      </div>
                      <div className="a4-grand-total-row">
                        <span>GRAND TOTAL:</span>
                        <span>₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Authorized Signatory Box */}
                    <div className="a4-signatory-box">
                      <div className="a4-for-entity">For OLYMPIC FOODS AND ESSENTIALS</div>
                      <div className="a4-sign-stamp-area">
                        <div className="a4-seal-badge">
                          <span>OLYMPIC FOODS & ESSENTIALS</span>
                          <small>✓ Authorized Commercial Signatory</small>
                        </div>
                      </div>
                      <div className="a4-auth-title">AUTHORIZED SIGNATORY</div>
                    </div>

                  </div>

                </div>

                {/* 6. Footer Royal Note */}
                <div className="a4-footer-banner">
                  <span>Thank you for choosing <strong>Kabgeer Masale</strong> • Crafted with love from the royal kitchens of Lucknow.</span>
                  <span>Website: <strong>www.kabgeermasala.com</strong> • Care: <strong>+91-80900-86636</strong></span>
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
