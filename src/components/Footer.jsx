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
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M.03 12.015c.048-.078.125-.083.232-.015 2.424 1.406 5.062 2.11 7.913 2.11 1.9 0 3.777-.355 5.63-1.063l.21-.087c.092-.04.157-.068.196-.087.146-.058.26-.03.343.087.082.116.055.223-.08.32-.175.126-.398.272-.67.436-.833.495-1.764.878-2.792 1.15-1.027.27-2.03.407-3.01.407-1.513 0-2.943-.265-4.29-.793-1.35-.528-2.556-1.273-3.623-2.233C.03 12.2 0 12.15 0 12.102c0-.03.01-.058.03-.087zM4.406 7.87c0-.67.165-1.242.495-1.717.33-.475.78-.834 1.353-1.077.523-.223 1.168-.383 1.934-.48.26-.03.688-.068 1.28-.116v-.247c0-.62-.07-1.038-.205-1.25-.203-.292-.523-.438-.96-.438H8.19c-.32.03-.597.13-.83.306-.233.175-.383.418-.45.728-.04.194-.137.306-.292.335L4.945 3.71c-.164-.04-.247-.127-.247-.263 0-.03.005-.063.015-.102.165-.863.57-1.503 1.214-1.92.645-.417 1.4-.65 2.262-.698h.363c1.105 0 1.968.286 2.59.858.096.097.185.202.268.313.083.112.15.21.197.298.05.088.092.214.13.38.04.163.07.277.088.34.02.063.034.2.044.408.01.208.014.332.014.37v3.52c0 .253.036.483.11.69.07.21.142.36.21.452l.334.444c.058.087.087.165.087.233 0 .077-.038.145-.116.203-.806.7-1.242 1.077-1.31 1.135-.116.088-.257.098-.422.03-.136-.116-.254-.228-.356-.335-.102-.106-.175-.184-.218-.232-.044-.05-.114-.143-.21-.284-.098-.142-.166-.236-.205-.285-.544.592-1.077.96-1.6 1.106-.33.098-.738.146-1.223.146-.746 0-1.36-.23-1.84-.69-.48-.46-.72-1.113-.72-1.957zm2.502-.292c0 .378.094.68.283.91.19.227.443.34.763.34.03 0 .07-.004.124-.013.053-.01.09-.015.11-.015.406-.107.722-.368.945-.785.106-.185.186-.386.24-.604.053-.217.082-.394.087-.53.005-.136.007-.36.007-.67v-.363c-.563 0-.99.04-1.28.117-.854.242-1.28.78-1.28 1.614zm6.108 4.684c.02-.04.05-.078.087-.117.243-.164.476-.276.7-.334.367-.096.726-.15 1.075-.16.097-.01.19-.004.276.015.437.04.7.112.786.22.04.057.058.144.058.26v.102c0 .34-.092.74-.276 1.2-.185.46-.442.832-.77 1.113-.05.04-.093.058-.132.058-.02 0-.04-.005-.058-.014-.06-.03-.073-.083-.044-.16.36-.844.538-1.43.538-1.76 0-.107-.02-.185-.058-.233-.097-.115-.368-.174-.815-.174-.164 0-.358.01-.58.03-.244.03-.467.058-.67.087-.06 0-.097-.01-.117-.03-.02-.02-.024-.038-.014-.058 0-.01.004-.024.014-.043z"
    />
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
            Bringing authentic 65 year old spice formulations and rich flavors to kitchens across India with love and tradition.
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

        {/* Bulk Enquiry Column */}
        <div className="footer-links-group">
          <h4 className="footer-heading">BULK ENQUIRY</h4>
          <div className="footer-contact-info">
            <p className="contact-item">
              <Phone size={15} className="contact-icon" />
              <span>+91 8090086636</span>
            </p>
            <p className="contact-item">
              <Mail size={15} className="contact-icon" />
              <span>enquiry@kabgeermasala.com</span>
            </p>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <div className="container bottom-inner">
          <p>Copyright © 2026 Kabgeer Masala. All rights reserved.</p>
          <p>Crafted with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
