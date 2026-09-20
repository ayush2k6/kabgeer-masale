import React from 'react';
import { Link } from 'react-router-dom';
import { Share2, Globe, Mail, HelpCircle, Truck, RotateCcw, Shield, FileText, Home, Package, BookOpen, Info, Phone, Heart, Award } from 'lucide-react';
import './Footer.css';
import logo from '../assets/logo.png';

const WhatsAppIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const FacebookIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const InstagramIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const YoutubeIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
  </svg>
);

const AmazonIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.68 18.06c-1.4 0-2.96-.25-4.63-.75-.88-.26-1.83-.64-2.83-1.12-.43-.21-.61-.71-.44-1.15.18-.46.7-.69 1.17-.49.92.39 1.8.74 2.62.98 1.55.45 2.99.68 4.27.68 2.75 0 5.08-1.09 6.93-3.23.37-.43 1.01-.47 1.44-.1.43.37.47 1.02.09 1.45-2.15 2.49-4.88 3.73-8.62 3.73zm8.42-1.48c-.43.35-.86.67-1.27.95-.54.38-1.3.47-1.81.14-.51-.32-.76-1.03-.56-1.63.24-.75.63-1.45 1.13-2.06.34-.4.95-.44 1.4-.07.31.26.63.5.94.74.32.23.52.6.52.99 0 .43-.23.81-.57 1.05l-.23.16v-.27z" />
    <path d="M14.07 14.73c-1.22 0-2.31-.38-3.18-1.13-.85-.73-1.33-1.74-1.33-2.95 0-2.52 2.01-4.04 5.3-4.14v-.27c0-1.24-.87-1.87-2.61-1.87-1.45 0-2.82.4-3.79 1.09-.32.22-.76.13-1-.2l-.84-1.13c-.22-.3-.13-.73.19-.94 1.34-.87 3.32-1.39 5.56-1.39 1.9 0 3.25.47 4.02 1.39.79.93.97 2.45.97 4v3.66c0 .77.06 1.25.17 1.62.13.43.38.64.38.64.12.11.18.25.18.4 0 .34-.27.61-.61.61h-2.18c-.28 0-.52-.19-.58-.46-.11-.47-.15-.99-.13-1.52-.96 1.02-2.36 1.6-3.82 1.6zm.57-2.03c.89 0 1.72-.34 2.25-1.02.39-.5.54-1.09.54-1.77v-1.15c-1.89.09-3.23.51-3.23 1.83 0 .54.21 1.01.59 1.34.39.34.91.53 1.54.53z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="footer-wrapper">
      <div className="container footer-inner">

        {/* Brand Column */}
        <div className="footer-brand">
          <Link to="/" className="footer-logo-link">
            <img src={logo} alt="Kabgeer Masale Logo" className="footer-brand-logo" />
          </Link>
          <p className="brand-desc">
            Bringing authentic 65-year-old Lucknavi spice formulations and rich flavors to kitchens across India with love and tradition.
          </p>
          <div className="social-links">
            <a href="https://wa.me/8090086636" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon size={18} /></a>
            <a href="https://www.instagram.com/kabgeermasala/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon size={18} /></a>
            <a href="https://www.youtube.com/@KabgeerMasala" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><YoutubeIcon size={18} /></a>
            <a href="https://www.amazon.in/stores/Kabgeer/page/3CB7A6A7-3FAE-4F2A-AA0A-61D8DE8A5D85?lp_asin=B0CC5NMF1H&ref_=cm_sw_r_ud_ast_store_BEK9P3E003NV0QJ2N7P3&store_ref=bl_ast_dp_brandlogo_sto" target="_blank" rel="noopener noreferrer" aria-label="Amazon"><AmazonIcon size={18} /></a>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="footer-links-group">
          <h4 className="footer-heading">EXPLORE</h4>
          <ul className="policy-links">
            <li>
              <Link to="/">
                <div className="policy-item-icon"><Home size={15} /></div>
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link to="/products">
                <div className="policy-item-icon"><Package size={15} /></div>
                <span>Masala Catalogue</span>
              </Link>
            </li>
            <li>
              <Link to="/bundle">
                <div className="policy-item-icon"><Award size={15} /></div>
                <span>Build Your Bundle</span>
              </Link>
            </li>
            <li>
              <Link to="/recipes">
                <div className="policy-item-icon"><BookOpen size={15} /></div>
                <span>Authentic Recipes</span>
              </Link>
            </li>
            <li>
              <Link to="/about">
                <div className="policy-item-icon"><Info size={15} /></div>
                <span>Our Story</span>
              </Link>
            </li>
            <li>
              <Link to="/contact">
                <div className="policy-item-icon"><Mail size={15} /></div>
                <span>Contact Us</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Policies Column */}
        <div className="footer-links-group">
          <h4 className="footer-heading">POLICIES & HELP</h4>
          <ul className="policy-links">
            <li>
              <Link to="/shipping">
                <div className="policy-item-icon"><Truck size={15} /></div>
                <span>Shipping & Delivery</span>
              </Link>
            </li>
            <li>
              <Link to="/returns">
                <div className="policy-item-icon"><RotateCcw size={15} /></div>
                <span>Returns & Refunds</span>
              </Link>
            </li>
            <li>
              <Link to="/privacy">
                <div className="policy-item-icon"><Shield size={15} /></div>
                <span>Privacy Policy</span>
              </Link>
            </li>
            <li>
              <Link to="/terms">
                <div className="policy-item-icon"><FileText size={15} /></div>
                <span>Terms of Service</span>
              </Link>
            </li>
            <li>
              <Link to="/faqs">
                <div className="policy-item-icon"><HelpCircle size={15} /></div>
                <span>Customer FAQs</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Us Column */}
        <div className="footer-links-group">
          <h4 className="footer-heading">CONTACT US</h4>
          <div className="footer-contact-info">
            <p className="contact-item">
              <Phone size={15} className="contact-icon" />
              <span>+91 8090086636</span>
            </p>
            <p className="contact-item">
              <Mail size={15} className="contact-icon" />
              <span>olympic.kabgeer@gmail.com</span>
            </p>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <div className="container bottom-inner">
          <p>Copyright © 2026 Kabgeer Masale. All rights reserved.</p>
          <p>Crafted with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
