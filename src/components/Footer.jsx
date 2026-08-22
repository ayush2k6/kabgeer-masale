import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Share2, Globe, Mail, HelpCircle, Truck, RotateCcw, Shield, FileText, Home, Package, BookOpen, Info, Phone } from 'lucide-react';
import './Footer.css';
import logo from '../assets/logo.png';

const WhatsAppIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const FacebookIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const InstagramIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Footer = () => {
  return (
    <footer className="footer-wrapper">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src={logo} alt="Kabgeer Masale Logo" style={{ filter: 'invert(1) grayscale(1) contrast(20)', mixBlendMode: 'screen' }} />
          </div>
          <p className="brand-desc">
            Bringing authentic Indian flavours to your kitchen with love and tradition.
          </p>
          <div className="social-links">
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Website"><Globe size={16} /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Share"><Share2 size={16} /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Email"><Mail size={16} /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="WhatsApp"><WhatsAppIcon size={16} /></a>
          </div>
        </div>

        <div className="footer-links-group">
          <h4 className="footer-heading">QUICK LINKS</h4>
          <ul className="policy-links">
            <li>
              <Link to="/">
                <div className="policy-item-icon"><Home size={16} /></div>
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link to="/products">
                <div className="policy-item-icon"><Package size={16} /></div>
                <span>Products</span>
              </Link>
            </li>
            <li>
              <Link to="/recipes">
                <div className="policy-item-icon"><BookOpen size={16} /></div>
                <span>Recipes</span>
              </Link>
            </li>
            <li>
              <Link to="/about">
                <div className="policy-item-icon"><Info size={16} /></div>
                <span>About Us</span>
              </Link>
            </li>
            <li>
              <Link to="/contact">
                <div className="policy-item-icon"><Phone size={16} /></div>
                <span>Contact Us</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-links-group">
          <h4 className="footer-heading">SUPPORT & POLICIES</h4>
          <ul className="policy-links">
            <li>
              <Link to="/faqs">
                <div className="policy-item-icon"><HelpCircle size={16} /></div>
                <span>FAQs</span>
              </Link>
            </li>
            <li>
              <Link to="/shipping">
                <div className="policy-item-icon"><Truck size={16} /></div>
                <span>Shipping & Delivery</span>
              </Link>
            </li>
            <li>
              <Link to="/returns">
                <div className="policy-item-icon"><RotateCcw size={16} /></div>
                <span>Returns & Refunds</span>
              </Link>
            </li>
            <li>
              <Link to="/privacy">
                <div className="policy-item-icon"><Shield size={16} /></div>
                <span>Privacy Policy</span>
              </Link>
            </li>
            <li>
              <Link to="/terms">
                <div className="policy-item-icon"><FileText size={16} /></div>
                <span>Terms & Conditions</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-links-group">
          <h4 className="footer-heading">CONTACT US</h4>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', marginBottom: '1.2rem', fontFamily: 'var(--font-body)' }}>Phone number: +91 9082730822</p>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', marginBottom: '1.2rem', fontFamily: 'var(--font-body)' }}>Email: olympic.kabgeer@gmail.com</p>
          <div className="social-links" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <a href="#" aria-label="Facebook"><FacebookIcon size={20} /></a>
            <a href="#" aria-label="Instagram"><InstagramIcon size={20} /></a>
          </div>
        </div>

      </div>
      <div className="footer-bottom">
        <div className="container bottom-inner">
          <p>© 2026 Kabgeer Masale. All Rights Reserved.</p>
          <p>Made with <span className="heart">❤</span> in India</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
