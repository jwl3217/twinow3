// 경로: src/utils/crypto.js
import CryptoJS from 'crypto-js';

/**
 * 채팅방 ID를 기반으로 AES 키를 생성합니다.
 * (단순 예시용: 실제 운영에서는 사용자별로 안전하게 키를 교환/저장해야 합니다)
 */
export function makeChatKey(roomId) {
  // SHA256(roomId) → 32바이트 키
  return CryptoJS.SHA256(roomId).toString();
}

export function encryptMessage(plainText, key) {
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

export function decryptMessage(cipherText, key) {
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}
