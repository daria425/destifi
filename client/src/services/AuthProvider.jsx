import PropTypes from "prop-types";
import { useEffect, createContext, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleAuthProvider } from "../config/firebase.config";
import { apiConfig } from "../config/api.config";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  console.log("Auth provider rerendered with", error, authenticatedUser);
  const handleTokenAuth = async (user) => {
    console.log("Token auth ran, user is", user);
    setIsLoading(true);
    setError(null);
    const idToken = await user.getIdToken(true);
    try {
      const response = await apiConfig.post(
        "auth/login",
        {},
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      if (response.status === 200) {
        console.log("Data from server", response.data);
        setAuthenticatedUser(response.data);
      } else {
        console.error("Error verifying user:", response);
      }
    } catch (err) {
      setError({ message: err.message });
      setAuthenticatedUser(null);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await handleTokenAuth(currentUser);
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    //TO-DO: add option to enter name
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      await handleTokenAuth(userCredential.user);
    } catch (err) {
      setError({ message: err.message });
      console.error("Error logging in:", err);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      await handleTokenAuth(userCredential.user);
    } catch (err) {
      setError({ message: err.message });
      console.error("Error logging in:", err);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setAuthenticatedUser(null);
  };

  const getIdToken = async () => {
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken(true);
      return idToken;
    }
    throw new Error("No authenticated user");
  };
  const contextValue = {
    authenticatedUser,
    isLoading,
    error,
    setError,
    loginWithGoogle,
    login,
    logout,
    getIdToken,
  };
  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node,
};

export { AuthContext, AuthProvider };
