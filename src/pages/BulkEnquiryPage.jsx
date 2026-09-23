import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, CheckCircle, X } from 'lucide-react';
import bannerImg from '../assets/banner.png';
import './BulkEnquiryPage.css';

const WhatsAppIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const BulkEnquiryPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    quantity: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWhatsApp = (e) => {
    e.preventDefault();
    const text = `Hi Kabgeer Masale, I'm interested in a bulk order.\n\n*Name:* ${formData.name}\n*Business:* ${formData.businessName}\n*Expected Quantity:* ${formData.quantity}\n*Requirements:* ${formData.message}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/918090086636?text=${encodedText}`, '_blank');
    setIsSubmitted(true);
    setShowModal(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setShowModal(false);
    setFormData({
      name: '',
      businessName: '',
      quantity: '',
      message: ''
    });
  };

  return (
    <div className="bulk-page">
      {/* Hero Section */}
      <div className="bulk-hero" style={{ backgroundColor: 'var(--color-primary)' }}>
        <div className="bulk-hero-overlay"></div>
        <div className="container bulk-hero-content">
          <h1>Partner With Us</h1>
          <p>Premium Spice Blends for HORECA & Corporate Gifting</p>
        </div>
      </div>

      <div className="container bulk-main">
        <div className="bulk-grid">
          {/* Left Column: Info */}
          <div className="bulk-info">
            <h2>Elevate Your Culinary Offerings</h2>
            <p className="bulk-intro">
              At Kabgeer Masale, we understand that consistency and authenticity are the cornerstones of a great commercial kitchen. Our bulk offerings are tailored to meet the rigorous demands of restaurants, caterers, and food manufacturers.
            </p>
            
            <div className="benefits-list">
              <div className="benefit-item">
                <CheckCircle className="benefit-icon" size={20} />
                <div>
                  <h4>Consistent Quality</h4>
                  <p>Standardized flavor profiles batch after batch.</p>
                </div>
              </div>
              <div className="benefit-item">
                <CheckCircle className="benefit-icon" size={20} />
                <div>
                  <h4>Authentic Heritage</h4>
                  <p>Traditional recipes that bring true Indian flavors.</p>
                </div>
              </div>
              <div className="benefit-item">
                <CheckCircle className="benefit-icon" size={20} />
                <div>
                  <h4>Custom Solutions</h4>
                  <p>Tailored packaging and blends for high-volume needs.</p>
                </div>
              </div>
            </div>

            <div className="contact-details">
              <h3>Direct Contact</h3>
              <a href="tel:+918090086636" className="contact-item" style={{ textDecoration: 'none' }}>
                <Phone size={18} /> <span>+91 80900 86636</span>
              </a>
              <a href="mailto:enquiry@kabgeermasala.com" className="contact-item" style={{ textDecoration: 'none' }}>
                <Mail size={18} /> <span>enquiry@kabgeermasala.com</span>
              </a>
              <div className="contact-item">
                <MapPin size={18} /> <span>Kanpur, Uttar Pradesh, India</span>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bulk-form-wrapper">
            <div className="bulk-form-card">
              <h3>Submit an Enquiry</h3>
              <p className="form-subtitle">Fill out the details below and connect with us instantly via WhatsApp.</p>
              
              {isSubmitted ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ color: '#10B981', marginBottom: '1rem', display: 'inline-flex' }}>
                    <CheckCircle size={48} />
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                    Enquiry Forwarded!
                  </h4>
                  <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Your bulk requirements have been formatted and directed to our sales desk. We'll connect with you shortly.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '300px', margin: '0 auto' }}>
                    <a
                      href={`mailto:enquiry@kabgeermasala.com?subject=Bulk Enquiry from ${encodeURIComponent(formData.name)} (${encodeURIComponent(formData.businessName)})&body=${encodeURIComponent(`Name: ${formData.name}\nBusiness: ${formData.businessName}\nQuantity: ${formData.quantity}\nRequirements:\n${formData.message}`)}`}
                      className="btn-whatsapp"
                      style={{ backgroundColor: 'var(--color-primary)', textDecoration: 'none', padding: '0.8rem', fontSize: '0.95rem' }}
                    >
                      <Mail size={18} /> Also Email Us
                    </a>
                    <button
                      type="button"
                      onClick={handleReset}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--color-primary)',
                        fontWeight: '500'
                      }}
                    >
                      Submit Another Enquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleWhatsApp} className="bulk-form">
                  <div className="form-row">
                    <div className="input-group">
                      <label>Full Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
                    </div>
                    <div className="input-group">
                      <label>Business Name</label>
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required placeholder="Restaurant / Catering Co." />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>Expected Monthly Quantity (kg)</label>
                    <input type="text" name="quantity" value={formData.quantity} onChange={handleChange} required placeholder="e.g. 50 kg" />
                  </div>
                  
                  <div className="input-group">
                    <label>Specific Requirements</label>
                    <textarea name="message" rows="4" value={formData.message} onChange={handleChange} required placeholder="Tell us about your specific spice needs..."></textarea>
                  </div>
                  
                  <button type="submit" className="btn-whatsapp">
                    <WhatsAppIcon size={20} /> Connect on WhatsApp
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enquiry Confirmation Popup Modal */}
      {showModal && (
        <div className="enquiry-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="enquiry-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="enquiry-modal-close-btn" onClick={() => setShowModal(false)} aria-label="Close modal">
              <X size={20} />
            </button>
            <div className="enquiry-modal-icon-wrap">
              <CheckCircle size={54} />
            </div>
            <h3>Bulk Enquiry Forwarded!</h3>
            <p>
              Thank you, <strong>{formData.name || 'Valued Partner'}</strong>! Your bulk requirements have been prepared and directed to our sales team. We will review and reach out shortly.
            </p>
            <div className="enquiry-modal-footer-actions">
              <button
                type="button"
                className="btn-whatsapp enquiry-modal-action-btn"
                onClick={() => setShowModal(false)}
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkEnquiryPage;
