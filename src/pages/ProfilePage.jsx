import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Navigate, Link } from 'react-router-dom';
import { Package, User, LogOut, Heart, ShoppingCart, Trash2 } from 'lucide-react';

const ProfilePage = () => {
  const { user, logout, updateProfileDetails, toggleWishlist } = useAuth();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState('orders');
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pinCode: user?.pinCode || ''
  });

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfileDetails(formData);
    setIsSaving(false);
    alert('Profile details saved successfully!');
  };

  const handleRemoveFromWishlist = (product) => {
    toggleWishlist(product);
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '70vh' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '3rem', alignItems: 'start' }}>
        
        {/* Sidebar */}
        <div style={{ backgroundColor: 'var(--color-white)', borderRadius: '12px', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', margin: '0 auto 1rem auto' }}>
              {user.name ? user.name.charAt(0).toUpperCase() : (user.phone ? 'P' : 'U')}
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>{user.name || 'User'}</h3>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>{user.email || user.phone || 'No Contact Info'}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={() => setActiveTab('orders')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: 'none', background: 'none', color: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: activeTab === 'orders' ? '500' : '400', cursor: 'pointer', textAlign: 'left', borderRadius: '8px', backgroundColor: activeTab === 'orders' ? 'var(--color-bg-alt)' : 'transparent' }}>
              <Package size={18} /> Order History
            </button>
            <button onClick={() => setActiveTab('details')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: 'none', background: 'none', color: activeTab === 'details' ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: activeTab === 'details' ? '500' : '400', cursor: 'pointer', textAlign: 'left', borderRadius: '8px', backgroundColor: activeTab === 'details' ? 'var(--color-bg-alt)' : 'transparent' }}>
              <User size={18} /> Account Details
            </button>
            <button onClick={() => setActiveTab('wishlist')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: 'none', background: 'none', color: activeTab === 'wishlist' ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: activeTab === 'wishlist' ? '500' : '400', cursor: 'pointer', textAlign: 'left', borderRadius: '8px', backgroundColor: activeTab === 'wishlist' ? 'var(--color-bg-alt)' : 'transparent' }}>
              <Heart size={18} /> Wishlist
            </button>
            <hr style={{ borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer', textAlign: 'left' }}>
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {activeTab === 'orders' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>Your Orders</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                  Live Sync Active
                </div>
              </div>
              
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulse {
                  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                  70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
              `}} />
              
              {!user.orders || user.orders.length === 0 ? (
            <div style={{ backgroundColor: 'var(--color-white)', borderRadius: '12px', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <Package size={48} color="var(--color-border)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ marginBottom: '1rem' }}>No orders yet</h3>
              <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem' }}>Looks like you haven't made your first purchase yet.</p>
              <Link to="/products" className="btn btn-primary">Start Shopping</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[...user.orders].reverse().map(order => {
                const status = order.status || 'Processing';
                const steps = ['Processing', 'Shipped', 'Delivered'];
                const currentIndex = steps.indexOf(status) !== -1 ? steps.indexOf(status) : 0;
                
                return (
                <div key={order.id} style={{ backgroundColor: 'var(--color-white)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: 'var(--color-primary)', display: 'block' }}>Order {order.id.slice(-6).toUpperCase()}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                        {new Date(order.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '600', display: 'block', fontSize: '1.1rem' }}>₹{order.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Realtime Tracker */}
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--color-primary)' }}>Live Tracking Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {steps.map((step, idx) => (
                        <React.Fragment key={step}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                            <div style={{ 
                              width: '28px', height: '28px', borderRadius: '50%', 
                              backgroundColor: idx <= currentIndex ? 'var(--color-accent)' : 'var(--color-white)',
                              border: idx <= currentIndex ? 'none' : '2px solid var(--color-border)',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '14px', fontWeight: 'bold', transition: 'all 0.5s ease'
                            }}>
                              {idx < currentIndex ? '✓' : (idx === currentIndex ? '•' : '')}
                            </div>
                            <span style={{ fontSize: '0.75rem', marginTop: '6px', color: idx <= currentIndex ? 'var(--color-text)' : 'var(--color-text-light)', fontWeight: idx <= currentIndex ? '600' : '400' }}>
                              {step}
                            </span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div style={{ flex: 1, height: '4px', backgroundColor: idx < currentIndex ? 'var(--color-accent)' : 'var(--color-border)', margin: '0 -4px', position: 'relative', top: '-12px', zIndex: 1, transition: 'background-color 0.5s ease' }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</div>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span><span style={{ color: 'var(--color-text-light)', marginRight: '8px' }}>{item.quantity}x</span> {item.name}</span>
                        <span style={{ fontWeight: '500' }}>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )})}
            </div>
          )}
            </>
          )}

          {activeTab === 'details' && (
            <div style={{ backgroundColor: 'var(--color-white)', borderRadius: '12px', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>Account Details</h2>
              <form onSubmit={handleSaveDetails}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }} placeholder="Your Phone Number" />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Address</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }} placeholder="House/Flat No., Street" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>City</label>
                    <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }} placeholder="City" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>State</label>
                    <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }} placeholder="State" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>PIN Code</label>
                    <input type="text" value={formData.pinCode} onChange={e => setFormData({...formData, pinCode: e.target.value})} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }} placeholder="e.g. 110001" />
                  </div>
                </div>
                <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  {isSaving ? 'Saving...' : 'Save Details'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>Your Wishlist</h2>
              {(!user.wishlist || user.wishlist.length === 0) ? (
                <div style={{ backgroundColor: 'var(--color-white)', borderRadius: '12px', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <Heart size={48} color="var(--color-border)" style={{ margin: '0 auto 1rem auto' }} />
                  <h3 style={{ marginBottom: '1rem' }}>Your wishlist is empty</h3>
                  <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem' }}>Save items you like to view them later.</p>
                  <Link to="/products" className="btn btn-primary">Discover Spices</Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {user.wishlist.map(product => (
                    <div key={product.id} style={{ backgroundColor: 'var(--color-white)', borderRadius: '12px', padding: '1rem', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
                      <button onClick={() => handleRemoveFromWishlist(product)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                      <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ width: '100%', height: '180px', backgroundColor: '#f7f7f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', padding: '10px' }}>
                          <img src={product.image} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</h4>
                        <div style={{ fontWeight: '600', marginBottom: '1rem' }}>₹{product.price}.00</div>
                      </Link>
                      <button onClick={() => addToCart(product, 2)} className="btn btn-amazon" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <ShoppingCart size={14} /> Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
