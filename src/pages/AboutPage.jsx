import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Crown, ShieldCheck, Star, Award, Heart, ThumbsUp, Sparkles, MapPin, Mail, Phone, FileText } from 'lucide-react';
import './AboutPage.css';
import rawIngredientsImg from '../assets/raw-ingredients.png';
import recipeBgImg from '../assets/recipe_bg_thali.png';
import spicesProcessBgImg from '../assets/spices-process.png';

const AboutPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    setTimeout(() => {
      const animatedElements = document.querySelectorAll('.fade-in-up, .highlight-text');
      animatedElements.forEach(el => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-page">


      {/* Our Story */}
      <section className="about-story">
        <div className="container story-container">
          <div className="story-header fade-in-up" data-animate="true">
            <h2>Kabgeer's Story</h2>
          </div>
          <div className="story-text">
            <p className="fade-in-up" data-animate="true" style={{ marginBottom: '1.5rem' }}>
              Kabgeer was never just about spices. It began in a small kitchen, filled with warmth and tradition.
              A place where recipes were not written, but remembered. Where every dish carried a story. Where every aroma meant home.
              More than 65 years ago, our family started crafting masalas with care.<br></br>
              <b>Not for business, but for love.</b>
              <br></br>
              Every blend was made by hand. Every ingredient was chosen with intention.
              There were no shortcuts. No preservatives. No compromises. Just pure spices, ground fresh, and mixed with generations of experience.
              Over time, these recipes became a legacy. Passed down from one generation to the next. Refined, but never changed at heart.
              Because some things should stay authentic.
            </p>

            <p className="fade-in-up" data-animate="true">
              As life became faster, we noticed something changing. People had less time to cook. Fewer people knew traditional recipes. And many believed good food required too much effort.
              That’s when Kabgeer was born. <br></br><b>A simple idea with a powerful purpose - to bring authentic taste back into everyday kitchens.</b> To make cooking easy. To make it fast. To make it possible for anyone to cook.
              Even if they’ve never stepped into a kitchen before.
              With Kabgeer, you don’t need years of experience. You don’t need complicated ingredients. You don’t need to be a chef. You just need the will to cook.
              Our ready-to-cook masalas are crafted so that anyone can create delicious meals in minutes. Without losing the richness of tradition.
              Each pack carries the same taste that once filled our home. The same aroma that brought families together. The same authenticity that defines Indian cooking.
              <br></br><b>From our kitchen to yours, we bring you purity you can trust. Quality you can taste.</b>
            </p>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="about-difference">
        <div className="container">
          <div className="section-header text-center fade-in-up" data-animate="true">
            <span className="section-subtitle-badge" style={{ display: 'inline-block', marginBottom: '1rem' }}>THE KABGEER STANDARD</span>
            <h2 className="section-title hover-yellow-highlight">What Makes Us Different</h2>
          </div>

          <div className="difference-grid">
            <div className="diff-card fade-in-up" data-animate="true">
              <div className="diff-icon"><Leaf size={28} /></div>
              <h3>Jain-Friendly</h3>
              <p>Specialized spice range crafted with complete adherence to Jain dietary principles without compromising on taste.</p>
            </div>
            <div className="diff-card">
              <div className="diff-icon"><Crown size={28} /></div>
              <h3>Mughlai Heritage</h3>
              <p>Recipes inspired by the royal kitchens, bringing authentic, rich, and aromatic Mughlai flavours to your table.</p>
            </div>
            <div className="diff-card">
              <div className="diff-icon"><Sparkles size={28} /></div>
              <h3>No Preservatives</h3>
              <p>100% natural blends with absolutely no artificial colours, flavours, or preservatives.</p>
            </div>
            <div className="diff-card">
              <div className="diff-icon"><Star size={28} /></div>
              <h3>Premium Quality</h3>
              <p>We source only the finest, hand-picked ingredients from the best spice farms across the country.</p>
            </div>
          </div>
        </div>
      </section>


      {/* Company Details */}
      <section className="about-company-details">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Company Information</h2>
          </div>
          <div className="company-info-card with-map">
            <div className="company-info-content">
              <h3>Olympic Foods And Essentials</h3>
              <div className="company-info-grid">
                <div className="company-info-item">
                  <Phone size={24} className="company-info-icon" />
                  <div>
                    <strong>Phone No</strong>
                    <p>+91 80900 86636<br /></p>
                  </div>
                </div>
                <div className="company-info-item">
                  <MapPin size={24} className="company-info-icon" />
                  <div>
                    <strong>Address</strong>
                    <p>Plot no 664K, Tadbagiya,<br />Wajidpur, Jajmau,<br />Kanpur, Uttar Pradesh - 208010</p>
                  </div>
                </div>
                <div className="company-info-item">
                  <Mail size={24} className="company-info-icon" />
                  <div>
                    <strong>Email id</strong>
                    <p>enquiry@kabgeermasala.com</p>
                  </div>
                </div>
                <div className="company-info-item">
                  <FileText size={24} className="company-info-icon" />
                  <div>
                    <strong>FSSAI no</strong>
                    <p>12723045000296</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="company-info-map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3573.2093545409703!2d80.4062828752064!3d26.416719776946238!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399c41007f667975%3A0x2bdc5caeaf123660!2stadbagiya%20akbarcompaund%20kanpur%20jajmau!5e0!3m2!1sen!2sin!4v1781963010639!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="about-cta" style={{ backgroundImage: `url(${spicesProcessBgImg})` }}>
        <div className="about-cta-overlay"></div>
        <div className="container about-cta-content">
          <h2>Ready to transform your meals?</h2>
          <Link to="/products" className="btn btn-large mt-4 btn-accent">
            Explore Our Products <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
