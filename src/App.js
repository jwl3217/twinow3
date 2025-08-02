import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate }    from 'react-router-dom';
import { onAuthStateChanged }         from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { auth, db }                   from './firebaseConfig';
import Home                           from './components/Home';
import SignUp                         from './components/SignUp';
import Feed                           from './components/Feed';
import PostCreate                     from './components/PostCreate';
import PostDetail                     from './components/PostDetail';
import EditPost                       from './components/EditPost';
import MessageList                    from './components/MessageList';
import ChatRoom                       from './components/ChatRoom';
import Shop                           from './components/Shop';
import Payment                        from './components/Payment';
import Profile                        from './components/Profile';
import EditProfile                    from './components/EditProfile';
import Withdraw                       from './components/Withdraw';
import Report                         from './components/Report';
import BottomNav                      from './components/BottomNav';
import AdminPage                      from './components/AdminPage';
import AdminEmailEntry                from './components/AdminEmailEntry';
import AccountSwitchDashboard         from './components/AccountSwitchDashboard';
import ProtectedAdminRoute            from './components/ProtectedAdminRoute';

export default function App() {
  const [user, setUser]           = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin]     = useState(false);

  // 1) 로그인 상태 및 admin 클레임 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
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

  // 2) 채팅방 미확인 메시지 구독
  useEffect(() => {
    if (!user) return;
    const roomsQ = query(
      collection(db, 'chatRooms'),
      where('members', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(roomsQ, (snap) => {
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
          <Route path="/"               element={<Home />} />
          <Route path="/signup"         element={<SignUp />} />
          <Route path="/feed"           element={<Feed />} />
          <Route path="/post/new"       element={<PostCreate />} />
          <Route path="/post/:id"       element={<PostDetail />} />
          <Route path="/post/:id/edit"  element={<EditPost />} />
          <Route path="/messages"       element={<MessageList />} />
          <Route path="/chat/:roomId"   element={<ChatRoom />} />
          <Route path="/shop"           element={<Shop />} />
          <Route path="/payment/:amount" element={<Payment />} />
          <Route path="/profile"        element={<Profile />} />
          <Route path="/profile/edit"   element={<EditProfile />} />
          <Route path="/withdraw"       element={<Withdraw />} />
          <Route path="/report/:id"     element={<Report />} />

          {/* 관리자 전용 대시보드 */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute isAdmin={isAdmin}>
                <AdminPage />
              </ProtectedAdminRoute>
            }
          />

          {/* 관리자 전용: 이메일/비번 입력 */}
          <Route
            path="/admin/create"
            element={
              <ProtectedAdminRoute isAdmin={isAdmin}>
                <AdminEmailEntry />
              </ProtectedAdminRoute>
            }
          />

          {/* 관리자 전용: 계정 전환 대시보드 */}
          <Route
            path="/admin/switch"
            element={
              <ProtectedAdminRoute isAdmin={isAdmin}>
                <AccountSwitchDashboard />
              </ProtectedAdminRoute>
            }
          />

          {/* 그 외는 피드로 */}
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </div>

      <BottomNav unreadCount={unreadCount} currentUser={user} />
    </>
  );
}
