import React, { useState } from 'react';
import { CreditCard, X, ShieldCheck } from 'lucide-react';
import './MockPaymentModal.css';

const MockPaymentModal = ({ amount, displayOrderId, razorpayOrderId, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const simulatedPaymentId = `pay_simulated_${Date.now()}`;
      onSuccess({
        razorpay_order_id: razorpayOrderId || `order_simulated_${Date.now()}`,
        razorpay_payment_id: simulatedPaymentId,
        razorpay_signature: `sig_simulated_${Date.now()}`
      });
    }, 1500);
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <button className="close-modal" onClick={onClose} disabled={isProcessing}>
          <X size={20} />
        </button>
        
        <div className="payment-modal-header">
          <h3>Kabgeer Masale</h3>
          <p>Secure Checkout by Razorpay (Test Mode)</p>
          {displayOrderId && <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>Order: {displayOrderId}</p>}
        </div>
        
        <div className="payment-modal-amount">
          <span>Amount to Pay</span>
          <h2>₹{Number(amount || 0).toFixed(2)}</h2>
        </div>

        <div className="payment-modal-body">
          <div className="payment-method selected">
            <div className="method-info">
              <CreditCard size={20} />
              <span>Card / Netbanking / UPI</span>
            </div>
            <div className="method-radio">
              <div className="radio-inner"></div>
            </div>
          </div>
          
          <div className="payment-trust">
            <ShieldCheck size={16} color="#16a34a" />
            <span>100% Secure Payment</span>
          </div>
          
          <button 
            className={`btn btn-primary btn-large w-100 pay-btn ${isProcessing ? 'processing' : ''}`} 
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Payment...' : `Pay ₹${Number(amount || 0).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockPaymentModal;
