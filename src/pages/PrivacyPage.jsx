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
          <p>We do not sell, rent, or share personal information with unauthorized third parties. Personal data is shared strictly with essential service providers necessary to fulfill your purchases, including payment gateways (Razorpay) and logistics partners for shipment delivery.</p>

          <h3>Data Protection & Customer Rights (DPDP Act, 2023):</h3>
          <p>In accordance with the Digital Personal Data Protection Act, 2023, you have the following rights regarding your personal information:</p>
          <ul>
            <li><strong>Right to Access:</strong> You may request a summary of the personal data we hold about you.</li>
            <li><strong>Right to Correction:</strong> You may request the correction or updating of inaccurate or incomplete personal data.</li>
            <li><strong>Right to Erasure:</strong> You may request the deletion of your personal data when it is no longer required for fulfillment, subject to statutory tax and commercial invoicing requirements.</li>
            <li><strong>Grievance Redressal:</strong> For any privacy-related inquiries, corrections, or erasure requests, contact us at <code>support@kabgeermasala.com</code>.</li>
          </ul>

          <p>By using our website, you consent to the collection and use of information as described in this policy.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
