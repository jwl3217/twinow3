// 경로: src/components/PostCreate.jsx

import React, { useMemo, useState } from 'react';
import { useNavigate }                 from 'react-router-dom';
import { auth, db, storage }          from '../firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  query,            // ★ 추가: 닉네임 중복 검사
  where,            // ★ 추가
  getDocs,          // ★ 추가
  limit,            // ★ 추가
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import backArrow                      from '../assets/back-arrow.png';
import defaultProfile                 from '../assets/default-profile.png'; // ★ 기본 프로필
import '../styles/PostCreate.css';

// ★ 관리자 UID (고정)
const ADMIN_UID = 'E4d78bGGtnPMvPDl5DLdHx4oRa03';

export default function PostCreate() {
  const navigate = useNavigate();
  const me = auth.currentUser;
  const isAdmin = useMemo(() => me?.uid === ADMIN_UID, [me]);

  // 공통/일반 회원 전용
  const [content, setContent] = useState('');

  // 관리자 전용
  const [personaJSON, setPersonaJSON] = useState('');
  const [photoFile, setPhotoFile]     = useState(null);

  const handleCancel = () => navigate(-1);

  const parsePersonaJSON = () => {
    const txt = personaJSON.trim();
    if (!txt) return null;
    try {
      const obj = JSON.parse(txt);
      if (!obj.persona || typeof obj.content !== 'string') {
        alert('JSON 형식이 올바르지 않습니다. persona/content가 필요합니다.');
        return null;
      }
      const p = obj.persona;
      if (!p.nickname || !p.gender || typeof p.age === 'undefined' || !p.region) {
        alert('persona.nickname/gender/age/region 필드를 모두 포함해야 합니다.');
        return null;
      }
      return obj;
    } catch (e) {
      console.error(e);
      alert('JSON 파싱에 실패했습니다.');
      return null;
    }
  };

  const toTimestamp = (isoOrLocal) => {
    if (!isoOrLocal) return null;
    const d = new Date(isoOrLocal);
    if (isNaN(d.getTime())) return null;
    return Timestamp.fromDate(d);
  };

  const handleSubmit = async () => {
    if (!me) {
      alert('로그인이 필요합니다.');
      return navigate('/', { replace: true });
    }

    try {
      let payload;

      if (isAdmin) {
        // 관리자: JSON 전용
        const fromJson = parsePersonaJSON();
        if (!fromJson) return;

        // ★ 닉네임 충돌 방지: users / persona posts 중복 검사
        const nicknameTrimmed = String(fromJson.persona?.nickname || '').trim();
        if (!nicknameTrimmed) {
          alert('사용할 수 없는 닉네임입니다.');
          return;
        }

        // 1) users 컬렉션에 동일 닉네임 존재?
        const userDupSnap = await getDocs(
          query(collection(db, 'users'), where('nickname', '==', nicknameTrimmed), limit(1))
        );
        if (!userDupSnap.empty) {
          alert('사용할 수 없는 닉네임입니다.');
          return;
        }

        // 2) posts 컬렉션(페르소나 전용)에서 동일 닉네임 존재?
        //    인덱스 회피를 위해 nickname== 로만 가져오고 personaMode 확인
        const personaNickSnap = await getDocs(
          query(collection(db, 'posts'), where('nickname', '==', nicknameTrimmed), limit(3))
        );
        const personaNickExists = personaNickSnap.docs.some(
          d => d.data()?.personaMode === true
        );
        if (personaNickExists) {
          alert('사용할 수 없는 닉네임입니다.');
          return;
        }

        // 사진 업로드(선택). 없으면 기본 프로필 사용
        let finalPhotoURL = defaultProfile; // ★ 기본 프로필을 기본값으로
        if (photoFile) {
          const path = `personaPosts/${ADMIN_UID}/${Date.now()}_${photoFile.name}`;
          const ref  = storageRef(storage, path);
          await uploadBytes(ref, photoFile);
          finalPhotoURL = await getDownloadURL(ref);
        }

        const p = fromJson.persona;
        payload = {
          uid:        ADMIN_UID,
          photoURL:   finalPhotoURL,
          nickname:   nicknameTrimmed,                         // ★ 트리밍 적용
          gender:     p.gender,
          age:        Number(p.age) || null,
          region:     p.region,
          content:    String(fromJson.content || '').trim(),
          createdAt:  toTimestamp(fromJson.postedAt) || serverTimestamp(),
          personaMode: true
        };
      } else {
        // 일반 회원: 기존 로직 유지(내용 필수)
        const body = content.trim();
        if (!body) {
          alert('내용을 입력해 주세요.');
          return;
        }
        payload = {
          uid:       me.uid,
          photoURL:  me.photoURL || '',
          nickname:  me.displayName || '',
          gender:    '',
          age:       null,
          region:    '',
          content:   body,
          createdAt: serverTimestamp()
        };
      }

      await addDoc(collection(db, 'posts'), payload);
      navigate('/feed');
    } catch (err) {
      console.error(err);
      alert('게시글 등록 중 오류가 발생했습니다.\n' + (err?.message || ''));
    }
  };

  return (
    <div className="create-container">
      {/* 1) 고정 헤더 */}
      <header className="create-header">
        <button className="back-button" onClick={handleCancel}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">글쓰기</span>
      </header>

      {/* 2) 헤더 밑 분리선 */}
      <div className="create-separator" />

      {/* 3) 본문 스크롤 영역 */}
      <div className="create-body">
        <div className="create-card">
          {/* 일반 회원만 텍스트 입력 노출 */}
          {!isAdmin && (
            <textarea
              className="create-textarea"
              placeholder="무슨 생각을 나누고 싶으신가요?"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          )}

          {isAdmin && (
            <>
              {/* 관리자 전용: 프로필 이미지 업로드(선택) */}
              <div className="create-field">
                <label>프로필 이미지(페르소나)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                />
                <p className="hint">* 올리지 않으면 기본 프로필 이미지가 사용됩니다.</p>
              </div>

              {/* 관리자 전용: JSON 붙여넣기(필수) */}
              <div className="create-field">
                <label>페르소나 JSON 붙여넣기(필수)</label>
                <textarea
                  className="create-json"
                  rows={18}
                  style={{ minHeight: 320, fontSize: 16 }}  // ★ 글자 크기 16px 유지
                  placeholder={'여기에 페르소나 입력'}
                  value={personaJSON}
                  onChange={e => setPersonaJSON(e.target.value)}
                />
                <p className="hint">* 관리자는 JSON으로만 글을 등록할 수 있어요.</p>
              </div>
            </>
          )}
        </div>

        <button className="submit-button" onClick={handleSubmit}>
          등록
        </button>
      </div>
    </div>
  );
}
