// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate }    from 'react-router-dom';
import { onAuthStateChanged }         from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db }                   from './firebaseConfig';

import Home                       from './components/Home';
import SignUp                     from './components/SignUp';
import Feed                       from './components/Feed';
import PostCreate                 from './components/PostCreate';
import PostDetail                 from './components/PostDetail';
import EditPost                   from './components/EditPost';
import MessageList                from './components/MessageList';
import ChatRoom                   from './components/ChatRoom';
import Shop                       from './components/Shop';
import Payment                    from './components/Payment';
import PaymentResult              from './components/PaymentResult';
import Profile                    from './components/Profile';
import EditProfile                from './components/EditProfile';
import Withdraw                   from './components/Withdraw';
import Report                     from './components/Report';
import BottomNav                  from './components/BottomNav';

import AdminPage                  from './components/AdminPage';
import AdminEmailEntry            from './components/AdminEmailEntry';
import AccountSwitchDashboard     from './components/AccountSwitchDashboard';
import ProtectedAdminRoute        from './components/ProtectedAdminRoute';

export default function App() {
  const [user, setUser]               = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin]         = useState(false);

  // 로그인 상태 + admin claim 체크
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        const { claims } = await u.getIdTokenResult();
        setIsAdmin(!!claims.admin);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  // unread 카운트 실시간 업데이트
  useEffect(() => {
    if (!user) return;
    const roomsQ = query(
      collection(db, 'chatRooms'),
      where('members', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(roomsQ, snap => {
      let cnt = 0;
      snap.docs.forEach(d => {
        const ucount = d.data().unread?.[user.uid] || 0;
        if (ucount > 0) cnt += 1;
      });
      setUnreadCount(cnt);
    });
    return () => unsub();
  }, [user]);

  return (
    <>
      <div style={{ paddingBottom: 80 }}>
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/signup"          element={<SignUp />} />
          <Route path="/feed"            element={<Feed />} />
          <Route path="/post/new"        element={<PostCreate />} />
          <Route path="/post/:id"        element={<PostDetail />} />
          <Route path="/post/:id/edit"   element={<EditPost />} />
          <Route path="/messages"        element={<MessageList />} />
          <Route path="/chat/:roomId"    element={<ChatRoom />} />
          <Route path="/shop"            element={<Shop />} />

          {/* 무통장 결제 페이지 */}
          <Route path="/payment/:amount" element={<Payment />} />

          <Route path="/payment/result"  element={<PaymentResult />} />
          <Route path="/profile"         element={<Profile />} />
          <Route path="/profile/edit"    element={<EditProfile />} />
          <Route path="/withdraw"        element={<Withdraw />} />
          <Route path="/report/:id"      element={<Report />} />

          {/* 관리자 전용 */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute isAdmin={isAdmin}>
                <AdminPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/create"
            element={
              <ProtectedAdminRoute isAdmin={isAdmin}>
                <AdminEmailEntry />
              </ProtectedAdminRoute>
            }
          />
          {/* 계정 전환 대시보드는 공개 */}
          <Route path="/admin/switch" element={<AccountSwitchDashboard />} />

          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </div>
      <BottomNav unreadCount={unreadCount} currentUser={user} />
    </>
  );
}
