import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, ChevronDown, CheckCircle, Package } from 'lucide-react';
import './ContactPage.css';

// WhatsApp Icon component
const WhatsAppIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const FAQs = [
  {
    q: "Do you ship internationally?",
    a: "Currently, we only ship within India. We are working on expanding our delivery network globally soon."
  },
  {
    q: "How can I track my order?",
    a: "Once your order is dispatched, you will receive a tracking link via SMS and email to track your shipment in real-time."
  },
  {
    q: "Are your masalas suitable for a Jain diet?",
    a: "Yes! We have a dedicated range of 100% Jain-friendly masalas made without onion or garlic."
  }
];

const ContactPage = () => {
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <p className="contact-hero-subtitle">Get In Touch</p>
        <h1>We're Here To Help</h1>
        <p>Have a question, business enquiry, or feedback? We'd love to hear from you. Reach out to our team through any of the channels below.</p>
      </section>

      {/* Contact Info Cards */}
      <section className="contact-info-section">
        <div className="contact-info-grid">
          <div className="contact-card">
            <div className="contact-icon"><Mail size={24} /></div>
            <h3>Email Us</h3>
            <a href="mailto:olympic.kabgeer@gmail.com">olympic.kabgeer@gmail.com</a>
          </div>
          <div className="contact-card">
            <div className="contact-icon"><Phone size={24} /></div>
            <h3>Call Us</h3>
            <a href="tel:+918090086636">+91 80900 86636</a>
          </div>
          <div className="contact-card">
            <div className="contact-icon"><WhatsAppIcon size={24} /></div>
            <h3>WhatsApp</h3>
            <a href="https://wa.me/918090086636" target="_blank" rel="noopener noreferrer">+91 80900 86636</a>
          </div>
          <div className="contact-card">
            <div className="contact-icon"><MapPin size={24} /></div>
            <h3>Visit Us</h3>
            <p>Plot no 664K, Tadbagiya,<br/>Wajidpur, Jajmau, Kanpur,<br/>Uttar Pradesh - 208010</p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="contact-main">
        <div className="contact-main-grid">
          {/* Form */}
          <div className="contact-form-container">
            <h2>Send a Message</h2>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="John Doe" required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="john@example.com" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="form-group">
                  <label>Enquiry Type</label>
                  <select required className="form-select">
                    <option value="" disabled selected>Select an option</option>
                    <option value="general">General Query</option>
                    <option value="bulk">Bulk / Wholesale Enquiry</option>
                    <option value="feedback">Feedback / Suggestions</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea rows="5" placeholder="Write your message here..." required></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-submit">
                Send Message <Send size={18} />
              </button>
            </form>
          </div>

          {/* Side Content */}
          <div className="contact-side-content">
            {/* Business Enquiries */}
            <div className="business-enquiries">
              <h3>Business Enquiries</h3>
              <p>Looking to partner with Kabgeer Masale? We offer special pricing and support for B2B partners.</p>
              <ul className="business-list">
                <li><CheckCircle size={20} /> Wholesale Partnerships</li>
                <li><CheckCircle size={20} /> Distribution Rights</li>
                <li><Package size={20} /> Corporate Bulk Orders</li>
              </ul>
              <a href="https://wa.me/918090086636" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                <WhatsAppIcon size={20} /> Connect with Sales
              </a>
            </div>

            {/* FAQ Preview */}
            <div className="faq-preview">
              <h3>Quick Answers</h3>
              <div className="accordion">
                {FAQs.map((faq, index) => (
                  <div key={index} className={`accordion-item ${activeFaq === index ? 'active' : ''}`}>
                    <div className="accordion-header" onClick={() => toggleFaq(index)}>
                      {faq.q}
                      <ChevronDown className="accordion-icon" size={20} />
                    </div>
                    <div className="accordion-content">
                      <p>{faq.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Location Map */}
      <section className="contact-map-section" style={{ width: '100%', height: '400px', overflow: 'hidden' }}>
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3573.2093545409703!2d80.4062828752064!3d26.416719776946238!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399c41007f667975%3A0x2bdc5caeaf123660!2stadbagiya%20akbarcompaund%20kanpur%20jajmau!5e0!3m2!1sen!2sin!4v1781963010639!5m2!1sen!2sin" 
          width="100%" 
          height="100%" 
          style={{ border: 0 }} 
          allowFullScreen="" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </section>
      {/* Final CTA */}
      <section className="contact-cta">
        <h2>Let's Bring Authentic Flavours<br/>To More Kitchens Together</h2>
      </section>
    </div>
  );
};

export default ContactPage;
