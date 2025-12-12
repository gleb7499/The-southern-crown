import React from 'react';

export default function Modal({ isOpen, onClose, children, isAlert = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal ${isAlert ? 'alert-modal' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
