import React, { useEffect } from 'react';
import './Policies.css';

const ReturnsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Returns & Refunds</h1>
        <div className="policy-content">
          <p>Customer satisfaction is important to us.</p>
          <p>Due to the nature of food products, returns are accepted only in the following cases:</p>
          <ul>
            <li>Product received is damaged</li>
            <li>Product received is defective</li>
            <li>Incorrect product delivered</li>
          </ul>
          <p>To report an issue, please contact us within 48 hours of delivery along with supporting photographs.</p>
          <p>Once verified, a replacement or refund will be processed accordingly.</p>
          <p>Refunds, if approved, are typically processed within 5–7 business days through the original payment method.</p>
        </div>
      </div>
    </div>
  );
};

export default ReturnsPage;
