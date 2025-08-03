// src/components/ProtectedAdminRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedAdminRoute({ isAdmin, children }) {
  // 아직 admin 여부 판별 전
  if (isAdmin === null) {
    return null;  // 혹은 로딩 스피너
  }
  // 관리자 아니면 피드로
  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }
  return <>{children}</>;
}
