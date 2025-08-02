// src/components/ProtectedAdminRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedAdminRoute({ isAdmin, children }) {
  if (!isAdmin) {
    // 관리자가 아니면 피드로 돌려보냄
    return <Navigate to="/feed" replace />;
  }
  // 관리자는 자식 컴포넌트(관리자 페이지) 렌더링
  return <>{children}</>;
}
