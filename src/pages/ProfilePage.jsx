import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Package, LogOut, ChevronDown, ChevronUp, ShoppingBag, ArrowRight } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, orders, logout, isAdmin } = useAuth();
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins are redirected directly to the Admin Dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  const getStatusClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('paid') || s.includes('delivered') || s.includes('confirmed')) return 'status-paid';
    if (s.includes('shipped') || s.includes('processing')) return 'status-shipped';
    if (s.includes('pending')) return 'status-pending';
    if (s.includes('failed') || s.includes('cancelled')) return 'status-failed';
    return 'status-shipped';
  };

  const customerName = user.name || 'Valued Customer';
  const customerEmail = user.email || '';
  const customerInitial = customerName ? customerName.charAt(0).toUpperCase() : 'C';

  return (
    <div className="account-page-wrapper">
      <div className="account-container">
        
        {/* Page Header */}
        <div className="account-page-header">
          <h1>My Account</h1>
          <p>Manage your account profile and view your past Lucknavi masala orders.</p>
        </div>

        <div className="account-layout-grid">
          
          {/* 1. Account Details Card */}
          <div className="account-card">
            <div className="account-avatar-wrapper">
              {customerInitial}
            </div>
            
            <div className="account-info-group">
              <h3 className="account-customer-name">{customerName}</h3>
              <p className="account-customer-email">{customerEmail}</p>
            </div>

            <hr className="account-card-divider" />

            <button 
              type="button"
              className="btn-account-logout" 
              onClick={logout}
              aria-label="Sign out of your account"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>

          {/* 2. My Orders Section */}
          <div className="orders-section">
            <div className="orders-section-header">
              <h2>Order History</h2>
              <span className="orders-count-badge">
                {orders ? `${orders.length} ${orders.length === 1 ? 'Order' : 'Orders'}` : '0 Orders'}
              </span>
            </div>

            {!orders || orders.length === 0 ? (
              <div className="empty-orders-card">
                <Package size={52} className="empty-orders-icon" />
                <h3>No orders yet</h3>
                <p>Looks like you haven't made your first purchase yet. Explore our authentic royal masalas.</p>
                <Link to="/products" className="btn-start-shopping">
                  <ShoppingBag size={16} /> Explore Masalas <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => {
                  const orderId = order.display_order_id || order.id;
                  const isExpanded = expandedOrderId === orderId;
                  const items = order.items || order.order_items || [];
                  const formatISTDateTime = (isoString) => {
                    if (!isoString) return 'Recent';
                    try {
                      const d = new Date(isoString);
                      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
                      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
                      return `${dateStr} at ${timeStr}`;
                    } catch {
                      return 'Recent';
                    }
                  };

                  const formattedDate = formatISTDateTime(orderDate);

                  const paymentStatus = order.payment_status || 'Paid';
                  const orderStatus = order.order_status || order.status || 'Confirmed';
                  const totalAmount = Number(order.total || order.total_amount || 0);

                  const shipping = order.shipping_address || (order.shippingDetails ? order.shippingDetails : null);

                  return (
                    <div key={orderId} className="order-card">
                      {/* Order Header */}
                      <div className="order-card-header">
                        <div className="order-meta-group">
                          <span className="order-display-id">Order #{orderId}</span>
                          <span className="order-date">Placed on {formattedDate}</span>
                        </div>
                        <div className="order-badges-group">
                          <span className={`status-pill ${getStatusClass(paymentStatus)}`}>
                            {paymentStatus}
                          </span>
                          <span className={`status-pill ${getStatusClass(orderStatus)}`}>
                            {orderStatus}
                          </span>
                        </div>
                      </div>

                      {/* Order Summary Body */}
                      <div className="order-card-body">
                        <div className="order-summary-row">
                          <span className="order-items-summary-text">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                          </span>
                          <span className="order-total-amount">₹{totalAmount.toFixed(2)}</span>
                        </div>

                        <button
                          type="button"
                          className="btn-toggle-order-details"
                          onClick={() => toggleOrderDetails(orderId)}
                        >
                          {isExpanded ? (
                            <>Hide Details <ChevronUp size={16} /></>
                          ) : (
                            <>View Order Details <ChevronDown size={16} /></>
                          )}
                        </button>

                        {/* Expandable Order Details */}
                        {isExpanded && (
                          <div className="order-expanded-details">
                            <div className="order-items-table">
                              {items.map((item, idx) => (
                                <div key={item.id || idx} className="order-item-detail-row">
                                  <div className="order-item-left">
                                    {item.image && (
                                      <img src={item.image} alt={item.name} className="order-item-thumb" />
                                    )}
                                    <div className="order-item-title-col">
                                      <span className="order-item-name">{item.name || item.product_name}</span>
                                      <span className="order-item-qty">Qty: {item.quantity}</span>
                                    </div>
                                  </div>
                                  <span className="order-item-price">
                                    ₹{((Number(item.price || item.unit_price) || 0) * (item.quantity || 1)).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {shipping && (
                              <div className="order-shipping-box">
                                <strong>Delivery Address:</strong>
                                <div>{shipping.firstName} {shipping.lastName}</div>
                                <div>{shipping.address}{shipping.apartment ? `, ${shipping.apartment}` : ''}</div>
                                <div>{shipping.city}, {shipping.state} - {shipping.pinCode}</div>
                                {shipping.phone && <div>Phone: {shipping.phone}</div>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
