import React, { useEffect } from 'react';
import './Policies.css';

const FaqsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">FAQs</h1>
        <div className="policy-content">
          <div className="faq-item">
            <h3 className="faq-question">Are Kabgeer products made using quality ingredients?</h3>
            <p className="faq-answer">Yes. We carefully source and blend our spices to deliver authentic taste, aroma, and consistency in every pack.</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">How long does delivery take?</h3>
            <p className="faq-answer">Orders are typically delivered within 6–7 working days, depending on your location and courier service availability.</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">Can I track my order?</h3>
            <p className="faq-answer">Yes. Tracking details will be shared once your order has been dispatched.</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">Do you accept bulk orders?</h3>
            <p className="faq-answer">Yes. For wholesale, distribution, or bulk purchase enquiries, please contact us through WhatsApp or the enquiry form.</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">How can I contact customer support?</h3>
            <p className="faq-answer">You can reach us through our Contact Us page, WhatsApp, or email for any assistance regarding orders or products.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqsPage;
