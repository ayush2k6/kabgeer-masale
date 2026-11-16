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
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  Phone,
  Mail,
  Star,
  MessageSquare,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Printer,
  Eye,
  Trash2,
  Tag,
  ShieldCheck,
  Download
} from 'lucide-react';
import logo from '../assets/logo.png';
import PrintableThermalBill from '../components/PrintableThermalBill';
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

  // Search, Filters & Sorting (defaults to 'paid' so unpaid checkout attempts do not clutter the dashboard)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [activeViewTab, setActiveViewTab] = useState('paid'); // 'paid' | 'to_fulfill' | 'unpaid' | 'all'

  // Selected Order for Drawer Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [sendingReviewEmail, setSendingReviewEmail] = useState(false);
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
  const [showCustomEmailComposer, setShowCustomEmailComposer] = useState(false);
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [customEmailMessage, setCustomEmailMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('');
  const [awbInput, setAwbInput] = useState('');
  const [courierInput, setCourierInput] = useState('Trackon');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [cancellationReason, setCancellationReason] = useState('');
  const [statusUpdateMessage, setStatusUpdateMessage] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [actionSuccessKey, setActionSuccessKey] = useState(null);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Helper to retrieve coupon code from order columns or address metadata
  const getOrderCoupon = (order) => {
    if (!order) return null;
    return order.coupon_code || order.billing_address?.coupon_code || order.shipping_address?.coupon_code || null;
  };

  // Helper to identify BYB orders (by prefix, flag, or 4+ masalas)
  const checkIsBybOrder = (order) => {
    if (!order) return false;
    const isPrefix = order.display_order_id?.startsWith('BYB') || order.display_order_id?.includes('BYB');
    const isBundleFlag = Boolean(order.is_bundle);
    const totalItemsCount = order.order_items?.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || 0;
    return Boolean(isPrefix || isBundleFlag || totalItemsCount >= 4);
  };

  // Helper to extract customer initials for drawer avatar
  const getCustomerInitials = (name) => {
    if (!name || typeof name !== 'string') return 'CU';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Permanently delete single order by ID
  const handleDeleteOrder = async (orderToDelete) => {
    if (!orderToDelete) return;
    const isUnpaid = String(orderToDelete.payment_status || '').toLowerCase() !== 'paid';
    const confirmDelete = window.confirm(
      `Permanently delete Order #${orderToDelete.display_order_id}?\n\n` +
      `Customer: ${orderToDelete.customer_name || 'Customer'}\n` +
      `Amount: ₹${Number(orderToDelete.total_amount).toFixed(2)}\n` +
      `Payment Status: ${orderToDelete.payment_status || 'Pending'}${isUnpaid ? ' (CLIENT NEVER PAID)' : ''}\n\n` +
      `This will remove the order and all related items from your database.`
    );
    if (!confirmDelete) return;

    setIsDeletingOrder(true);
    try {
      const { data, error: delErr } = await supabase.functions.invoke('admin-manage-orders', {
        body: {
          action: 'delete_order',
          orderId: orderToDelete.id
        }
      });

      if (delErr || !data?.success) {
        throw new Error(delErr?.message || data?.error || 'Failed to delete order.');
      }

      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Delete order error:', err);
      alert(`Could not delete order: ${err.message}`);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Permanently delete all unpaid/abandoned checkout orders in 1 click
  const handleDeleteAllUnpaid = async () => {
    const unpaidList = orders.filter(o => String(o.payment_status || '').toLowerCase() !== 'paid');
    if (unpaidList.length === 0) {
      alert("No unpaid checkout attempts found in your dashboard.");
      return;
    }

    const confirmPurge = window.confirm(
      `Permanently delete all ${unpaidList.length} unpaid / abandoned checkout attempt(s)?\n\n` +
      `These are orders where customers initiated checkout but never completed payment on Razorpay.\n\n` +
      `This will clean up your dashboard completely so only verified orders remain.`
    );
    if (!confirmPurge) return;

    setIsDeletingOrder(true);
    let deletedCount = 0;
    try {
      for (const ord of unpaidList) {
        try {
          const { data, error: delErr } = await supabase.functions.invoke('admin-manage-orders', {
            body: {
              action: 'delete_order',
              orderId: ord.id
            }
          });
          if (!delErr && data?.success) {
            deletedCount++;
          }
        } catch (singleErr) {
          console.warn(`Could not delete order ${ord.id}:`, singleErr);
        }
      }

      setOrders(prev => prev.filter(o => String(o.payment_status || '').toLowerCase() === 'paid'));
      if (selectedOrder && String(selectedOrder.payment_status || '').toLowerCase() !== 'paid') {
        setSelectedOrder(null);
      }
      alert(`Successfully cleaned up ${deletedCount} unpaid checkout attempt(s). Your dashboard is now refreshed!`);
    } catch (err) {
      console.error('Error cleaning up unpaid orders:', err);
      alert(`Error cleaning up unpaid orders: ${err.message}`);
    } finally {
      setIsDeletingOrder(false);
      fetchAllOrders();
    }
  };

  // Fetch all orders from Supabase (with direct RLS, Edge function & RPC fallback)
  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Try direct Supabase query
      const { data: directOrders, error: directErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (!directErr && Array.isArray(directOrders) && directOrders.length > 0) {
        setOrders(directOrders);
        return;
      }

      // 2. Try Supabase Edge Function admin-manage-orders (fail-safe service-role fallback)
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-manage-orders', {
        body: { action: 'list', adminEmail: user?.email }
      });

      if (!edgeErr && edgeData?.success && Array.isArray(edgeData?.orders) && edgeData.orders.length > 0) {
        setOrders(edgeData.orders);
        return;
      }

      // 3. Try Supabase RPC get_all_orders_admin
      const { data: rpcOrders, error: rpcErr } = await supabase.rpc('get_all_orders_admin');
      if (!rpcErr && Array.isArray(rpcOrders) && rpcOrders.length > 0) {
        const { data: allItems } = await supabase.from('order_items').select('*');
        const itemsByOrderId = {};
        (allItems || []).forEach(it => {
          if (!itemsByOrderId[it.order_id]) itemsByOrderId[it.order_id] = [];
          itemsByOrderId[it.order_id].push(it);
        });
        const fullOrders = rpcOrders.map(o => ({ ...o, order_items: itemsByOrderId[o.id] || [] }));
        setOrders(fullOrders);
        return;
      }

      // 4. If all methods succeeded but store genuinely has 0 orders
      if (directOrders && Array.isArray(directOrders)) {
        setOrders(directOrders);
      } else if (edgeData?.orders && Array.isArray(edgeData.orders)) {
        setOrders(edgeData.orders);
      } else {
        throw new Error(directErr?.message || edgeErr?.message || rpcErr?.message || 'Failed to fetch customer orders.');
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError(err.message || 'Failed to fetch customer orders.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Set default status and shipping details when an order is opened
  useEffect(() => {
    if (selectedOrder) {
      setNewOrderStatus(selectedOrder.order_status || 'Pending');
      setAwbInput(selectedOrder.trackon_awb || selectedOrder.shiprocket_awb || '');
      setCourierInput(selectedOrder.courier_partner || 'Trackon');
      setNotifyEmail(true);
      setCancellationReason('');
      setStatusUpdateMessage(null);
      setShowCustomEmailComposer(false);
      setCustomEmailSubject(`Regarding your Kabgeer Masale Order #${selectedOrder.display_order_id || selectedOrder.id}`);
      setCustomEmailMessage(`Dear ${selectedOrder.customer_name || 'Customer'},\n\n`);
      setSelectedPreset('');
    }
  }, [selectedOrder]);

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => String(o.payment_status || '').toLowerCase() === 'paid').length;
    const unpaidOrders = orders.filter(o => String(o.payment_status || '').toLowerCase() !== 'paid').length;
    // To Fulfill: MUST be Paid and not yet Delivered or Cancelled!
    const toFulfillOrders = orders.filter(o => 
      String(o.payment_status || '').toLowerCase() === 'paid' && 
      (o.order_status === 'Pending' || o.order_status === 'Confirmed' || o.order_status === 'Processing')
    ).length;
    const deliveredOrders = orders.filter(o => o.order_status === 'Delivered').length;
    const totalSales = orders
      .filter(o => String(o.payment_status || '').toLowerCase() === 'paid')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    return {
      totalOrders,
      paidOrders,
      unpaidOrders,
      toFulfillOrders,
      deliveredOrders,
      totalSales
    };
  }, [orders]);

  // Interactive KPI card click handler
  const handleKpiClick = (type) => {
    if (type === 'all') {
      setActiveViewTab('all');
      setStatusFilter('ALL');
      setPaymentFilter('ALL');
    } else if (type === 'paid') {
      setActiveViewTab('paid');
      setStatusFilter('ALL');
      setPaymentFilter('Paid');
    } else if (type === 'to_fulfill') {
      setActiveViewTab('to_fulfill');
      setStatusFilter('ALL');
      setPaymentFilter('Paid');
    } else if (type === 'unpaid') {
      setActiveViewTab('unpaid');
      setStatusFilter('ALL');
      setPaymentFilter('Pending');
    } else if (type === 'delivered') {
      setActiveViewTab('paid');
      setStatusFilter('Delivered');
      setPaymentFilter('Paid');
    }
  };

  // Filtered & Sorted Orders List (incorporating activeViewTab)
  const processedOrders = useMemo(() => {
    let result = orders.filter(order => {
      const isPaid = String(order.payment_status || '').toLowerCase() === 'paid';

      // 1. View Tab filtering
      if (activeViewTab === 'paid' && !isPaid) return false;
      if (activeViewTab === 'to_fulfill') {
        if (!isPaid) return false;
        if (order.order_status === 'Delivered' || order.order_status === 'Cancelled') return false;
      }
      if (activeViewTab === 'unpaid' && isPaid) return false;

      // 2. Search query filtering
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (order.display_order_id && order.display_order_id.toLowerCase().includes(q)) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(q)) ||
        (order.customer_phone && order.customer_phone.toLowerCase().includes(q)) ||
        (order.shipping_address?.city && order.shipping_address.city.toLowerCase().includes(q)) ||
        (order.shipping_address?.state && order.shipping_address.state.toLowerCase().includes(q));

      // 3. Dropdown filters
      const matchesStatus = statusFilter === 'ALL' || order.order_status === statusFilter;
      let matchesPayment = true;
      if (paymentFilter !== 'ALL') {
        if (paymentFilter === 'Paid') matchesPayment = isPaid;
        else if (paymentFilter === 'Pending' || paymentFilter === 'Unpaid') matchesPayment = !isPaid;
        else matchesPayment = order.payment_status === paymentFilter;
      }

      return matchesSearch && matchesStatus && matchesPayment;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortBy === 'highest') {
        return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
      }
      if (sortBy === 'lowest') {
        return (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
      }
      return 0;
    });

    return result;
  }, [orders, searchQuery, statusFilter, paymentFilter, sortBy, activeViewTab]);

  // Update Order Fulfillment Status & Dispatch Automated Customer Notification
  const handleUpdateStatus = async (e, directStatus = null) => {
    if (e) e.preventDefault();
    const targetStatus = directStatus || newOrderStatus;
    if (!selectedOrder || !targetStatus) return;

    if (String(selectedOrder.payment_status || '').toLowerCase() !== 'paid' && targetStatus !== 'Cancelled') {
      const proceed = window.confirm(
        `⚠️ CAUTION: This order is UNPAID!\n\nThe customer never completed payment on Razorpay.\n\nAre you sure you want to update fulfillment status to '${targetStatus}'?`
      );
      if (!proceed) return;
    }

    setUpdatingStatus(true);
    setStatusUpdateMessage(null);

    try {
      // 1. Primary: Update via admin-manage-orders Edge Function (handles status + AWB + email notification)
      const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('admin-manage-orders', {
        body: {
          action: 'update_status',
          orderId: selectedOrder.id,
          orderStatus: targetStatus,
          awbNumber: awbInput.trim() || undefined,
          courierPartner: courierInput.trim() || 'Trackon',
          sendEmail: notifyEmail,
          cancellationReason: targetStatus === 'Cancelled' ? cancellationReason : undefined,
          adminEmail: user?.email || 'admin@kabgeerji.com'
        }
      });

      if (edgeErr || !edgeRes?.success) {
        // Fallback: Direct Supabase database update
        const updatePayload = {
          order_status: targetStatus,
          updated_at: new Date().toISOString()
        };
        if (awbInput.trim()) updatePayload.trackon_awb = awbInput.trim();
        if (courierInput.trim()) updatePayload.courier_partner = courierInput.trim();
        if (targetStatus === 'Shipped') updatePayload.shipped_at = new Date().toISOString();
        if (targetStatus === 'Delivered') updatePayload.delivered_at = new Date().toISOString();

        const { error: directErr } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', selectedOrder.id);

        if (directErr) {
          throw new Error(edgeErr?.message || directErr.message);
        }
      }

      // Optimistically update local UI state
      const updatedRecord = {
        ...selectedOrder,
        order_status: targetStatus,
        trackon_awb: awbInput.trim() || selectedOrder.trackon_awb,
        courier_partner: courierInput.trim() || selectedOrder.courier_partner
      };

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...updatedRecord } : o));
      setSelectedOrder(prev => ({ ...prev, ...updatedRecord }));
      setNewOrderStatus(targetStatus);

      const currentTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const emailSentDetails = notifyEmail && ['Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(targetStatus)
        ? `Branded '${targetStatus}' email successfully dispatched to ${selectedOrder.customer_email} at ${currentTimeStr} IST`
        : null;

      const trackingDetails = (targetStatus === 'Shipped' || targetStatus === 'Dispatched') && (awbInput.trim() || selectedOrder.trackon_awb)
        ? `Courier: ${courierInput.trim() || 'Trackon'} | AWB: ${awbInput.trim() || selectedOrder.trackon_awb}`
        : null;

      setStatusUpdateMessage({ 
        type: 'success', 
        headline: `✓ Task Completed: Order #${selectedOrder.display_order_id} updated to '${targetStatus}'`,
        emailDetails: emailSentDetails,
        trackingDetails: trackingDetails
      });
      setActionSuccessKey('status_updated');
      setTimeout(() => setActionSuccessKey(null), 3500);
    } catch (err) {
      console.error('Error updating order status:', err);
      setStatusUpdateMessage({ type: 'error', headline: 'Failed to update order status', text: err.message || 'Please check network connection.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Manual Email Trigger Handler
  const handleManualResendEmail = async (order) => {
    if (!order) return;
    setResendingEmail(true);
    try {
      const isStatusUpdate = ['Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(order.order_status);
      const { data: res, error: err } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderId: order.id,
          emailType: isStatusUpdate ? 'status_update' : 'confirmation',
          newStatus: order.order_status,
          awbNumber: order.trackon_awb || order.shiprocket_awb,
          courierName: order.courier_partner || 'Trackon',
          forceResend: true
        }
      });
      if (err) throw err;
      const currentTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      setStatusUpdateMessage({
        type: 'success',
        headline: `✓ Fulfillment Email Dispatched Successfully!`,
        emailDetails: `Sent to ${order.customer_email} at ${currentTimeStr} IST`
      });
      setActionSuccessKey('alert_resent');
      setTimeout(() => setActionSuccessKey(null), 3500);
    } catch (e) {
      setStatusUpdateMessage({
        type: 'error',
        headline: 'Failed to resend email',
        text: e.message
      });
    } finally {
      setResendingEmail(false);
    }
  };

  // 1-Click Post-Delivery Review Request Email Dispatcher
  const handleSendReviewEmail = async (order) => {
    if (!order) return;
    setSendingReviewEmail(true);
    setStatusUpdateMessage(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderId: order.id,
          emailType: 'review_request',
          forceResend: true
        }
      });
      if (err) throw err;
      const currentTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const nowIso = new Date().toISOString();

      // Update local state
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, review_email_sent_at: nowIso } : o));
      setSelectedOrder(prev => prev && prev.id === order.id ? { ...prev, review_email_sent_at: nowIso } : prev);

      setStatusUpdateMessage({
        type: 'success',
        headline: `✓ Review Request Email Dispatched Successfully!`,
        emailDetails: `Sent to ${order.customer_email} at ${currentTimeStr} IST (Google Review link + 10% Refill Voucher included)`
      });
      setActionSuccessKey('review_sent');
      setTimeout(() => setActionSuccessKey(null), 3500);
    } catch (e) {
      setStatusUpdateMessage({
        type: 'error',
        headline: 'Failed to send review email',
        text: e.message
      });
    } finally {
      setSendingReviewEmail(false);
    }
  };

  // Preset Applicator for Custom Email Composer
  const handleApplyPreset = (presetKey, order) => {
    if (!order) return;
    const customerName = order.customer_name || 'Customer';
    const orderId = order.display_order_id || order.id;
    setSelectedPreset(presetKey);

    if (presetKey === 'review') {
      setCustomEmailSubject(`⭐ How was your Awadhi cooking experience, ${customerName}?`);
      setCustomEmailMessage(
        `Dear ${customerName},\n\nIt has been a week since your royal spice order #${orderId} was delivered. We hope the authentic aromas of Lucknow have brought rich flavours to your dining table!\n\nWe would love to know how your dishes turned out. Please take a quick 30 seconds to share your review on Google.\n\nThank you for choosing Kabgeer Masale!`
      );
    } else if (presetKey === 'address') {
      setCustomEmailSubject(`Address Clarification for Order #${orderId} — Kabgeer Masale`);
      setCustomEmailMessage(
        `Dear ${customerName},\n\nWe are preparing your spice parcel for order #${orderId}. Could you please confirm your complete street address, nearby landmark, and active phone number?\n\nThis will ensure our courier partner delivers your order without delay.`
      );
    } else if (presetKey === 'delivery_update') {
      setCustomEmailSubject(`Shipping Update for Order #${orderId} — Kabgeer Masale`);
      setCustomEmailMessage(
        `Dear ${customerName},\n\nYour authentic spice order #${orderId} has been packed with care and is scheduled for courier dispatch.\n\nYou will receive your courier tracking number and updates shortly.`
      );
    } else if (presetKey === 'vip_offer') {
      setCustomEmailSubject(`A Special Refill Gift for You, ${customerName} — Kabgeer Masale`);
      setCustomEmailMessage(
        `Dear ${customerName},\n\nThank you for being part of the Kabgeer family! As a token of our royal appreciation, please enjoy 10% OFF on your next order with coupon code: KABGEER10.\n\nVisit https://kabgeermasala.com to explore our complete collection of heritage spice blends.`
      );
    } else if (presetKey === 'custom') {
      setCustomEmailSubject(`Regarding your Kabgeer Masale Order #${orderId}`);
      setCustomEmailMessage(`Dear ${customerName},\n\n`);
    }
  };

  // Custom Message Dispatcher
  const handleSendCustomEmail = async (e) => {
    if (e) e.preventDefault();
    if (!selectedOrder || !customEmailSubject.trim() || !customEmailMessage.trim()) return;

    setSendingCustomEmail(true);
    setStatusUpdateMessage(null);

    try {
      const { data: res, error: err } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderId: selectedOrder.id,
          emailType: 'custom_message',
          customSubject: customEmailSubject.trim(),
          customMessage: customEmailMessage.trim(),
          forceResend: true
        }
      });
      if (err) throw err;
      const currentTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const nowIso = new Date().toISOString();

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, custom_email_sent_at: nowIso } : o));
      setSelectedOrder(prev => prev && prev.id === selectedOrder.id ? { ...prev, custom_email_sent_at: nowIso } : prev);

      setStatusUpdateMessage({
        type: 'success',
        headline: `✓ Custom Email Dispatched Successfully!`,
        emailDetails: `Sent to ${selectedOrder.customer_email} at ${currentTimeStr} IST`
      });
      setActionSuccessKey('custom_email_sent');
      setTimeout(() => setActionSuccessKey(null), 3500);
      setShowCustomEmailComposer(false);
    } catch (e) {
      setStatusUpdateMessage({
        type: 'error',
        headline: 'Failed to send custom email',
        text: e.message
      });
    } finally {
      setSendingCustomEmail(false);
    }
  };

  // Clean, Uncluttered, Single-Line CSV Export (RFC 4180 compliant with UTF-8 BOM)
  const handleExportCsv = () => {
    if (!processedOrders || processedOrders.length === 0) {
      alert("No orders available to export for the current filter view.");
      return;
    }

    const headers = [
      'Order ID',
      'Date & Time',
      'Order Type',
      'Customer Name',
      'Phone',
      'Email',
      'Customer Type',
      'Shipping Address',
      'City',
      'State',
      'PIN Code',
      'Payment Status',
      'Payment Mode',
      'Fulfillment Status',
      'Courier Partner',
      'AWB Tracking',
      'Total Units',
      'Items Summary',
      'Subtotal (INR)',
      'Discount (INR)',
      'Coupon Code',
      'Shipping Fee (INR)',
      'Total Amount (INR)'
    ];

    // Guarantee absolutely NO internal line breaks, carriage returns, or tabs in any cell
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

    const rows = processedOrders.map(order => {
      const orderDate = order.created_at ? new Date(order.created_at) : null;
      const formattedDateTime = orderDate
        ? `${orderDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} ${orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
        : '—';

      const isByb = checkIsBybOrder(order);
      const orderType = isByb ? 'BYB Bundle' : 'Standard';
      const isGuest = order.customer_type === 'guest' || !order.customer_id;
      const customerType = isGuest ? 'Guest' : 'Member';

      // Concise, clean items summary (no verbose price spam or multi-line breaks)
      const itemsList = (order.order_items || []).map(it => {
        const qty = it.quantity || 1;
        const name = cleanStr(it.product_name || it.name || 'Spice');
        return `${qty}x ${name}`;
      });
      if (isByb) {
        itemsList.push('2x Mini Masala Sample Pack');
      }
      const itemsSummary = itemsList.join(', ');

      const totalItems = (order.order_items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) + (isByb ? 2 : 0);

      const addr = order.shipping_address || {};
      const fullAddress = [
        addr.address_line1 || addr.address || '',
        addr.address_line2 || '',
        addr.landmark ? `Near ${addr.landmark}` : ''
      ].map(cleanStr).filter(Boolean).join(', ');

      const subtotal = (Number(order.subtotal) || (Number(order.total_amount) - (Number(order.shipping_fee) || 0) + (Number(order.discount_amount) || 0)) || 0).toFixed(2);
      const discount = (Number(order.discount_amount) || 0).toFixed(2);
      const coupon = cleanStr(getOrderCoupon(order) || 'None');
      const shipping = (Number(order.shipping_fee) || 0).toFixed(2);
      const total = (Number(order.total_amount) || 0).toFixed(2);

      return [
        escapeCsv(order.display_order_id || order.id),
        escapeCsv(formattedDateTime),
        escapeCsv(orderType),
        escapeCsv(order.customer_name || 'Customer'),
        escapeCsv(order.customer_phone || '—'),
        escapeCsv(order.customer_email || '—'),
        escapeCsv(customerType),
        escapeCsv(fullAddress || '—'),
        escapeCsv(addr.city || '—'),
        escapeCsv(addr.state || '—'),
        escapeCsv(addr.postal_code || addr.pincode || addr.pin || '—'),
        escapeCsv(order.payment_status || 'Pending'),
        escapeCsv(order.payment_method || order.payment_mode || 'Razorpay Online'),
        escapeCsv(order.order_status || 'Pending'),
        escapeCsv(order.courier_partner || 'Trackon'),
        escapeCsv(order.trackon_awb || order.shiprocket_awb || '—'),
        escapeCsv(totalItems),
        escapeCsv(itemsSummary),
        escapeCsv(subtotal),
        escapeCsv(discount),
        escapeCsv(coupon),
        escapeCsv(shipping),
        escapeCsv(total)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const tabName = activeViewTab === 'paid' ? 'Paid_Orders' : activeViewTab === 'to_fulfill' ? 'To_Pack' : activeViewTab === 'unpaid' ? 'Unpaid_Checkouts' : 'All_Orders';
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `Kabgeer_Orders_${tabName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPaymentFilter('Paid');
    setSortBy('newest');
    setActiveViewTab('paid');
  };

  const getStatusClass = (status) => {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'paid') return 'status-paid';
    if (s === 'delivered') return 'status-delivered';
    if (s === 'confirmed') return 'status-confirmed';
    if (s === 'processing') return 'status-processing';
    if (s === 'shipped') return 'status-shipped';
    if (s === 'pending' || s === 'unpaid') return 'status-pending';
    if (s === 'cancelled') return 'status-cancelled';
    if (s === 'failed' || s === 'refunded') return 'status-failed';
    return 'status-shipped';
  };

  return (
    <div className="admin-layout">
      
      {/* 1. Admin Navigation Header */}
      <header className="admin-navbar">
        <div className="admin-nav-container">
          <div className="admin-brand-left">
            <Link to="/admin" className="admin-brand-link">
              <img src={logo} alt="Kabgeer Masale" className="admin-brand-logo" />
            </Link>
            <div className="admin-brand-suite-tag">
              <span className="brand-suite-badge">OPERATIONS</span>
              <span className="brand-suite-sub">Order Management</span>
            </div>
          </div>

          <div className="admin-nav-right">
            <div className="admin-user-profile-badge">
              <div className="admin-avatar-circle">
                {(user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="admin-user-info-text">
                <span className="admin-user-role">Administrator</span>
                <span className="admin-user-email">{user?.email || 'Admin'}</span>
              </div>
            </div>

            <Link to="/" className="btn-nav-store" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} />
              <span>View Store</span>
            </Link>

            <button type="button" onClick={logout} className="btn-nav-logout" title="Sign out of portal">
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Container */}
      <main className="admin-main-container">
        
        {/* 2. Page Title Row */}
        <div className="admin-page-title-row">
          <div className="admin-title-content">
            <div className="admin-title-badge-flex">
              <h1>Orders Management</h1>
              <span className="admin-orders-count-pill">{metrics.totalOrders} Orders</span>
            </div>
            <p className="admin-page-subtitle">
              Manage spice orders, monitor fulfillment pipelines, and dispatch thermal shipping parcels.
            </p>
          </div>

          <button 
            type="button"
            className="admin-refresh-btn" 
            onClick={fetchAllOrders}
            disabled={loading}
            title="Refresh latest customer orders"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh Orders'}</span>
          </button>
        </div>

        {/* 3. Executive KPI Metric Cards */}
        <section className="executive-kpi-grid" aria-label="Executive Metrics">
          <div 
            className={`exec-kpi-card ${activeViewTab === 'paid' && statusFilter === 'ALL' ? 'exec-kpi-active' : ''}`}
            onClick={() => handleKpiClick('paid')}
            title="View verified paid orders only"
          >
            <div className="exec-kpi-header">
              <div className="exec-kpi-icon-box icon-green">
                <CheckCircle2 size={18} />
              </div>
              <span className="exec-kpi-label">Paid Orders</span>
              {activeViewTab === 'paid' && statusFilter === 'ALL' && (
                <span className="exec-active-indicator">Active</span>
              )}
            </div>
            <div className="exec-kpi-value">{metrics.paidOrders}</div>
            <div className="exec-kpi-footer">
              <span className="exec-kpi-context">Razorpay verified captures</span>
            </div>
          </div>

          <div 
            className={`exec-kpi-card ${activeViewTab === 'to_fulfill' ? 'exec-kpi-active' : ''}`}
            onClick={() => handleKpiClick('to_fulfill')}
            title="View paid orders needing packing or dispatch"
          >
            <div className="exec-kpi-header">
              <div className="exec-kpi-icon-box icon-amber">
                <Clock size={18} />
              </div>
              <span className="exec-kpi-label">To Fulfill</span>
              {activeViewTab === 'to_fulfill' && (
                <span className="exec-active-indicator">Active</span>
              )}
            </div>
            <div className="exec-kpi-value">{metrics.toFulfillOrders}</div>
            <div className="exec-kpi-footer">
              <span className="exec-kpi-context">Paid & pending dispatch</span>
            </div>
          </div>

          <div 
            className={`exec-kpi-card ${activeViewTab === 'unpaid' ? 'exec-kpi-active' : ''}`}
            onClick={() => handleKpiClick('unpaid')}
            title="View abandoned or unpaid checkout attempts"
          >
            <div className="exec-kpi-header">
              <div className="exec-kpi-icon-box icon-rose">
                <AlertTriangle size={18} />
              </div>
              <span className="exec-kpi-label">Unpaid Checkouts</span>
              {activeViewTab === 'unpaid' && (
                <span className="exec-active-indicator">Active</span>
              )}
            </div>
            <div className="exec-kpi-value" style={{ color: metrics.unpaidOrders > 0 ? '#dc2626' : 'inherit' }}>
              {metrics.unpaidOrders}
            </div>
            <div className="exec-kpi-footer">
              <span className="exec-kpi-context">Client never completed payment</span>
            </div>
          </div>

          <div 
            className={`exec-kpi-card ${statusFilter === 'Delivered' ? 'exec-kpi-active' : ''}`}
            onClick={() => handleKpiClick('delivered')}
            title="View delivered orders"
          >
            <div className="exec-kpi-header">
              <div className="exec-kpi-icon-box icon-teal">
                <Truck size={18} />
              </div>
              <span className="exec-kpi-label">Delivered</span>
              {statusFilter === 'Delivered' && (
                <span className="exec-active-indicator">Active</span>
              )}
            </div>
            <div className="exec-kpi-value">{metrics.deliveredOrders}</div>
            <div className="exec-kpi-footer">
              <span className="exec-kpi-context">Parcels received by customer</span>
            </div>
          </div>

          <div className="exec-kpi-card exec-kpi-static">
            <div className="exec-kpi-header">
              <div className="exec-kpi-icon-box icon-gold">
                <IndianRupee size={18} />
              </div>
              <span className="exec-kpi-label">Total Revenue</span>
            </div>
            <div className="exec-kpi-value">₹{metrics.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="exec-kpi-footer">
              <span className="exec-kpi-context">Gross verified paid sales</span>
            </div>
          </div>
        </section>

        {/* 4. Orders List Table Card */}
        <section className="admin-orders-card">
          
          {/* Segmented View Tabs Bar */}
          <div className="admin-view-tabs-bar">
            <div className="admin-view-tabs-track">
              <button 
                type="button" 
                className={`view-tab-btn ${activeViewTab === 'paid' ? 'active' : ''}`}
                onClick={() => { setActiveViewTab('paid'); setPaymentFilter('Paid'); setStatusFilter('ALL'); }}
                title="Show verified paid customer orders"
              >
                <CheckCircle2 size={14} className="tab-icon icon-tab-paid" />
                <span>Paid Orders</span>
                <span className="tab-count-pill pill-paid">{metrics.paidOrders}</span>
              </button>

              <button 
                type="button" 
                className={`view-tab-btn ${activeViewTab === 'to_fulfill' ? 'active' : ''}`}
                onClick={() => { setActiveViewTab('to_fulfill'); setPaymentFilter('Paid'); setStatusFilter('ALL'); }}
                title="Show paid orders awaiting packing or shipping"
              >
                <Clock size={14} className="tab-icon icon-tab-amber" />
                <span>To Pack & Ship</span>
                <span className="tab-count-pill pill-amber">{metrics.toFulfillOrders}</span>
              </button>

              <button 
                type="button" 
                className={`view-tab-btn ${activeViewTab === 'unpaid' ? 'active tab-unpaid-active' : ''}`}
                onClick={() => { setActiveViewTab('unpaid'); setPaymentFilter('Pending'); setStatusFilter('ALL'); }}
                title="View checkout attempts where client never completed payment"
              >
                <AlertTriangle size={14} className="tab-icon icon-tab-red" />
                <span>Unpaid / Incomplete</span>
                {metrics.unpaidOrders > 0 && (
                  <span className="tab-count-pill pill-red">{metrics.unpaidOrders}</span>
                )}
              </button>

              <button 
                type="button" 
                className={`view-tab-btn ${activeViewTab === 'all' ? 'active' : ''}`}
                onClick={() => { setActiveViewTab('all'); setPaymentFilter('ALL'); setStatusFilter('ALL'); }}
                title="Show all order records including abandoned checkouts"
              >
                <Package size={14} className="tab-icon" />
                <span>All Records</span>
                <span className="tab-count-pill pill-neutral">{orders.length}</span>
              </button>
            </div>
          </div>

          {/* Unpaid / Abandoned Checkouts Notice Banner */}
          {activeViewTab === 'unpaid' && (
            <div className="unpaid-orders-notice-banner">
              <div className="unpaid-notice-left">
                <AlertTriangle size={22} color="#dc2626" />
                <div>
                  <h4>Unpaid / Abandoned Checkouts ({metrics.unpaidOrders})</h4>
                  <p>
                    These customers initiated checkout but did not complete payment on Razorpay. 
                    <strong> Do not pack or ship these parcels.</strong>
                  </p>
                </div>
              </div>
              {metrics.unpaidOrders > 0 && (
                <button 
                  type="button" 
                  className="btn-cleanup-unpaid"
                  onClick={handleDeleteAllUnpaid}
                  disabled={isDeletingOrder}
                  title="Permanently remove all unpaid checkout attempts from your dashboard"
                >
                  <Trash2 size={14} />
                  <span>{isDeletingOrder ? 'Cleaning...' : `Clean Up All Unpaid (${metrics.unpaidOrders})`}</span>
                </button>
              )}
            </div>
          )}

          {/* Search & Filter Header Bar */}
          <div className="admin-orders-header-bar">
            <div className="admin-search-wrapper">
              <Search size={15} className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search by Order ID, Name, Email, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="admin-search-clear-btn"
                  title="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="admin-filters-row">
              <div className="admin-select-wrapper">
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
              </div>

              <div className="admin-select-wrapper">
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

              <div className="admin-select-wrapper">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="admin-select-filter"
                  aria-label="Sort Orders"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="highest">Sort: Highest Amount</option>
                  <option value="lowest">Sort: Lowest Amount</option>
                </select>
              </div>

              {(searchQuery || statusFilter !== 'ALL' || (paymentFilter !== 'Paid' && activeViewTab === 'paid') || (paymentFilter !== 'Pending' && activeViewTab === 'unpaid') || (paymentFilter !== 'ALL' && activeViewTab === 'all') || sortBy !== 'newest') && (
                <button type="button" onClick={resetFilters} className="btn-reset-filters" title="Reset all search & filter settings to default">
                  <RotateCw size={12} />
                  <span>Reset</span>
                </button>
              )}

              <button 
                type="button" 
                onClick={handleExportCsv} 
                className="btn-export-csv" 
                title={`Export ${processedOrders.length} order(s) as CSV`}
              >
                <Download size={13} />
                <span>Export CSV</span>
                <span className="export-count-pill">{processedOrders.length}</span>
              </button>
            </div>
          </div>

          {/* Active Filters Summary & Results Counter Bar */}
          <div className="admin-filter-status-bar">
            <div className="admin-active-chips-group">
              <span className="admin-results-count-text">
                Showing <strong>{processedOrders.length}</strong> of <strong>{orders.length}</strong> orders
              </span>

              {activeViewTab === 'to_fulfill' && (
                <span className="admin-filter-chip chip-amber">
                  📦 To Pack & Ship (Paid Only)
                  <button type="button" onClick={() => { setActiveViewTab('paid'); setPaymentFilter('Paid'); }} title="Switch to all paid orders"><X size={11} /></button>
                </span>
              )}

              {activeViewTab === 'unpaid' && (
                <span className="admin-filter-chip chip-red">
                  ⚠️ Unpaid Checkouts Only
                  <button type="button" onClick={() => { setActiveViewTab('paid'); setPaymentFilter('Paid'); }} title="Switch back to paid orders"><X size={11} /></button>
                </span>
              )}

              {activeViewTab === 'all' && (
                <span className="admin-filter-chip">
                  All Records (Paid + Unpaid)
                  <button type="button" onClick={() => { setActiveViewTab('paid'); setPaymentFilter('Paid'); }} title="Switch back to paid orders"><X size={11} /></button>
                </span>
              )}

              {searchQuery && (
                <span className="admin-filter-chip">
                  Search: "{searchQuery}"
                  <button type="button" onClick={() => setSearchQuery('')} title="Remove search filter"><X size={11} /></button>
                </span>
              )}

              {statusFilter !== 'ALL' && (
                <span className="admin-filter-chip">
                  Status: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter('ALL')} title="Remove status filter"><X size={11} /></button>
                </span>
              )}

              {paymentFilter !== 'ALL' && !((activeViewTab === 'paid' && paymentFilter === 'Paid') || (activeViewTab === 'unpaid' && paymentFilter === 'Pending')) && (
                <span className="admin-filter-chip">
                  Payment: {paymentFilter}
                  <button type="button" onClick={() => setPaymentFilter('ALL')} title="Remove payment filter"><X size={11} /></button>
                </span>
              )}

              {sortBy !== 'newest' && (
                <span className="admin-filter-chip">
                  Sort: {sortBy}
                  <button type="button" onClick={() => setSortBy('newest')} title="Reset sort"><X size={11} /></button>
                </span>
              )}
            </div>

            {(searchQuery || statusFilter !== 'ALL' || (paymentFilter !== 'Paid' && activeViewTab === 'paid') || (paymentFilter !== 'Pending' && activeViewTab === 'unpaid') || (paymentFilter !== 'ALL' && activeViewTab === 'all') || sortBy !== 'newest') && (
              <button 
                type="button" 
                onClick={resetFilters} 
                className="btn-clear-all-chips"
                title="Clear applied filters"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="admin-error-banner">
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
          ) : processedOrders.length === 0 ? (
            <div className="admin-empty-state">
              <Package size={42} style={{ margin: '0 auto 0.5rem auto', color: '#cbd5e1' }} />
              <h4>No Orders Found</h4>
              <p>No orders matched your current search or filter criteria.</p>
              <button type="button" onClick={resetFilters} className="btn-reset-filters" style={{ marginTop: '0.5rem' }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="admin-table-container desktop-only-view">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Order ID</th>
                    <th style={{ width: '140px' }}>Placed Date</th>
                    <th>Customer Details</th>
                    <th style={{ width: '120px' }}>Payment</th>
                    <th style={{ width: '130px' }}>Fulfillment</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ width: '175px', minWidth: '175px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedOrders.map(order => {
                    const formattedDate = order.created_at
                      ? new Date(order.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : '—';
                    const formattedTime = order.created_at
                      ? new Date(order.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : '';

                    const isGuest = order.customer_type === 'guest' || !order.customer_id;
                    const customerInitial = (order.customer_name || 'C').trim().charAt(0).toUpperCase();
                    const isOrderPaid = String(order.payment_status || '').toLowerCase() === 'paid';

                    return (
                      <tr 
                        key={order.id} 
                        className={`admin-order-row ${!isOrderPaid ? 'row-unpaid-warning' : ''}`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="order-id-cell">
                          <div className="order-id-container">
                            <span className="order-id-code">#{order.display_order_id || order.id.slice(0, 8).toUpperCase()}</span>
                            {!isOrderPaid && (
                              <span className="badge-unpaid-tag" title="Customer never completed payment on Razorpay">
                                <AlertTriangle size={10} />
                                <span>UNPAID</span>
                              </span>
                            )}
                            {getOrderCoupon(order) && (
                              <span className="order-coupon-pill" title={`Coupon: ${getOrderCoupon(order)}`}>
                                <Tag size={10} />
                                <span>{getOrderCoupon(order)}</span>
                              </span>
                            )}
                            {checkIsBybOrder(order) && (
                              <span className="badge-byb">BYB</span>
                            )}
                            <button
                              type="button"
                              className="btn-table-copy"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(order.display_order_id || order.id, order.id);
                              }}
                              title="Copy Order ID"
                            >
                              {copiedKey === order.id ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                            </button>
                          </div>
                        </td>
                        <td className="order-date-cell">
                          <span className="order-date-primary">{formattedDate}</span>
                          <span className="order-time-sub">{formattedTime}</span>
                        </td>
                        <td>
                          <div className="order-customer-meta">
                            <div className="customer-avatar-circle">
                              {customerInitial}
                            </div>
                            <div className="customer-text-col">
                              <div className="customer-name-row">
                                <span className="customer-name">{order.customer_name || 'Customer'}</span>
                                <span className={`badge-type-inline ${isGuest ? 'badge-guest' : 'badge-reg'}`}>
                                  {isGuest ? 'Guest' : 'Member'}
                                </span>
                              </div>
                              <span className="customer-subtext">{order.customer_phone || order.customer_email || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill status-pill-with-dot ${isOrderPaid ? 'status-shipped' : 'status-payment-unpaid'}`}>
                            <span className={`status-dot ${isOrderPaid ? 'dot-green' : 'dot-red'}`}></span>
                            <span>{isOrderPaid ? 'Paid' : 'Unpaid (Pending)'}</span>
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill status-pill-with-dot ${getStatusClass(order.order_status)}`}>
                            <span className="status-dot"></span>
                            <span>{order.order_status || 'Pending'}</span>
                          </span>
                        </td>
                        <td className="order-amount-cell" style={{ textAlign: 'right' }}>
                          ₹{(Number(order.total_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div className="order-actions-flex" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn-action-view"
                              onClick={() => setSelectedOrder(order)}
                              title="View full order details"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action-label"
                              onClick={() => setPrintingOrder(order)}
                              title="Print 4x6 Thermal Delivery Label or A4 Tax Invoice"
                            >
                              <Printer size={12} />
                              <span>Label</span>
                            </button>
                            <button
                              type="button"
                              className={`btn-action-delete ${!isOrderPaid ? 'btn-action-delete-prominent' : ''}`}
                              onClick={() => handleDeleteOrder(order)}
                              title={!isOrderPaid ? "Permanently delete this unpaid checkout attempt" : "Permanently delete this order"}
                              disabled={isDeletingOrder}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Order Cards View (Optimized for Small Screens) */}
            <div className="admin-mobile-cards-container mobile-only-view">
              {processedOrders.map(order => {
                const formattedDate = order.created_at
                  ? new Date(order.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : '—';
                const formattedTime = order.created_at
                  ? new Date(order.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                  : '';

                const isGuest = order.customer_type === 'guest' || !order.customer_id;
                const customerInitial = (order.customer_name || 'C').trim().charAt(0).toUpperCase();
                const isOrderPaid = String(order.payment_status || '').toLowerCase() === 'paid';

                return (
                  <div
                    key={order.id}
                    className={`admin-order-mobile-card ${!isOrderPaid ? 'row-unpaid-warning' : ''}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Top Row: Order ID + Status */}
                    <div className="mobile-card-top-row">
                      <div className="mobile-card-id-group">
                        <span className="order-id-code">#{order.display_order_id || order.id.slice(0, 8).toUpperCase()}</span>
                        {!isOrderPaid && (
                          <span className="badge-unpaid-tag" title="Client never completed payment on Razorpay">
                            <AlertTriangle size={10} />
                            <span>UNPAID</span>
                          </span>
                        )}
                        {checkIsBybOrder(order) && (
                          <span className="badge-byb">BYB</span>
                        )}
                        <button
                          type="button"
                          className="btn-table-copy"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(order.display_order_id || order.id, order.id);
                          }}
                          title="Copy Order ID"
                        >
                          {copiedKey === order.id ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <span className={`status-pill status-pill-with-dot ${getStatusClass(order.order_status)}`}>
                        <span className="status-dot"></span>
                        <span>{order.order_status || 'Pending'}</span>
                      </span>
                    </div>

                    {/* Middle Row: Customer Info + Price */}
                    <div className="mobile-card-middle-row">
                      <div className="customer-avatar-row">
                        <div className="customer-avatar-circle">
                          {customerInitial}
                        </div>
                        <div className="customer-text-col">
                          <span className="customer-name">{order.customer_name || 'Customer'}</span>
                          <span className="customer-subtext">{order.customer_phone || order.customer_email || '—'}</span>
                        </div>
                      </div>
                      <div className="mobile-card-amount-col">
                        <span className="mobile-card-amount">
                          ₹{(Number(order.total_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`status-pill status-pill-compact ${isOrderPaid ? 'status-shipped' : 'status-payment-unpaid'}`}>
                          <span className={`status-dot ${isOrderPaid ? 'dot-green' : 'dot-red'}`}></span>
                          <span>{isOrderPaid ? 'Paid' : 'Unpaid'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Meta Row: Date & Customer Type */}
                    <div className="mobile-card-meta-row">
                      <span className="mobile-card-date">
                        {formattedDate} • {formattedTime}
                      </span>
                      <span className={`badge-customer-type ${isGuest ? 'badge-guest' : 'badge-registered'}`}>
                        {isGuest ? 'Guest' : 'Registered'}
                      </span>
                    </div>

                    {/* Footer Row: Action Buttons */}
                    <div className="mobile-card-footer-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-mobile-action"
                        onClick={() => setSelectedOrder(order)}
                        title="View order details"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="btn-mobile-action"
                        onClick={() => setPrintingOrder(order)}
                        title="Print Thermal Shipping Label"
                      >
                        <Printer size={13} />
                        <span>Label</span>
                      </button>
                      <button
                        type="button"
                        className="btn-mobile-action btn-mobile-delete"
                        onClick={() => handleDeleteOrder(order)}
                        title="Delete order"
                        disabled={isDeletingOrder}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </section>
      </main>

      {/* 5. Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="admin-drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="admin-drawer-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div className="admin-drawer-header">
              {/* Top Row: Identity & Actions */}
              <div className="drawer-header-main-row">
                <div className="drawer-header-identity">
                  <div className="drawer-header-tags-bar">
                    <span className="drawer-tag-kicker">ORDER DETAILS</span>
                    {checkIsBybOrder(selectedOrder) && (
                      <span className="drawer-tag-byb" title="Build Your Bundle Order">
                        BYB BUNDLE
                      </span>
                    )}
                    {getOrderCoupon(selectedOrder) && (
                      <span className="drawer-tag-coupon" title={`Applied Promo Code: ${getOrderCoupon(selectedOrder)}`}>
                        <Tag size={10} />
                        <span>{getOrderCoupon(selectedOrder)}</span>
                      </span>
                    )}
                    <span className={`status-pill status-pill-compact ${getStatusClass(selectedOrder.order_status)}`}>
                      <span className="status-dot"></span>
                      <span>{selectedOrder.order_status}</span>
                    </span>
                  </div>

                  <div className="drawer-title-and-copy">
                    <h3 className="drawer-order-heading" title={`Order #${selectedOrder.display_order_id || selectedOrder.id}`}>
                      #{selectedOrder.display_order_id || selectedOrder.id}
                    </h3>
                    <button 
                      type="button" 
                      className={`btn-drawer-copy-code ${copiedKey === 'orderId' ? 'copied' : ''}`}
                      onClick={() => handleCopy(selectedOrder.display_order_id || selectedOrder.id, 'orderId')}
                      title="Copy Order ID"
                      aria-label="Copy Order ID"
                    >
                      {copiedKey === 'orderId' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      <span>{copiedKey === 'orderId' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="drawer-header-actions-group">
                  <button
                    type="button"
                    className="btn-drawer-header-print"
                    onClick={() => setPrintingOrder(selectedOrder)}
                    title="Print Thermal Shipping Label / Tax Invoice"
                  >
                    <Printer size={14} />
                    <span className="btn-text-responsive">Print Bill / Label</span>
                  </button>
                  <button
                    type="button"
                    className="btn-drawer-header-delete"
                    onClick={() => handleDeleteOrder(selectedOrder)}
                    disabled={isDeletingOrder}
                    title="Permanently delete this order"
                  >
                    <Trash2 size={13} />
                    <span className="btn-text-responsive">{isDeletingOrder ? 'Deleting...' : 'Delete'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-drawer-header-close"
                    onClick={() => setSelectedOrder(null)}
                    aria-label="Close details drawer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Metadata Substrip */}
              <div className="drawer-header-substrip">
                <div className="substrip-item">
                  <Clock size={12} className="substrip-icon" />
                  <span>Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}</span>
                </div>
                <span className="substrip-separator">•</span>
                <div className="substrip-item">
                  <CreditCard size={12} className="substrip-icon" />
                  <span>{selectedOrder.razorpay_order_id ? 'Prepaid Online' : 'Cash on Delivery'}</span>
                  <span className={`substrip-payment-pill ${String(selectedOrder.payment_status).toLowerCase() === 'paid' ? 'paid' : 'pending'}`}>
                    {selectedOrder.payment_status || 'Pending'}
                  </span>
                </div>
                <span className="substrip-separator">•</span>
                <div className="substrip-item substrip-amount">
                  <span>Total: <strong>₹{(Number(selectedOrder.total_amount) || 0).toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="admin-drawer-body">
              
              {/* Unpaid Order Security Alert Banner */}
              {String(selectedOrder.payment_status || '').toLowerCase() !== 'paid' && (
                <div className="drawer-unpaid-security-alert">
                  <div className="drawer-alert-icon-col">
                    <AlertTriangle size={24} color="#dc2626" />
                  </div>
                  <div className="drawer-alert-content-col">
                    <div className="drawer-alert-badge">⚠️ CLIENT NEVER PAID</div>
                    <h4>Payment Not Received</h4>
                    <p>
                      This customer initiated checkout but never completed payment on Razorpay. 
                      <strong> Do not pack or dispatch this parcel.</strong>
                    </p>
                  </div>
                  <div className="drawer-alert-action-col">
                    <button
                      type="button"
                      className="btn-drawer-delete-unpaid"
                      onClick={() => handleDeleteOrder(selectedOrder)}
                      disabled={isDeletingOrder}
                      title="Permanently remove this unpaid checkout attempt"
                    >
                      <Trash2 size={13} />
                      <span>{isDeletingOrder ? 'Deleting...' : 'Delete Unpaid Order'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Fulfillment Status Workflow Card */}
              <div className="drawer-section drawer-fulfillment-card">
                <div className="drawer-card-header">
                  <div className="drawer-card-header-left">
                    <Package size={16} className="drawer-section-icon" />
                    <span className="drawer-card-title-text">FULFILLMENT WORKFLOW</span>
                  </div>
                  <span className={`status-pill status-pill-compact ${getStatusClass(selectedOrder.order_status)}`}>
                    <span className="status-dot"></span>
                    <span>Active: {selectedOrder.order_status}</span>
                  </span>
                </div>
                
                {/* Prominent Task Completion / Confirmation Banner */}
                {statusUpdateMessage && (
                  <div className={`drawer-task-alert ${statusUpdateMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    <div className="alert-header">
                      <div className="alert-title-row">
                        {statusUpdateMessage.type === 'success' ? (
                          <div className="alert-icon-check">
                            <CheckCircle2 size={18} color="#059669" />
                          </div>
                        ) : (
                          <div className="alert-icon-error">
                            <AlertCircle size={18} color="#dc2626" />
                          </div>
                        )}
                        <span className="alert-headline">{statusUpdateMessage.headline || statusUpdateMessage.text}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setStatusUpdateMessage(null)}
                        className="btn-close-alert"
                        title="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {statusUpdateMessage.emailDetails && (
                      <div className="alert-detail-pill email-detail-pill">
                        <Mail size={13} color="#047857" />
                        <span><strong>Email Status:</strong> {statusUpdateMessage.emailDetails}</span>
                      </div>
                    )}
                    {statusUpdateMessage.trackingDetails && (
                      <div className="alert-detail-pill tracking-detail-pill">
                        <Truck size={13} color="#0369a1" />
                        <span><strong>Tracking Info:</strong> {statusUpdateMessage.trackingDetails}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Fulfillment Pipeline Stepper Control */}
                <div className="fulfillment-pipeline-wrapper">
                  <div className="fulfillment-segmented-pipeline">
                    {['Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(st => {
                      const isSelected = newOrderStatus === st;
                      const isCurrentActive = selectedOrder.order_status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          className={`pipeline-tab-btn ${isSelected ? 'selected' : ''} ${isCurrentActive ? 'current-active' : ''} ${st === 'Cancelled' ? 'tab-cancelled' : ''}`}
                          onClick={() => setNewOrderStatus(st)}
                          disabled={updatingStatus}
                        >
                          {isCurrentActive && <Check size={12} className="pipeline-active-tick" />}
                          <span>{st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contextual Shipping / Cancellation Inputs & Submit Button */}
                <form onSubmit={handleUpdateStatus} className="status-update-control-box">

                  {/* Shipping & AWB Details Box (When Shipped or Processing) */}
                  {(newOrderStatus === 'Shipped' || selectedOrder.order_status === 'Shipped') && (
                    <div className="drawer-shipping-fields-card">
                      <div className="drawer-shipping-fields-header">
                        <Truck size={14} color="#0284c7" />
                        <span>Courier & AWB Tracking Details</span>
                      </div>
                      <div className="drawer-shipping-grid">
                        <div>
                          <label className="drawer-input-label">Courier Partner</label>
                          <select 
                            value={courierInput} 
                            onChange={(e) => setCourierInput(e.target.value)}
                            className="drawer-select-input"
                          >
                            <option value="Trackon">Trackon Courier</option>
                            <option value="Shiprocket">Shiprocket</option>
                            <option value="India Post">India Post</option>
                            <option value="DTDC">DTDC</option>
                            <option value="Delhivery">Delhivery</option>
                            <option value="Blue Dart">Blue Dart</option>
                          </select>
                        </div>
                        <div>
                          <label className="drawer-input-label">AWB / Consignment No.</label>
                          <input 
                            type="text" 
                            placeholder="e.g. TRK123456" 
                            value={awbInput} 
                            onChange={(e) => setAwbInput(e.target.value)}
                            className="drawer-text-input monospace-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancellation Reason Box */}
                  {newOrderStatus === 'Cancelled' && (
                    <div className="drawer-cancellation-card">
                      <label className="drawer-input-label" style={{ color: '#991b1b', fontWeight: 600 }}>Cancellation Reason (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Customer requested cancellation / Pin code unserviceable" 
                        value={cancellationReason} 
                        onChange={(e) => setCancellationReason(e.target.value)}
                        className="drawer-text-input cancellation-input"
                      />
                    </div>
                  )}

                  {/* Automated Email Notification Checkbox */}
                  {['Shipped', 'Delivered', 'Cancelled'].includes(newOrderStatus) && (
                    <div className="drawer-email-checkbox-row">
                      <input 
                        type="checkbox" 
                        id="notifyEmailCheck" 
                        checked={notifyEmail} 
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                        className="custom-checkbox-input"
                      />
                      <label htmlFor="notifyEmailCheck" className="custom-checkbox-label">
                        Send branded <strong>{newOrderStatus}</strong> email to <span className="highlight-email">{selectedOrder.customer_email}</span>
                      </label>
                    </div>
                  )}

                  {/* Prominent Action Button */}
                  <button
                    type="submit"
                    className={`btn-save-status-full ${actionSuccessKey === 'status_updated' ? 'btn-success-state' : ''}`}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <>
                        <RotateCw size={15} className="animate-spin" />
                        <span>Updating Fulfillment Status...</span>
                      </>
                    ) : actionSuccessKey === 'status_updated' ? (
                      <>
                        <Check size={16} />
                        <span>Fulfillment Updated & Customer Notified ✓</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Update Status to '{newOrderStatus}' & Notify</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="drawer-payment-gateway-note">
                  <ShieldCheck size={13} className="note-shield-icon" />
                  <span>
                    Payment status (<strong>{selectedOrder.payment_status}</strong>) is authoritatively verified by Razorpay payment gateway.
                  </span>
                </div>
              </div>

              {/* 2. Customer Profile Card */}
              <div className="drawer-section drawer-customer-card">
                <div className="drawer-card-header">
                  <div className="drawer-card-header-left">
                    <User size={16} className="drawer-section-icon" />
                    <span className="drawer-card-title-text">CUSTOMER PROFILE</span>
                  </div>
                  <span className={`badge-customer-type ${selectedOrder.customer_type === 'guest' ? 'badge-guest' : 'badge-registered'}`}>
                    {selectedOrder.customer_type === 'guest' ? 'Guest Checkout' : 'Registered Customer'}
                  </span>
                </div>

                <div className="drawer-customer-profile-body">
                  <div className="drawer-customer-hero-row">
                    <div className="drawer-avatar-circle" title={selectedOrder.customer_name || 'Customer'}>
                      {getCustomerInitials(selectedOrder.customer_name)}
                    </div>
                    <div className="drawer-customer-name-col">
                      <h4 className="drawer-customer-fullname">
                        {selectedOrder.customer_name || 'Customer'}
                      </h4>
                      <span className="drawer-customer-id-sub">
                        Account: {selectedOrder.customer_type === 'guest' ? 'Guest Session' : 'Registered Customer'}
                      </span>
                    </div>
                  </div>

                  <div className="drawer-contact-cards-grid">
                    {/* Email Contact Bubble */}
                    <div className="drawer-contact-bubble">
                      <div className="contact-bubble-icon">
                        <Mail size={13} />
                      </div>
                      <div className="contact-bubble-info">
                        <span className="contact-bubble-label">Email Address</span>
                        <a href={`mailto:${selectedOrder.customer_email}`} className="contact-bubble-link" title="Click to compose email">
                          {selectedOrder.customer_email || 'No email provided'}
                        </a>
                      </div>
                      {selectedOrder.customer_email && (
                        <button
                          type="button"
                          className="btn-bubble-copy"
                          onClick={() => handleCopy(selectedOrder.customer_email, 'email')}
                          title="Copy email address"
                        >
                          {copiedKey === 'email' ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>

                    {/* Phone Contact Bubble with WhatsApp action */}
                    <div className="drawer-contact-bubble">
                      <div className="contact-bubble-icon">
                        <Phone size={13} />
                      </div>
                      <div className="contact-bubble-info">
                        <span className="contact-bubble-label">Phone Number</span>
                        {selectedOrder.customer_phone ? (
                          <div className="contact-phone-with-actions">
                            <a href={`tel:${selectedOrder.customer_phone}`} className="contact-bubble-link" title="Call customer">
                              {selectedOrder.customer_phone}
                            </a>
                            <a
                              href={`https://wa.me/91${selectedOrder.customer_phone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${selectedOrder.customer_name || 'Customer'}, regarding your Kabgeer Masale Order #${selectedOrder.display_order_id || selectedOrder.id}: `)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-whatsapp-compact"
                              title="Chat with customer on WhatsApp"
                            >
                              <MessageSquare size={11} />
                              <span>WhatsApp</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        ) : (
                          <span className="contact-bubble-empty">No phone number</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Customer Communications & Notifications Hub */}
              <div className="drawer-section drawer-communications-card">
                <div className="drawer-card-header">
                  <div className="drawer-card-header-left">
                    <Mail size={16} className="drawer-section-icon" />
                    <span className="drawer-card-title-text">COMMUNICATIONS & ENGAGEMENT</span>
                  </div>
                </div>

                <div className="drawer-communications-body">
                  {/* Fulfillment Status Alert Banner */}
                  <div className="drawer-fulfillment-alert-banner">
                    <div className="alert-banner-left">
                      <CheckCircle2 size={16} className="alert-check-icon" />
                      <div className="alert-banner-text">
                        <strong>Fulfillment Alert:</strong> {selectedOrder.order_status} notification email
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={resendingEmail}
                      onClick={() => handleManualResendEmail(selectedOrder)}
                      className={`btn-resend-alert ${actionSuccessKey === 'alert_resent' ? 'btn-success-state' : ''}`}
                      title="Re-send status email notification to customer"
                    >
                      {resendingEmail ? (
                        <>
                          <RotateCw size={11} className="animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : actionSuccessKey === 'alert_resent' ? (
                        <>
                          <Check size={12} />
                          <span>Sent ✓</span>
                        </>
                      ) : (
                        <>
                          <RotateCw size={11} />
                          <span>Resend Alert</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Review Request & Custom Email Communication Tools */}
                  <div className="admin-email-tools-container">
                    
                    {/* 1. Review Request Tool Card */}
                    <div className="email-tool-card email-tool-card-review">
                      <div className="email-tool-header">
                        <div className="email-tool-title">
                          <Star size={15} color="#d4af37" fill="#d4af37" />
                          <span>Customer Review Request</span>
                        </div>
                        {selectedOrder.review_email_sent_at || actionSuccessKey === 'review_sent' ? (
                          <span className="email-tool-badge-sent">
                            ✓ Sent {selectedOrder.review_email_sent_at ? new Date(selectedOrder.review_email_sent_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                          </span>
                        ) : (
                          <span className="email-tool-badge-pending">
                            Not Sent
                          </span>
                        )}
                      </div>

                      <p className="email-tool-desc">
                        Sends royal 1-week review check-in email with star ratings, Google Reviews link, and 10% refill coupon.
                      </p>

                      <button
                        type="button"
                        disabled={sendingReviewEmail}
                        onClick={() => handleSendReviewEmail(selectedOrder)}
                        className={`btn-send-review-email ${actionSuccessKey === 'review_sent' ? 'btn-success-state' : ''}`}
                        title="Send Google Review Request Email"
                      >
                        {sendingReviewEmail ? (
                          <>
                            <RotateCw size={12} className="animate-spin" />
                            <span>Dispatching Review Email...</span>
                          </>
                        ) : actionSuccessKey === 'review_sent' ? (
                          <>
                            <Check size={14} />
                            <span>Review Email Sent ✓</span>
                          </>
                        ) : selectedOrder.review_email_sent_at ? (
                          <>
                            <RotateCw size={12} />
                            <span>Resend Review Request Email</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            <span>Send Review Request Email</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 2. Custom Email Composer Tool */}
                    <div className="email-tool-card">
                      <div className="email-tool-header" style={{ marginBottom: showCustomEmailComposer ? '0.5rem' : '0' }}>
                        <div className="email-tool-title">
                          <MessageSquare size={14} color="#0284c7" />
                          <span>Direct Customer Email</span>
                        </div>
                        {selectedOrder.custom_email_sent_at && !showCustomEmailComposer && (
                          <span className="email-tool-badge-sent">
                            ✓ Last Sent {new Date(selectedOrder.custom_email_sent_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCustomEmailComposer(prev => !prev)}
                        className="btn-toggle-composer"
                      >
                        <span>{showCustomEmailComposer ? 'Close Composer' : '✉️ Compose Custom Message'}</span>
                        {showCustomEmailComposer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {showCustomEmailComposer && (
                        <form onSubmit={handleSendCustomEmail} style={{ marginTop: '0.65rem' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                            Quick Presets:
                          </div>
                          <div className="composer-presets-row">
                            <button
                              type="button"
                              className={`preset-chip-btn ${selectedPreset === 'review' ? 'active' : ''}`}
                              onClick={() => handleApplyPreset('review', selectedOrder)}
                            >
                              ⭐ Review Request
                            </button>
                            <button
                              type="button"
                              className={`preset-chip-btn ${selectedPreset === 'address' ? 'active' : ''}`}
                              onClick={() => handleApplyPreset('address', selectedOrder)}
                            >
                              📍 Address Check
                            </button>
                            <button
                              type="button"
                              className={`preset-chip-btn ${selectedPreset === 'delivery_update' ? 'active' : ''}`}
                              onClick={() => handleApplyPreset('delivery_update', selectedOrder)}
                            >
                              🚚 Shipping Update
                            </button>
                            <button
                              type="button"
                              className={`preset-chip-btn ${selectedPreset === 'vip_offer' ? 'active' : ''}`}
                              onClick={() => handleApplyPreset('vip_offer', selectedOrder)}
                            >
                              🎁 10% VIP Coupon
                            </button>
                            <button
                              type="button"
                              className={`preset-chip-btn ${selectedPreset === 'custom' ? 'active' : ''}`}
                              onClick={() => handleApplyPreset('custom', selectedOrder)}
                            >
                              ✍️ Blank Custom
                            </button>
                          </div>

                          <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Email Subject</label>
                            <input
                              type="text"
                              value={customEmailSubject}
                              onChange={(e) => setCustomEmailSubject(e.target.value)}
                              placeholder="e.g. Regarding your Order..."
                              className="composer-input-field"
                              required
                            />
                          </div>

                          <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Message Text (Wrapped in Royal Template)</label>
                            <textarea
                              value={customEmailMessage}
                              onChange={(e) => setCustomEmailMessage(e.target.value)}
                              placeholder="Type your custom note or message to the customer..."
                              className="composer-textarea"
                              rows={4}
                              required
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setShowCustomEmailComposer(false)}
                              className="preset-chip-btn"
                              style={{ padding: '0.45rem 0.8rem' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={sendingCustomEmail || !customEmailSubject.trim() || !customEmailMessage.trim()}
                              className={`btn-send-custom-submit ${actionSuccessKey === 'custom_email_sent' ? 'btn-success-state' : ''}`}
                            >
                              {sendingCustomEmail ? (
                                <>
                                  <RotateCw size={12} className="animate-spin" />
                                  <span>Sending Email...</span>
                                </>
                              ) : actionSuccessKey === 'custom_email_sent' ? (
                                <>
                                  <Check size={13} />
                                  <span>Email Sent ✓</span>
                                </>
                              ) : (
                                <>
                                  <Send size={12} />
                                  <span>Send Custom Email</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                  </div>
                </div>
              </div>

              {/* 4. Delivery & Shipping Address */}
              <div className="drawer-section drawer-address-card">
                <div className="drawer-card-header">
                  <div className="drawer-card-header-left">
                    <MapPin size={16} className="drawer-section-icon" />
                    <span className="drawer-card-title-text">SHIPPING & DELIVERY ADDRESS</span>
                  </div>
                  {selectedOrder.shipping_address && (
                    <button 
                      type="button" 
                      className="btn-copy-address-pill"
                      onClick={() => {
                        const addr = `${selectedOrder.shipping_address.firstName || ''} ${selectedOrder.shipping_address.lastName || ''}\n${selectedOrder.shipping_address.address || ''} ${selectedOrder.shipping_address.apartment || ''}\n${selectedOrder.shipping_address.city || ''}, ${selectedOrder.shipping_address.state || ''} - ${selectedOrder.shipping_address.pinCode || ''}\nPhone: ${selectedOrder.shipping_address.phone || selectedOrder.customer_phone || ''}`;
                        handleCopy(addr, 'address');
                      }}
                      title="Copy full shipping address for courier label"
                    >
                      {copiedKey === 'address' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      <span>{copiedKey === 'address' ? 'Copied' : 'Copy Courier Slip'}</span>
                    </button>
                  )}
                </div>
                {selectedOrder.shipping_address ? (
                  <div className="drawer-address-content">
                    <div className="address-recipient-name">
                      {selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}
                    </div>
                    <div className="address-line">
                      {selectedOrder.shipping_address.address}
                      {selectedOrder.shipping_address.apartment ? `, ${selectedOrder.shipping_address.apartment}` : ''}
                    </div>
                    <div className="address-line city-state-pin">
                      <span>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}</span>
                      <span className="pincode-badge">PIN: {selectedOrder.shipping_address.pinCode}</span>
                    </div>
                    <div className="address-line country-line">
                      {selectedOrder.shipping_address.country || 'India'}
                    </div>
                    {(selectedOrder.shipping_address.phone || selectedOrder.customer_phone) && (
                      <div className="address-phone-line">
                        <Phone size={12} />
                        <span>Contact: <strong>{selectedOrder.shipping_address.phone || selectedOrder.customer_phone}</strong></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="drawer-empty-notice">No structured delivery address found for this order.</p>
                )}
              </div>

              {/* 5. Ordered Products */}
              <div className="drawer-section drawer-products-card">
                <div className="drawer-card-header">
                  <div className="drawer-card-header-left">
                    <Package size={16} className="drawer-section-icon" />
                    <span className="drawer-card-title-text">ORDERED PRODUCTS</span>
                  </div>
                  <span className="drawer-count-badge">
                    {selectedOrder.order_items?.length || 0} {(selectedOrder.order_items?.length === 1) ? 'item' : 'items'}
                  </span>
                </div>
                
                <div className="drawer-items-list">
                  {(selectedOrder.order_items || []).map((item, idx) => (
                    <div key={item.id || idx} className="drawer-item-row">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="drawer-item-img" />
                      ) : (
                        <div className="drawer-item-img-placeholder">
                          <Package size={18} color="#94a3b8" />
                        </div>
                      )}
                      <div className="drawer-item-meta">
                        <span className="drawer-item-name">{item.product_name}</span>
                        <span className="drawer-item-qty">
                          Qty: <strong>{item.quantity}</strong> × ₹{(Number(item.unit_price) || 0).toFixed(2)}
                        </span>
                      </div>
                      <span className="drawer-item-total">
                        ₹{(Number(item.total_price) || (Number(item.unit_price) * item.quantity) || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  {/* BYB Complimentary Gift Pack Row */}
                  {(selectedOrder.display_order_id?.startsWith('BYB') || selectedOrder.display_order_id?.includes('BYB')) && (
                    <div className="drawer-item-row byb-gift-drawer-row">
                      <div className="byb-gift-icon-bubble">
                        🎁
                      </div>
                      <div className="drawer-item-meta">
                        <div className="byb-gift-title-row">
                          <span className="byb-gift-name">2x Mini Masala Boxes (Assorted Sample Pack)</span>
                          <span className="byb-gift-tag">ROYAL GIFT</span>
                        </div>
                        <span className="byb-gift-subtitle">
                          Qty: 2 • Complimentary Build Your Bundle (BYB) Offer Gift
                        </span>
                      </div>
                      <span className="byb-gift-free-badge">
                        FREE
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Payment & Financial Breakdown */}
              <div className="drawer-section drawer-financials-card">
                <div className="drawer-card-header">
                  <div className="drawer-card-header-left">
                    <CreditCard size={16} className="drawer-section-icon" />
                    <span className="drawer-card-title-text">PAYMENT & FINANCIAL BREAKDOWN</span>
                  </div>
                  <span className={`status-pill status-pill-compact ${getStatusClass(selectedOrder.payment_status)}`}>
                    <span className="status-dot"></span>
                    <span>{selectedOrder.payment_status || 'Pending'}</span>
                  </span>
                </div>

                {/* Prominent Coupon / Promotion Banner */}
                {selectedOrder.display_order_id?.startsWith('BYB') || selectedOrder.display_order_id?.includes('BYB') ? (
                  <div className="drawer-coupon-callout-card bundle-promo">
                    <div className="coupon-callout-header">
                      <div className="coupon-pill-large bundle">
                        <Sparkles size={13} />
                        <span>BUILD YOUR BUNDLE (BYB) ORDER</span>
                      </div>
                      <span className="coupon-applied-status">✓ 10% Off + 2 Free Mini Boxes</span>
                    </div>
                    <div className="coupon-callout-desc">
                      Customer ordered 4+ royal masalas, qualifying for <strong>Build Your Bundle (BYB)</strong>.
                      {getOrderCoupon(selectedOrder) ? (
                        <> Promo code <code>{getOrderCoupon(selectedOrder)}</code> applied (Saved <strong>₹{Number(selectedOrder.discount).toFixed(2)}</strong>).</>
                      ) : (
                        <> Saved <strong>₹{Number(selectedOrder.discount).toFixed(2)}</strong> with 10% Bundle Discount.</>
                      )}
                    </div>
                  </div>
                ) : getOrderCoupon(selectedOrder) ? (
                  <div className="drawer-coupon-callout-card">
                    <div className="coupon-callout-header">
                      <div className="coupon-pill-large">
                        <Tag size={13} />
                        <span>COUPON: {getOrderCoupon(selectedOrder)}</span>
                      </div>
                      <span className="coupon-applied-status">✓ Discount Applied</span>
                    </div>
                    <div className="coupon-callout-desc">
                      Customer applied promo code <code>{getOrderCoupon(selectedOrder)}</code> and saved <strong>₹{Number(selectedOrder.discount).toFixed(2)}</strong>.
                    </div>
                  </div>
                ) : Number(selectedOrder.discount) > 0 ? (
                  <div className="drawer-coupon-callout-card bundle-promo">
                    <div className="coupon-callout-header">
                      <div className="coupon-pill-large bundle">
                        <Sparkles size={13} />
                        <span>BUNDLE SPECIAL OFFER</span>
                      </div>
                      <span className="coupon-applied-status">✓ Deal Applied</span>
                    </div>
                    <div className="coupon-callout-desc">
                      Customer saved <strong>₹{Number(selectedOrder.discount).toFixed(2)}</strong> with 10% Bundle Discount + 2 Free Mini Boxes.
                    </div>
                  </div>
                ) : null}
                
                <div className="drawer-summary-totals">
                  <div className="summary-flex-row">
                    <span className="summary-label">Subtotal</span>
                    <span className="summary-value">₹{(Number(selectedOrder.subtotal) || 0).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.discount) > 0 && (
                    <div className="summary-flex-row summary-discount-row">
                      <span className="summary-label discount-label">
                        {getOrderCoupon(selectedOrder) ? <Tag size={12} /> : <Sparkles size={12} />}
                        Special Discount {
                          checkIsBybOrder(selectedOrder)
                            ? (getOrderCoupon(selectedOrder) ? `(BYB • ${getOrderCoupon(selectedOrder)})` : '(Build Your Bundle 10% Off)')
                            : (getOrderCoupon(selectedOrder) ? `(${getOrderCoupon(selectedOrder)})` : '')
                        }
                      </span>
                      <span className="summary-value discount-value">-₹{Number(selectedOrder.discount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.tax) > 0 && (
                    <div className="summary-flex-row">
                      <span className="summary-label">Tax</span>
                      <span className="summary-value">+₹{Number(selectedOrder.tax).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="summary-flex-row">
                    <span className="summary-label">Shipping Fee</span>
                    <span className={`summary-value ${Number(selectedOrder.shipping_fee) === 0 ? 'free-shipping' : ''}`}>
                      {Number(selectedOrder.shipping_fee) === 0 ? 'FREE DELIVERY' : `+₹${Number(selectedOrder.shipping_fee).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="summary-flex-row summary-final-total">
                    <span className="total-label">Total Amount Paid</span>
                    <span className="total-value">₹{(Number(selectedOrder.total_amount) || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Structured Financial & Payment Details */}
                <div className="drawer-payment-metadata-box">
                  <div className="payment-meta-row">
                    <span className="payment-meta-label">Payment Mode</span>
                    <span className="payment-mode-pill">
                      {selectedOrder.razorpay_order_id ? '⚡ Razorpay Online (Prepaid)' : '💵 Cash on Delivery (COD)'}
                    </span>
                  </div>
                  <div className="payment-meta-row">
                    <span className="payment-meta-label">Payment Status</span>
                    <span className={`status-pill status-pill-compact ${getStatusClass(selectedOrder.payment_status)}`}>
                      <span className="status-dot"></span>
                      <span>{selectedOrder.payment_status || 'Pending'}</span>
                    </span>
                  </div>
                  {selectedOrder.razorpay_order_id && (
                    <div className="payment-meta-row">
                      <span className="payment-meta-label">Razorpay Order ID</span>
                      <div className="payment-meta-copyable">
                        <code>{selectedOrder.razorpay_order_id}</code>
                        <button
                          type="button"
                          className="btn-copy-mini"
                          onClick={() => handleCopy(selectedOrder.razorpay_order_id, 'rzpOrderId')}
                          title="Copy Razorpay Order ID"
                        >
                          {copiedKey === 'rzpOrderId' ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  )}
                  {Number(selectedOrder.discount) > 0 && (
                    <div className="savings-highlight-banner">
                      🎉 Customer saved a total of <strong>₹{Number(selectedOrder.discount).toFixed(2)}</strong> on this order!
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 6. Production & Deliverable Ready Bill / Thermal Shipping Label Modal */}
      {printingOrder && (
        <PrintableThermalBill
          order={printingOrder}
          onClose={() => setPrintingOrder(null)}
          onUpdateShipping={(courier, awb) => {
            if (selectedOrder && (selectedOrder.id === printingOrder.id)) {
              setCourierInput(courier);
              setAwbInput(awb);
            }
          }}
        />
      )}

    </div>
  );
};

export default AdminDashboardPage;
