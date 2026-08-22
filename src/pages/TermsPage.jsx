import React, { useEffect } from 'react';
import './Policies.css';

const TermsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Terms & Conditions</h1>
        <div className="policy-content">
          <p>Welcome to Kabgeer.</p>
          <p>By accessing and using this website, you agree to comply with the following terms:</p>
          <ul>
            <li>All product information and pricing are subject to change without prior notice.</li>
            <li>Orders are subject to acceptance and availability.</li>
            <li>We reserve the right to cancel orders in exceptional circumstances.</li>
            <li>Customers are responsible for providing accurate delivery and contact information.</li>
            <li>Unauthorized use of website content, images, or branding is prohibited.</li>
            <li>Kabgeer shall not be liable for delays caused by courier services, natural events, or circumstances beyond reasonable control.</li>
          </ul>
          <p>Continued use of the website constitutes acceptance of these terms and conditions.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
