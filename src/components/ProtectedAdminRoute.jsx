// src/components/ProtectedAdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedAdminRoute({ isAdmin, children }) {
  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }
  return <>{children}</>;
}
