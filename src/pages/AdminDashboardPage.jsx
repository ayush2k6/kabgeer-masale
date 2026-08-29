import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  IndianRupee, 
  Search, 
  RotateCw, 
  X, 
  ExternalLink, 
  LogOut, 
  User, 
  MapPin, 
  CreditCard,
  AlertCircle
} from 'lucide-react';
import logo from '../assets/logo-header.png';
import './AdminDashboardPage.css';

const ORDER_STATUS_OPTIONS = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled'
];

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Selected Order for Drawer Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newOrderStatus, setNewOrderStatus] = useState('');
  const [statusUpdateMessage, setStatusUpdateMessage] = useState(null);

  // Fetch all orders from Supabase
  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError(err.message || 'Failed to fetch customer orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Set default status when an order is opened
  useEffect(() => {
    if (selectedOrder) {
      setNewOrderStatus(selectedOrder.order_status || 'Pending');
      setStatusUpdateMessage(null);
    }
  }, [selectedOrder]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.order_status === 'Pending' || o.order_status === 'Processing').length;
    const paidOrders = orders.filter(o => o.payment_status === 'Paid').length;
    const deliveredOrders = orders.filter(o => o.order_status === 'Delivered').length;
    const totalSales = orders
      .filter(o => o.payment_status === 'Paid')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    return {
      totalOrders,
      pendingOrders,
      paidOrders,
      deliveredOrders,
      totalSales
    };
  }, [orders]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (order.display_order_id && order.display_order_id.toLowerCase().includes(q)) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(q)) ||
        (order.customer_phone && order.customer_phone.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || order.order_status === statusFilter;
      const matchesPayment = paymentFilter === 'ALL' || order.payment_status === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  // Update Order Fulfillment Status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !newOrderStatus || newOrderStatus === selectedOrder.order_status) return;

    setUpdatingStatus(true);
    setStatusUpdateMessage(null);

    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          order_status: newOrderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (updateErr) throw updateErr;

      // Optimistically update local state
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, order_status: newOrderStatus } : o));
      setSelectedOrder(prev => ({ ...prev, order_status: newOrderStatus }));
      setStatusUpdateMessage({ type: 'success', text: `Status updated to '${newOrderStatus}' successfully!` });
    } catch (err) {
      console.error('Error updating order status:', err);
      setStatusUpdateMessage({ type: 'error', text: err.message || 'Failed to update order status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('paid') || s.includes('delivered') || s.includes('confirmed')) return 'status-paid';
    if (s.includes('shipped') || s.includes('processing')) return 'status-shipped';
    if (s.includes('pending')) return 'status-pending';
    if (s.includes('failed') || s.includes('cancelled')) return 'status-failed';
    return 'status-shipped';
  };

  return (
    <div className="admin-layout">
      
      {/* 1. Admin Navigation Header */}
      <header className="admin-navbar">
        <div className="admin-nav-container">
          <div className="admin-brand-left">
            <img src={logo} alt="Kabgeer Masale" className="admin-brand-logo" />
            <span className="admin-portal-badge">Admin Portal</span>
          </div>

          <div className="admin-nav-right">
            <div className="admin-user-tag">
              <User size={14} />
              <span>Admin: <strong>{user?.email || 'Admin'}</strong></span>
            </div>

            <Link to="/" className="btn-nav-store" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> View Store
            </Link>

            <button type="button" onClick={logout} className="btn-admin-logout" title="Sign Out">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Container */}
      <main className="admin-main-container">
        
        {/* Title and Refresh Row */}
        <div className="admin-page-title-row">
          <div>
            <h1>Orders Management</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Manage customer orders, view line items, and track fulfillment status.
            </p>
          </div>

          <button 
            type="button"
            className="admin-refresh-btn" 
            onClick={fetchAllOrders}
            disabled={loading}
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Orders'}
          </button>
        </div>

        {/* 3. Dashboard KPI Overview Cards */}
        <section className="kpi-metrics-grid" aria-label="Dashboard Overview KPIs">
          <div className="kpi-card">
            <div className="kpi-icon-wrapper kpi-icon-blue">
              <Package size={22} />
            </div>
            <div className="kpi-data-col">
              <span className="kpi-label">Total Orders</span>
              <span className="kpi-value">{metrics.totalOrders}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper kpi-icon-amber">
              <Clock size={22} />
            </div>
            <div className="kpi-data-col">
              <span className="kpi-label">Pending / Processing</span>
              <span className="kpi-value">{metrics.pendingOrders}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper kpi-icon-green">
              <CheckCircle2 size={22} />
            </div>
            <div className="kpi-data-col">
              <span className="kpi-label">Paid Orders</span>
              <span className="kpi-value">{metrics.paidOrders}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper kpi-icon-emerald">
              <Truck size={22} />
            </div>
            <div className="kpi-data-col">
              <span className="kpi-label">Delivered Orders</span>
              <span className="kpi-value">{metrics.deliveredOrders}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper kpi-icon-purple">
              <IndianRupee size={22} />
            </div>
            <div className="kpi-data-col">
              <span className="kpi-label">Total Sales</span>
              <span className="kpi-value">₹{metrics.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        {/* 4. Orders List Table Card */}
        <section className="admin-orders-card">
          
          {/* Search & Filter Header Bar */}
          <div className="admin-orders-header-bar">
            <div className="admin-search-wrapper">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search by Order ID, Name, Email, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />
            </div>

            <div className="admin-filters-row">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-select-filter"
                aria-label="Filter by Order Status"
              >
                <option value="ALL">All Order Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="admin-select-filter"
                aria-label="Filter by Payment Status"
              >
                <option value="ALL">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending / Unpaid</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{ padding: '1.25rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderBottom: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Orders Table */}
          {loading && orders.length === 0 ? (
            <div className="admin-empty-state">
              <RotateCw size={32} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
              <h4>Loading Orders...</h4>
              <p>Fetching latest customer orders from Supabase.</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-empty-state">
              <Package size={42} style={{ margin: '0 auto 0.5rem auto', color: '#cbd5e1' }} />
              <h4>No Orders Found</h4>
              <p>No orders matched your current search or filter criteria.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Order Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const formattedDate = order.created_at
                      ? new Date(order.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—';

                    const isGuest = order.customer_type === 'guest' || !order.customer_id;

                    return (
                      <tr key={order.id}>
                        <td className="order-id-cell">
                          #{order.display_order_id || order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                          {formattedDate}
                        </td>
                        <td>
                          <div className="order-customer-meta">
                            <span className="customer-name">{order.customer_name || 'Customer'}</span>
                            <span className="customer-subtext">{order.customer_email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge-customer-type ${isGuest ? 'badge-guest' : 'badge-registered'}`}>
                            {isGuest ? 'Guest' : 'Registered'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          ₹{(Number(order.total_amount) || 0).toFixed(2)}
                        </td>
                        <td>
                          <span className={`status-pill ${getStatusClass(order.payment_status)}`}>
                            {order.payment_status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${getStatusClass(order.order_status)}`}>
                            {order.order_status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-view-order"
                            onClick={() => setSelectedOrder(order)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* 5. Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="admin-drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="admin-drawer-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div className="admin-drawer-header">
              <div>
                <h3>Order #{selectedOrder.display_order_id || selectedOrder.id}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                className="btn-drawer-close"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="admin-drawer-body">
              
              {/* Status Update Section */}
              <div className="drawer-section" style={{ backgroundColor: '#faf6f0', borderColor: 'rgba(26, 47, 34, 0.15)' }}>
                <div className="drawer-section-title" style={{ color: '#1a2f22' }}>
                  Update Fulfillment Status
                </div>
                
                {statusUpdateMessage && (
                  <div style={{ 
                    padding: '0.6rem 0.85rem', 
                    borderRadius: '6px', 
                    marginBottom: '0.75rem', 
                    fontSize: '0.82rem',
                    backgroundColor: statusUpdateMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: statusUpdateMessage.type === 'success' ? '#15803d' : '#b91c1c'
                  }}>
                    {statusUpdateMessage.text}
                  </div>
                )}

                <form onSubmit={handleUpdateStatus} className="status-update-control-box">
                  <select
                    value={newOrderStatus}
                    onChange={(e) => setNewOrderStatus(e.target.value)}
                    className="status-select-input"
                  >
                    {ORDER_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  
                  <button
                    type="submit"
                    className="btn-save-status"
                    disabled={updatingStatus || newOrderStatus === selectedOrder.order_status}
                  >
                    {updatingStatus ? 'Saving...' : 'Update Status'}
                  </button>
                </form>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
                  Payment status (<strong>{selectedOrder.payment_status}</strong>) is read-only and managed authoritatively by the Razorpay payment gateway.
                </p>
              </div>

              {/* Customer Info */}
              <div className="drawer-section">
                <div className="drawer-section-title">Customer Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>
                  <div><strong>Name:</strong> {selectedOrder.customer_name}</div>
                  <div><strong>Email:</strong> {selectedOrder.customer_email}</div>
                  <div><strong>Phone:</strong> {selectedOrder.customer_phone}</div>
                  <div>
                    <strong>Type:</strong>{' '}
                    <span className={`badge-customer-type ${selectedOrder.customer_type === 'guest' ? 'badge-guest' : 'badge-registered'}`}>
                      {selectedOrder.customer_type === 'guest' ? 'Guest Checkout' : 'Registered Customer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> Delivery Address
                </div>
                {selectedOrder.shipping_address ? (
                  <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.5' }}>
                    <div>{selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}</div>
                    <div>{selectedOrder.shipping_address.address}{selectedOrder.shipping_address.apartment ? `, ${selectedOrder.shipping_address.apartment}` : ''}</div>
                    <div>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.pinCode}</div>
                    <div>{selectedOrder.shipping_address.country || 'India'}</div>
                    {selectedOrder.shipping_address.phone && <div>Phone: {selectedOrder.shipping_address.phone}</div>}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No structured delivery address found.</p>
                )}
              </div>

              {/* Order Items */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  Ordered Products ({selectedOrder.order_items?.length || 0})
                </div>
                
                <div className="drawer-items-list">
                  {(selectedOrder.order_items || []).map((item, idx) => (
                    <div key={item.id || idx} className="drawer-item-row">
                      {item.product_image && (
                        <img src={item.product_image} alt={item.product_name} className="drawer-item-img" />
                      )}
                      <div className="drawer-item-meta">
                        <span className="drawer-item-name">{item.product_name}</span>
                        <span className="drawer-item-qty">Qty: {item.quantity} × ₹{(Number(item.unit_price) || 0).toFixed(2)}</span>
                      </div>
                      <span className="drawer-item-total">
                        ₹{(Number(item.total_price) || (Number(item.unit_price) * item.quantity) || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Financial Summary */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <CreditCard size={14} style={{ display: 'inline', marginRight: '4px' }} /> Payment & Financial Breakdown
                </div>
                
                <div className="drawer-summary-totals">
                  <div className="summary-flex-row">
                    <span>Subtotal</span>
                    <span>₹{(Number(selectedOrder.subtotal) || 0).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.discount) > 0 && (
                    <div className="summary-flex-row" style={{ color: '#16a34a' }}>
                      <span>Discount</span>
                      <span>-₹{Number(selectedOrder.discount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.tax) > 0 && (
                    <div className="summary-flex-row">
                      <span>Tax</span>
                      <span>+₹{Number(selectedOrder.tax).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="summary-flex-row">
                    <span>Shipping Fee</span>
                    <span>{Number(selectedOrder.shipping_fee) === 0 ? 'FREE' : `+₹${Number(selectedOrder.shipping_fee).toFixed(2)}`}</span>
                  </div>
                  <div className="summary-flex-row summary-final-total">
                    <span>Total Amount</span>
                    <span>₹{(Number(selectedOrder.total_amount) || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
                  <div>Payment Status: <strong>{selectedOrder.payment_status}</strong></div>
                  {selectedOrder.razorpay_order_id && (
                    <div>Razorpay Order ID: <code>{selectedOrder.razorpay_order_id}</code></div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboardPage;
