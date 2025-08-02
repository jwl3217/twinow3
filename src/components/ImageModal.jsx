// 경로: src/components/ImageModal.jsx

import React from 'react';
import '../styles/ImageModal.css';

export default function ImageModal({ src, onClose }) {
  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={e => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>×</button>
        <img src={src} alt="프로필 확대" className="image-modal-img" />
      </div>
    </div>
  );
}
