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
  const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' (4x6 sticker) or 'invoice' (A4)
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
              <h3>Production Ready Order Bill & Shipping Label</h3>
              <p>Official Olympic Foods and Essentials / Kabgeer Format</p>
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
                <Tag size={14} /> 🏷️ 4"x6" Thermal Sticker
              </button>
              <button
                type="button"
                className={`format-btn ${printFormat === 'invoice' ? 'active' : ''}`}
                onClick={() => setPrintFormat('invoice')}
                title="Full A4 Commercial Tax Invoice"
              >
                <FileText size={14} /> 📄 A4 Tax Invoice
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
                 2. FULL A4 COMMERCIAL TAX INVOICE (OFFICIAL OFE/KABGEER FORMAT)
                 ========================================================= */
              <div className="invoice-a4-card">
                
                {/* Invoice Top Title */}
                <div className="inv-top-bar">
                  <h2 className="inv-main-heading">TAX INVOICE</h2>
                </div>

                {/* Seller & Header Box */}
                <div className="inv-seller-banner">
                  <div className="inv-seller-brand">
                    <div className="inv-company-title">OLYMPIC FOODS AND ESSENTIALS</div>
                    <div className="inv-company-address">
                      Plot No 664K, TADBAGIYA, WAJIDPUR, JAJMAU, KANPUR, U.P. - 208010
                    </div>
                    <div className="inv-company-contact">
                      Phone no. - 8090086636 / 9619696507 | MSME No.: UDYAM-UP-43-0057977
                    </div>
                    <div className="inv-company-brand-badge">
                      Brand: <strong>KABGEER</strong>
                    </div>
                  </div>
                </div>

                {/* GSTIN & FSSAI Sub-Bar */}
                <div className="inv-legal-row">
                  <div><strong>GSTIN - 09DZXPM8025C1ZV</strong></div>
                  <div><strong>FSSAI No - 12723045000296</strong></div>
                </div>

                {/* Buyer & Invoice Meta 3-Column Grid */}
                <div className="inv-meta-three-col">
                  {/* Buyer */}
                  <div className="inv-col-buyer">
                    <div className="inv-col-heading">Buyer:</div>
                    <div className="inv-col-content">
                      <div className="inv-buyer-name">{customerName}</div>
                      <div>{addr.address || 'Address on file'}</div>
                      {addr.apartment && <div>{addr.apartment}</div>}
                      <div>{addr.city ? `${addr.city}, ` : ''}{addr.state || ''} - <strong>{addr.pinCode || '—'}</strong></div>
                      <div>{addr.country || 'India'}</div>
                      <div>Mob: <strong>{customerPhone}</strong></div>
                      <div>Email: {customerEmail}</div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="inv-col-delivery">
                    <div className="inv-col-heading">Delivery Destination:</div>
                    <div className="inv-col-content">
                      <div className="inv-buyer-name">{customerName}</div>
                      <div>{addr.address || 'Address on file'}</div>
                      {addr.apartment && <div>{addr.apartment}</div>}
                      <div>{addr.city ? `${addr.city}, ` : ''}{addr.state || ''} - <strong>{addr.pinCode || '—'}</strong></div>
                      <div>Courier: <strong>{courierName}</strong></div>
                      {awbNumber && <div>AWB No: <strong>{awbNumber}</strong></div>}
                    </div>
                  </div>

                  {/* Invoice Meta Table */}
                  <div className="inv-col-invoice-meta">
                    <table className="inv-meta-keyvalue">
                      <tbody>
                        <tr>
                          <td><strong>Invoice No:</strong></td>
                          <td className="monospace">OFE/{displayOrderId}</td>
                        </tr>
                        <tr>
                          <td><strong>Bill Date:</strong></td>
                          <td>{formattedDate}</td>
                        </tr>
                        <tr>
                          <td><strong>Time:</strong></td>
                          <td>{formattedDateTime.split(',')[1] || ''}</td>
                        </tr>
                        <tr>
                          <td><strong>Term of Payment:</strong></td>
                          <td>
                            <strong style={{ color: isPrepaid ? '#15803d' : '#b91c1c' }}>
                              {isPrepaid ? 'PREPAID (ONLINE RAZORPAY)' : 'CASH ON DELIVERY'}
                            </strong>
                          </td>
                        </tr>
                        {order.razorpay_order_id && (
                          <tr>
                            <td><strong>Gateway ID:</strong></td>
                            <td className="monospace" style={{ fontSize: '0.72rem' }}>{order.razorpay_order_id}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Country of Origin & Destination Bar */}
                <div className="inv-origin-dest-bar">
                  <div className="inv-origin-box">
                    <span>Country Of Origin</span>
                    <strong>INDIA</strong>
                  </div>
                  <div className="inv-dest-box">
                    <span>Destination</span>
                    <strong>{(addr.city || 'INDIA').toUpperCase()}</strong>
                  </div>
                </div>

                {/* Official Tax Invoice Table */}
                <table className="inv-table-official">
                  <thead>
                    <tr>
                      <th style={{ width: '35px', textAlign: 'center' }}>S. No</th>
                      <th>Item Description & Spice Formulation</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>HSN Code</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>MRP (Rs.)</th>
                      <th style={{ width: '45px', textAlign: 'center' }}>QTY</th>
                      <th style={{ width: '70px', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Taxable Rate</th>
                      <th style={{ width: '70px', textAlign: 'right' }}>{isIntraState ? 'GST (5%)' : 'IGST (5%)'}</th>
                      <th style={{ width: '85px', textAlign: 'right' }}>Amount (₹)</th>
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
                          <td style={{ textAlign: 'center' }}>{index + 1}</td>
                          <td>
                            <strong>{item.product_name}</strong>
                          </td>
                          <td style={{ textAlign: 'center' }} className="monospace">09109990</td>
                          <td style={{ textAlign: 'center' }}>{unitRate.toFixed(0)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{(unitRate / 1.05).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>{itemTaxable.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>{itemGst.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}

                    {shippingFee > 0 && (
                      <tr>
                        <td style={{ textAlign: 'center' }}>{items.length + 1}</td>
                        <td><strong>Express Courier Shipping & Packaging Fee</strong></td>
                        <td style={{ textAlign: 'center' }} className="monospace">996812</td>
                        <td style={{ textAlign: 'center' }}>{shippingFee.toFixed(0)}</td>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td style={{ textAlign: 'right' }}>{(shippingFee / 1.05).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{(shippingFee / 1.05).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{(shippingFee - (shippingFee / 1.05)).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{shippingFee.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="inv-tfoot-row">
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalQty + (shippingFee > 0 ? 1 : 0)}</td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{taxableSubtotal.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalGst.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.95rem' }}>{totalAmount.toFixed(0)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Total Amount in Words Bar */}
                <div className="inv-words-bar">
                  <div className="inv-words-label">Total Amount In Words:</div>
                  <div className="inv-words-string">{numberToWordsIndian(totalAmount)}</div>
                </div>

                {/* Bank Details & Terms Grid */}
                <div className="inv-bottom-grid">
                  <div className="inv-bank-terms-col">
                    {/* Bank Details */}
                    <div className="inv-bank-box">
                      <div className="inv-bank-title">Company's Bank Details:</div>
                      <table className="inv-bank-table">
                        <tbody>
                          <tr>
                            <td>A/c Holder's Name</td>
                            <td>: <strong>OLYMPIC FOODS AND ESSENTIALS</strong></td>
                          </tr>
                          <tr>
                            <td>Bank Name</td>
                            <td>: <strong>UCO BANK</strong></td>
                          </tr>
                          <tr>
                            <td>A/c No.</td>
                            <td>: <strong className="monospace">16310510001257</strong></td>
                          </tr>
                          <tr>
                            <td>IFSC</td>
                            <td>: <strong className="monospace">UCBA0001631</strong></td>
                          </tr>
                          <tr>
                            <td>Branch</td>
                            <td>: <strong>DEFENCE COLONY</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="inv-terms-box">
                      <div className="inv-terms-title">Terms and conditions:</div>
                      <ol className="inv-terms-list">
                        <li>ALL PRODUCTS HAVE GST INCLUSIVE OF 5%</li>
                        <li>GARLIC POWDER IS AN EXEMPTED CATEGORY WITH 0% GST TAX RATE</li>
                        <li>ALL DISPUTES SUBJECT TO KANPUR JURISDICTION ONLY.</li>
                        <li>ANY DEFECT WILL BE ACCEPTED WITHIN 7 DAYS OF BILL DATE.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Signatory Box */}
                  <div className="inv-signatory-col">
                    <div className="inv-sign-for">Signature: FOR OLYMPIC FOODS AND ESSENTIALS</div>
                    <div className="inv-sign-space">
                      <div className="inv-digital-sign-stamp">
                        <span>Olympic Foods & Essentials</span>
                        <small>Authorized Signatory</small>
                      </div>
                    </div>
                    <div className="inv-sign-auth-label">AUTHORIZED SIGNATORY</div>
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
