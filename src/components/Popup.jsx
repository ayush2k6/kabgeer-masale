import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import popupImage from '../assets/popup.png';
import './Popup.css';

const Popup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show on every mount (which includes refresh and initial entry)
    setIsOpen(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={() => setIsOpen(false)}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={() => setIsOpen(false)}>
          <X size={24} />
        </button>
        <img src={popupImage} alt="Special Offer" className="popup-image" />
      </div>
    </div>
  );
};

export default Popup;
