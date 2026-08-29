import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Package, 
  LogOut, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  LogIn, 
  Crown, 
  Sparkles, 
  MapPin, 
  Truck, 
  Award, 
  CheckCircle2, 
  Mail, 
  Phone,
  RotateCcw,
  Gift
} from 'lucide-react';
import './ProfilePage.css';

const formatISTDateTime = (isoString) => {
  if (!isoString) return 'Recent';
  try {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return 'Recent';
  }
};

const ProfilePage = () => {
  const { user, orders, logout, isAdmin } = useAuth();
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  const getStatusClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('paid') || s.includes('delivered') || s.includes('confirmed')) return 'status-paid';
    if (s.includes('shipped') || s.includes('processing')) return 'status-shipped';
    if (s.includes('pending')) return 'status-pending';
    if (s.includes('failed') || s.includes('cancelled')) return 'status-failed';
    return 'status-paid';
  };

  // Guest State: If not logged in, display a regal sign-in invitation card
  if (!user) {
    return (
      <div className="account-page-wrapper">
        <div className="account-container guest-container">
          <div className="guest-card">
            <div className="guest-crest-wrap">
              <Crown size={32} color="#d4af37" />
            </div>
            <span className="guest-badge">ROYAL PATRON ACCESS</span>
            <h1 className="guest-title">Welcome to Kabgeer</h1>
            <p className="guest-desc">
              Sign in to your royal account to view past spice purchases, track your authentic Lucknavi blends, and access exclusive bundle savings.
            </p>
            <div className="guest-actions">
              <Link to="/login" className="btn-guest-login">
                <LogIn size={18} /> Sign In to Your Account
              </Link>
              <Link to="/products" className="btn-guest-browse">
                <ShoppingBag size={18} /> Explore Masala Collection
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const customerName = user.name || 'Royal Patron';
  const customerEmail = user.email || '';
  const customerInitial = customerName ? customerName.charAt(0).toUpperCase() : 'K';
  const ordersCount = orders ? orders.length : 0;

  // Extract latest address if available
  const latestOrderWithAddress = orders && orders.length > 0
    ? orders.find(o => o.shipping_address || o.shippingDetails)
    : null;
  const defaultAddress = latestOrderWithAddress 
    ? (latestOrderWithAddress.shipping_address || latestOrderWithAddress.shippingDetails)
    : null;

  return (
    <div className="account-page-wrapper">
      <div className="account-container">
        
        {/* Admin Portal Quick Access Banner (if user has admin role) */}
        {isAdmin && (
          <div className="admin-access-ribbon">
            <div className="admin-ribbon-left">
              <ShieldCheck size={24} color="#d4af37" />
              <div>
                <strong>Store Administrator Access</strong>
                <span>You have permissions to manage store orders, stock, and fulfillment.</span>
              </div>
            </div>
            <Link to="/admin" className="btn-admin-launch">
              Launch Admin Dashboard <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* 1. Royal Patron Hero Card */}
        <div className="royal-patron-hero">
          <div className="patron-hero-main">
            
            <div className="patron-crest-avatar">
              <span className="crest-letter">{customerInitial}</span>
              <div className="crest-crown-badge">
                <Crown size={14} />
              </div>
            </div>

            <div className="patron-hero-details">
              <div className="patron-tier-badge">
                <Sparkles size={13} /> {isAdmin ? 'MASTER HERITAGE ADMIN' : 'LUCKNAVI SPICE CONNOISSEUR'}
              </div>
              <h1 className="patron-greeting">Welcome, {customerName}</h1>
              <div className="patron-meta-row">
                <span className="patron-email"><Mail size={14} /> {customerEmail}</span>
                <span className="patron-verified"><CheckCircle2 size={14} /> Verified Member</span>
              </div>
            </div>

          </div>

          <div className="patron-hero-actions">
            <button 
              type="button"
              className="btn-patron-logout" 
              onClick={logout}
              aria-label="Sign out of your account"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* 2. VIP Patron Privileges Strip */}
        <div className="patron-privileges-strip">
          <div className="privilege-item">
            <div className="privilege-icon"><Package size={18} /></div>
            <div>
              <strong>{ordersCount} {ordersCount === 1 ? 'Order' : 'Orders'} Placed</strong>
              <span>Authentic Lucknavi Blends</span>
            </div>
          </div>

          <div className="privilege-item">
            <div className="privilege-icon"><Truck size={18} /></div>
            <div>
              <strong>Free Express Shipping</strong>
              <span>On orders above ₹399</span>
            </div>
          </div>

          <div className="privilege-item">
            <div className="privilege-icon"><Gift size={18} /></div>
            <div>
              <strong>10% Bundle Privilege</strong>
              <span>Auto-applied in Bundle Builder</span>
            </div>
          </div>

          <div className="privilege-item">
            <div className="privilege-icon"><Award size={18} /></div>
            <div>
              <strong>65-Year Purity Seal</strong>
              <span>100% Pure, Zero Preservatives</span>
            </div>
          </div>
        </div>

        {/* 3. Main Dashboard Layout Grid */}
        <div className="account-layout-grid">
          
          {/* Left Column: Profile & Concierge Sidebar */}
          <div className="account-sidebar-col">
            
            {/* Delivery Destination Card */}
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <MapPin size={18} className="gold-accent" />
                <h3>Delivery Address</h3>
              </div>
              {defaultAddress ? (
                <div className="saved-address-content">
                  <strong>{defaultAddress.firstName} {defaultAddress.lastName}</strong>
                  <p>{defaultAddress.address}{defaultAddress.apartment ? `, ${defaultAddress.apartment}` : ''}</p>
                  <p>{defaultAddress.city}, {defaultAddress.state} - {defaultAddress.pinCode}</p>
                  {defaultAddress.phone && <p className="address-phone"><Phone size={13} /> {defaultAddress.phone}</p>}
                </div>
              ) : (
                <div className="empty-address-hint">
                  <p>Your delivery address will automatically be saved upon placing your first order.</p>
                </div>
              )}
            </div>

            {/* Royal Concierge Support Card */}
            <div className="sidebar-card concierge-card">
              <div className="sidebar-card-header">
                <Sparkles size={18} className="gold-accent" />
                <h3>Royal Concierge</h3>
              </div>
              <p className="concierge-desc">
                Need recipe advice, custom bulk quantities, or order assistance? Our team in Lucknow is here to assist you.
              </p>
              <div className="concierge-links">
                <a href="https://wa.me/919082730822" target="_blank" rel="noopener noreferrer" className="concierge-btn whatsapp-btn">
                  💬 WhatsApp Support
                </a>
                <a href="mailto:olympic.kabgeer@gmail.com" className="concierge-btn email-btn">
                  <Mail size={14} /> Email Concierge
                </a>
              </div>
            </div>

            {/* Quick Box Builder Promo */}
            <div className="sidebar-card bundle-promo-card">
              <Crown size={22} className="gold-accent mb-1" />
              <h3>Craft Your Custom Box</h3>
              <p>Pick any 3+ spice blends and enjoy flat 10% OFF with luxury gift packaging.</p>
              <Link to="/bundle" className="btn-sidebar-bundle">
                Open Bundle Builder <ArrowRight size={14} />
              </Link>
            </div>

          </div>

          {/* Right Column: Order History Section */}
          <div className="account-main-col">
            <div className="orders-section-card">
              
              <div className="orders-section-header">
                <div className="header-title-wrap">
                  <h2>Royal Order History</h2>
                  <span className="orders-count-pill">
                    {ordersCount} {ordersCount === 1 ? 'Order' : 'Orders'}
                  </span>
                </div>
                <Link to="/products" className="btn-browse-masalas-link">
                  Browse Spices <ArrowRight size={14} />
                </Link>
              </div>

              {!orders || orders.length === 0 ? (
                <div className="empty-orders-experience">
                  <div className="empty-casket-icon">
                    <Package size={48} />
                  </div>
                  <h3>Your Spice Casket is Empty</h3>
                  <p>
                    You haven't placed any spice orders yet. Start your royal culinary journey with our 65-year-old Lucknowi secret recipes.
                  </p>
                  <div className="empty-orders-actions">
                    <Link to="/bundle" className="btn-empty-bundle">
                      <Sparkles size={16} /> Build Your Custom Box (Save 10%)
                    </Link>
                    <Link to="/products" className="btn-empty-catalogue">
                      <ShoppingBag size={16} /> Explore All 25 Masalas
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="orders-timeline-list">
                  {orders.map((order) => {
                    const orderId = order.display_order_id || order.id;
                    const isExpanded = expandedOrderId === orderId;
                    const items = order.items || order.order_items || [];
                    const orderDate = order.date || order.created_at;
                    const formattedDate = formatISTDateTime(orderDate);

                    const paymentStatus = order.payment_status || 'Paid';
                    const orderStatus = order.order_status || order.status || 'Confirmed';
                    const totalAmount = Number(order.total || order.total_amount || 0);
                    const shipping = order.shipping_address || (order.shippingDetails ? order.shippingDetails : null);

                    return (
                      <div key={orderId} className={`order-casket-card ${isExpanded ? 'expanded' : ''}`}>
                        
                        {/* Order Header Summary Bar */}
                        <div className="order-casket-header">
                          <div className="order-id-date-col">
                            <div className="order-id-row">
                              <span className="order-id-tag">Order #{orderId}</span>
                              <span className={`status-pill ${getStatusClass(paymentStatus)}`}>
                                <CheckCircle2 size={12} /> {paymentStatus}
                              </span>
                              <span className={`status-pill ${getStatusClass(orderStatus)}`}>
                                {orderStatus}
                              </span>
                            </div>
                            <span className="order-placed-timestamp">Placed on {formattedDate}</span>
                          </div>

                          <div className="order-price-col">
                            <span className="order-grand-total">₹{totalAmount.toFixed(2)}</span>
                            <span className="order-items-count-text">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                          </div>
                        </div>

                        {/* Spice Package Thumbnails Preview Strip */}
                        <div className="order-spice-strip">
                          <div className="spice-thumbs-list">
                            {items.slice(0, 4).map((item, idx) => (
                              <div key={idx} className="spice-thumb-wrapper" title={item.name || item.product_name}>
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="spice-thumb-img" />
                                ) : (
                                  <div className="spice-thumb-fallback">
                                    <Package size={18} />
                                  </div>
                                )}
                                {item.quantity > 1 && (
                                  <span className="spice-qty-badge">x{item.quantity}</span>
                                )}
                              </div>
                            ))}
                            {items.length > 4 && (
                              <div className="spice-more-badge">+{items.length - 4} more</div>
                            )}
                          </div>

                          <button
                            type="button"
                            className="btn-order-casket-toggle"
                            onClick={() => toggleOrderDetails(orderId)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <>Close Details <ChevronUp size={15} /></>
                            ) : (
                              <>View Order Breakdown <ChevronDown size={15} /></>
                            )}
                          </button>
                        </div>

                        {/* Expandable Order Breakdown & Address */}
                        {isExpanded && (
                          <div className="order-casket-drawer">
                            
                            <h4 className="drawer-subheading">Itemized Spice Selection</h4>
                            <div className="drawer-items-list">
                              {items.map((item, idx) => {
                                const unitPrice = Number(item.price || item.unit_price) || 0;
                                const qty = item.quantity || 1;
                                const itemTotal = unitPrice * qty;

                                return (
                                  <div key={item.id || idx} className="drawer-item-row">
                                    <div className="drawer-item-left">
                                      {item.image && (
                                        <img src={item.image} alt={item.name} className="drawer-item-img" />
                                      )}
                                      <div>
                                        <h5 className="drawer-item-name">{item.name || item.product_name}</h5>
                                        <div className="drawer-item-meta">
                                          {item.weight && <span className="drawer-item-weight">{item.weight}</span>}
                                          <span>Qty: {qty} × ₹{unitPrice.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="drawer-item-total">₹{itemTotal.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {shipping && (
                              <div className="drawer-shipping-destination">
                                <div className="shipping-title-row">
                                  <MapPin size={16} className="gold-accent" />
                                  <strong>Delivery Destination</strong>
                                </div>
                                <p className="recipient-name">{shipping.firstName} {shipping.lastName}</p>
                                <p className="recipient-address">{shipping.address}{shipping.apartment ? `, ${shipping.apartment}` : ''}</p>
                                <p className="recipient-city">{shipping.city}, {shipping.state} - {shipping.pinCode}</p>
                                {shipping.phone && <p className="recipient-phone"><Phone size={13} /> {shipping.phone}</p>}
                              </div>
                            )}

                            <div className="drawer-footer-actions">
                              <Link to="/bundle" className="btn-drawer-reorder">
                                <RotateCcw size={15} /> Order More Blends
                              </Link>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
