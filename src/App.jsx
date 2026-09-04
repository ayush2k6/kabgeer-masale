import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

import HomePage from './pages/HomePage';
import CataloguePage from './pages/CataloguePage';
import ProductPage from './pages/ProductPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const BuildBundlePage = lazy(() => import('./pages/BuildBundlePage'));
const BulkEnquiryPage = lazy(() => import('./pages/BulkEnquiryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const FaqsPage = lazy(() => import('./pages/FaqsPage'));
const ShippingPage = lazy(() => import('./pages/ShippingPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <>
            <ScrollToTop />
            <div className="app-container">
              <Header />
              <main className="main-content">
                <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: '1.2rem', color: 'var(--color-primary)' }}>Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/account" element={<ProfilePage />} />
                    <Route path="/admin/login" element={<Navigate to="/login" replace />} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
                    <Route path="/admin/orders" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
                    <Route path="/recipes" element={<RecipesPage />} />
                    <Route path="/products" element={<CataloguePage />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-success" element={<OrderSuccessPage />} />
                    <Route path="/bundle" element={<BuildBundlePage />} />
                    <Route path="/bulk" element={<BulkEnquiryPage />} />
                    <Route path="/faqs" element={<FaqsPage />} />
                    <Route path="/shipping" element={<ShippingPage />} />
                    <Route path="/returns" element={<ReturnsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          </>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
