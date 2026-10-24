import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from './Loader';
import api from '../utils/api';

/**
 * Server-Validated Admin Route Protection
 * Resolves Issue 4 (Admin Page Bypass):
 * Ensures authorization is never derived purely from local browser storage.
 * Verifies token and checks database admin role with the backend before granting access.
 */
const AdminProtection = ({ children }) => {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuthorized: false
  });
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAdminAuthorization = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) setAuthState({ loading: false, isAuthorized: false });
        return;
      }

      try {
        // Query backend server-side validation route enforcing DB-checked RBAC
        const res = await api.get('/auth/validate-admin');
        if (isMounted) {
          if (res.data?.success && res.data?.isAdmin) {
            setAuthState({ loading: false, isAuthorized: true });
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuthState({ loading: false, isAuthorized: false });
          }
        }
      } catch (err) {
        if (isMounted) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setAuthState({ loading: false, isAuthorized: false });
        }
      }
    };

    verifyAdminAuthorization();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader message="Verifying administrative credentials with secure server..." />
      </div>
    );
  }

  if (!authState.isAuthorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default AdminProtection;
