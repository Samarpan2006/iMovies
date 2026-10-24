import React from 'react';
import { Navigate } from 'react-router-dom';

const UserProtection = ({ children }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr || '{}');
    if (user.isAdmin) {
      return <Navigate to="/admin" replace />;
    }
  } catch (e) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default UserProtection;
