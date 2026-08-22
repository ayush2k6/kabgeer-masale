import React from 'react';
import './PageLoader.css';

const PageLoader = ({ isFading }) => {
  return (
    <div className={`page-loader ${isFading ? 'fade-out' : ''}`}>
      <div className="loader-content">

        <div className="cooking-loader">
          <div className="shaker-container">
            <div className="spices-falling">
              <div className="spice spice-1"></div>
              <div className="spice spice-2"></div>
              <div className="spice spice-3"></div>
              <div className="spice spice-4"></div>
              <div className="spice spice-5"></div>
              <div className="spice spice-6"></div>
              <div className="spice spice-7"></div>
              <div className="spice spice-8"></div>
              <div className="spice spice-9"></div>
            </div>
            <div className="shaker">
              <div className="shaker-cap">
                <div className="shaker-cap-top">
                  <div className="hole"></div>
                  <div className="hole"></div>
                  <div className="hole"></div>
                  <div className="hole"></div>
                </div>
                <div className="shaker-cap-rim"></div>
              </div>
              <div className="shaker-glass">
                <div className="shaker-spices-inside"></div>
                <div className="shaker-highlight"></div>
                <div className="shaker-label">K</div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="loader-text">Kabgeer Masale</h2>
        <div className="loader-divider"></div>
        <p className="loader-subtext">Ghar se... Ghar tak...</p>
      </div>
    </div>
  );
};

export default PageLoader;
