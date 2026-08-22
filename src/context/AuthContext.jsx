import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import PageLoader from '../components/PageLoader';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isFading, setIsFading] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let unsubscribeSnapshot = null;
    let minLoadTimer = null;
    let isMinLoadComplete = false;
    let isAuthComplete = false;
    let hasFinishedLoading = false;

    const attemptFinishLoading = () => {
      if (isAuthComplete && !hasFinishedLoading) {
        hasFinishedLoading = true;
        setIsFading(true);
        setTimeout(() => {
          setLoading(false);
          setShowContent(true);
        }, 300); // 300ms fade for faster perceived load
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Setup real-time listener for user data (including orders)
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: firebaseUser.uid, ...docSnap.data() });
          } else {
            // Fallback for new accounts before document is fully created
            setUser({ id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName, orders: [] });
          }
          isAuthComplete = true;
          attemptFinishLoading();
        }, (error) => {
          console.error("Error in realtime listener:", error);
          isAuthComplete = true;
          attemptFinishLoading();
        });
      } else {
        setUser(null);
        isAuthComplete = true;
        attemptFinishLoading();
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (name, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Create user document in Firestore
    const newUser = {
      name,
      email,
      orders: [],
      wishlist: []
    };
    
    await setDoc(doc(db, 'users', uid), newUser);
    setUser({ id: uid, ...newUser });
  };

  const updateProfileDetails = async (details) => {
    if (user && user.id) {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, details);
        setUser(prev => ({ ...prev, ...details }));
      } catch (error) {
        console.error("Error updating profile details:", error);
      }
    }
  };

  const toggleWishlist = async (product) => {
    if (user && user.id) {
      try {
        const userDocRef = doc(db, 'users', user.id);
        const wishlist = user.wishlist || [];
        const isWishlisted = wishlist.some(p => p.id === product.id);
        
        if (isWishlisted) {
          await updateDoc(userDocRef, {
            wishlist: arrayRemove(wishlist.find(p => p.id === product.id))
          });
        } else {
          await updateDoc(userDocRef, {
            wishlist: arrayUnion(product)
          });
        }
      } catch (error) {
        console.error("Error toggling wishlist:", error);
      }
    } else {
      alert("Please log in to add items to your wishlist.");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addOrder = async (order) => {
    const newOrder = { ...order, id: order.id, date: new Date().toISOString(), status: 'Processing' };
    
    if (user && user.id) {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          orders: arrayUnion(newOrder)
        });
        
        // Optimistically update local state
        setUser(prev => ({
          ...prev,
          orders: [...(prev.orders || []), newOrder]
        }));
      } catch (error) {
        console.error("Error saving order to Firestore:", error);
      }
    } else {
      // Guest checkout
      const guestOrders = JSON.parse(localStorage.getItem('guest_orders') || '[]');
      guestOrders.push(newOrder);
      localStorage.setItem('guest_orders', JSON.stringify(guestOrders));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, register, logout, addOrder, updateProfileDetails, toggleWishlist
    }}>
      {!showContent && <PageLoader isFading={isFading} />}
      {showContent && children}
    </AuthContext.Provider>
  );
};
