import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import PageLoader from '../components/PageLoader';


const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isFading, setIsFading] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Helper to fetch core user auth data (Profile details editing is deferred)
  const fetchUserProfile = async (sessionUser) => {
    if (!sessionUser) return null;
    const userId = sessionUser.id;

    // Core user object for Auth and Orders (Profile details editing deferred)
    return {
      id: userId,
      email: sessionUser.email,
      name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Customer'
    };
  };

  // Helper to fetch user orders from public.orders
  const fetchUserOrders = async (userId) => {
    if (!userId) {
      setOrders([]);
      return;
    }

    const { data: orderRows, error: ordersErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      console.error('Error fetching user orders:', ordersErr.message);
      setOrders([]);
      return;
    }

    // Map database order columns to UI expected format
    const formattedOrders = (orderRows || []).map(order => ({
      id: order.display_order_id || order.id,
      date: order.created_at,
      status: order.order_status,
      total: Number(order.total_amount) || 0,
      items: (order.order_items || []).map(item => ({
        id: item.product_id,
        name: item.product_name,
        price: Number(item.unit_price) || 0,
        quantity: item.quantity,
        image: item.product_image
      })),
      ...order
    }));

    setOrders(formattedOrders);
  };

  useEffect(() => {
    let isAuthComplete = false;
    let hasFinishedLoading = false;

    const attemptFinishLoading = () => {
      if (isAuthComplete && !hasFinishedLoading) {
        hasFinishedLoading = true;
        setIsFading(true);
        setTimeout(() => {
          setLoading(false);
          setShowContent(true);
        }, 300);
      }
    };

    // 1. Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        Promise.all([
          fetchUserProfile(session.user),
          fetchUserOrders(session.user.id)
        ]).then(([userData]) => {
          setUser(userData);
          isAuthComplete = true;
          attemptFinishLoading();
        }).catch(() => {
          isAuthComplete = true;
          attemptFinishLoading();
        });
      } else {
        setUser(null);
        setOrders([]);
        isAuthComplete = true;
        attemptFinishLoading();
      }
    }).catch(err => {
      console.error('Session get error:', err);
      isAuthComplete = true;
      attemptFinishLoading();
    });

    // 2. Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userData = await fetchUserProfile(session.user);
        setUser(userData);
        await fetchUserOrders(session.user.id);
      } else {
        setUser(null);
        setOrders([]);
      }
      isAuthComplete = true;
      attemptFinishLoading();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      const userData = await fetchUserProfile(data.user);
      setUser(userData);
      await fetchUserOrders(data.user.id);
    }
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name: name
        }
      }
    });
    if (error) throw error;

    if (data.user) {
      const userData = await fetchUserProfile(data.user);
      setUser(userData);
    }
  };

  // DEFERRED FUNCTION: Profile editing deferred for initial launch
  const updateProfileDetails = async () => {
    console.log("Profile editing feature is deferred for initial launch.");
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
    setUser(null);
    setOrders([]);
  };

  const addOrder = async (order) => {
    console.log("Order addition requested in AuthContext (Part 3.5 will wire direct Supabase order inserts).", order);
  };

  return (
    <AuthContext.Provider value={{ 
      user, orders, loading, login, register, logout, addOrder, updateProfileDetails
    }}>
      {!showContent && <PageLoader isFading={isFading} />}
      {showContent && children}
    </AuthContext.Provider>
  );
};
