import React, { useEffect } from 'react';
import './Policies.css';

const ShippingPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Shipping & Delivery</h1>
        <div className="policy-content">
          <p>At Kabgeer, we strive to ensure that every order reaches you safely and on time.</p>
          <ul>
            <li>Orders are processed within 1–2 business days after confirmation.</li>
            <li>Standard delivery time is 6–7 working days depending on the delivery location.</li>
            <li>Delivery timelines may vary during festivals, holidays, or unforeseen circumstances.</li>
            <li>Once dispatched, tracking details will be shared with the customer.</li>
            <li>Shipping charges, if applicable, will be displayed during checkout.</li>
          </ul>
          <p>For any shipping-related assistance, please contact our support team.</p>
        </div>
      </div>
    </div>
  );
};

export default ShippingPage;
