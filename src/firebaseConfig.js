import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import { getFirestore }  from 'firebase/firestore';
import { getStorage }    from 'firebase/storage';
import { getFunctions }  from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyA_vZMnaaw50n0SCIoTdYTIuAOapdneQtI",
  authDomain: "twinow3-app.firebaseapp.com",
  projectId: "twinow3-app",
  storageBucket: "twinow3-app.firebasestorage.app",
  messagingSenderId: "836740417176",
  appId: "1:836740417176:web:cf259a7e2be752f52db2ed",
  measurementId: "G-25XZFWZ31X"
};

const app = initializeApp(firebaseConfig);

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
// 리전을 us-central1로 고정해야 onCall 함수 호출 시 CORS 문제가 없습니다.
export const functions = getFunctions(app, 'us-central1');
