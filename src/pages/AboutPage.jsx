import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Crown, ShieldCheck, Star, Award, Heart, ThumbsUp, Sparkles, MapPin, Mail, Phone, FileText } from 'lucide-react';
import './AboutPage.css';
import spicesProcessImg from '../assets/spices-process-v2.png';
import rawIngredientsImg from '../assets/raw-ingredients.png';
import bannerImg from '../assets/about-banner.png';
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
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container about-hero-content text-center">
          <p className="about-hero-subtitle">Our Heritage</p>
          <h1 className="about-hero-title">Olympic Foods And Essentials</h1>
          <p className="about-hero-desc">Bringing authentic Indian flavours to your kitchen with love and tradition.</p>
        </div>
      </section>

      {/* Our Story */}
      <section className="about-story">
        <div className="container story-container">
          <div className="story-image-wrapper fade-in-up" data-animate="true">
            <img src={spicesProcessImg} alt="Kabgeer Spices Process" className="story-image" />
          </div>
          <div className="story-text">
            <p className="section-subtitle fade-in-up" data-animate="true">OUR STORY</p>
            <h2 className="fade-in-up" data-animate="true">Kabgeer Story</h2>
            
            <p className="fade-in-up" data-animate="true">
              Kabgeer was never just about spices.<br />
              It began in a small kitchen, filled with warmth and tradition.<br />
              A place where recipes were not written, but remembered.<br />
              Where every dish carried a story.<br />
              Where every aroma meant home.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              More than 65 years ago,<br />
              our family started crafting masalas with care.<br />
              Not for business, but for love.<br />
              Every blend was made by hand.<br />
              Every ingredient was chosen with intention.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              There were no shortcuts.<br />
              No preservatives.<br />
              No compromises.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              Just pure spices,<br />
              ground fresh,<br />
              and mixed with generations of experience.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              Over time, these recipes became a legacy.<br />
              Passed down from one generation to the next.<br />
              Refined, but never changed at heart.
            </p>
            
            <p className="fade-in-up" data-animate="true" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
              Because some things should stay authentic.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              As life became faster,<br />
              we noticed something changing.<br />
              People had less time to cook.<br />
              Fewer people knew traditional recipes.<br />
              And many believed good food required too much effort.
            </p>
            
            <p className="fade-in-up" data-animate="true" style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>
              That’s when Kabgeer was born.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              A simple idea with a powerful purpose—<br />
              to bring authentic taste back into everyday kitchens.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              To make cooking easy.<br />
              To make it fast.<br />
              To make it possible for anyone to cook.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              Even if they’ve never stepped into a kitchen before.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              With Kabgeer,<br />
              you don’t need years of experience.<br />
              You don’t need complicated ingredients.<br />
              You don’t need to be a chef.
            </p>
            
            <p className="fade-in-up" data-animate="true" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
              You just need the will to cook.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              Our ready-to-cook masalas are crafted<br />
              so that anyone can create delicious meals in minutes.<br />
              Without losing the richness of tradition.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              Each pack carries the same taste<br />
              that once filled our home.
            </p>
            
            <p className="fade-in-up" data-animate="true">
              The same aroma that brought families together.<br />
              The same authenticity that defines Indian cooking.
            </p>
            
            <p className="fade-in-up" data-animate="true" style={{ fontStyle: 'italic', color: 'var(--color-accent-dark)', fontWeight: '500' }}>
              From our kitchen to yours,<br />
              we bring you purity you can trust.<br />
              Quality you can taste.
            </p>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="about-difference">
        <div className="container">
          <div className="section-header text-center fade-in-up" data-animate="true">
            <p className="section-subtitle">THE KABGEER STANDARD</p>
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

      {/* Our Promise */}
      <section className="about-promise">
        <div className="container text-center">
          <h2 className="hover-yellow-highlight fade-in-up" data-animate="true" style={{marginBottom: "3rem"}}>Our Promise to You</h2>
          <div className="promise-grid fade-in-up" data-animate="true">
            <div className="promise-item">
              <div className="promise-icon-wrapper">
                <div className="promise-icon-inner"><Award size={32} /></div>
              </div>
              <h4>Authentic Recipes</h4>
            </div>
            <div className="promise-item">
              <div className="promise-icon-wrapper">
                <div className="promise-icon-inner"><Heart size={32} /></div>
              </div>
              <h4>Premium Ingredients</h4>
            </div>
            <div className="promise-item">
              <div className="promise-icon-wrapper">
                <div className="promise-icon-inner"><ShieldCheck size={32} /></div>
              </div>
              <h4>Hygienic Processing</h4>
            </div>
            <div className="promise-item">
              <div className="promise-icon-wrapper">
                <div className="promise-icon-inner"><ThumbsUp size={32} /></div>
              </div>
              <h4>Consistent Quality</h4>
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
                    <p>+91 80900 86636<br/>+91 96956 76611</p>
                  </div>
                </div>
                <div className="company-info-item">
                  <MapPin size={24} className="company-info-icon" />
                  <div>
                    <strong>Address</strong>
                    <p>Plot no 664K, Tadbagiya,<br/>Wajidpur, Jajmau,<br/>Kanpur, Uttar Pradesh - 208010</p>
                  </div>
                </div>
                <div className="company-info-item">
                  <Mail size={24} className="company-info-icon" />
                  <div>
                    <strong>Email id</strong>
                    <p>olympic.kabgeer@gmail.com</p>
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
