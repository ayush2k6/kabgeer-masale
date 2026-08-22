import React, { useEffect } from 'react';
import './Policies.css';

const PrivacyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Privacy Policy</h1>
        <div className="policy-content">
          <p>At Kabgeer, we value your privacy and are committed to protecting your personal information.</p>
          <h3>Information collected may include:</h3>
          <ul>
            <li>Name</li>
            <li>Contact Number</li>
            <li>Email Address</li>
            <li>Shipping Address</li>
            <li>Order Details</li>
          </ul>
          <h3>This information is used solely for:</h3>
          <ul>
            <li>Processing and delivering orders</li>
            <li>Customer support</li>
            <li>Order updates and communication</li>
            <li>Improving our services</li>
          </ul>
          <p>We do not sell, rent, or share personal information with unauthorized third parties.</p>
          <p>By using our website, you consent to the collection and use of information as described in this policy.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
