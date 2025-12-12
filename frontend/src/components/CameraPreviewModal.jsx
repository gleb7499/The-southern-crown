import React from 'react';
import Modal from './Modal';

export default function CameraPreviewModal({ isOpen, onClose, camera }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Изображение камеры</h2>
      <div style={{ 
        width: '100%', 
        height: '300px', 
        backgroundColor: '#ccc', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        border: '1px solid #999',
        marginTop: '20px'
      }}>
        <p>Заглушка изображения камеры</p>
      </div>
      {camera && (
        <div style={{ marginTop: '15px' }}>
          <p><strong>Название:</strong> {camera.name}</p>
          <p><strong>URL:</strong> {camera.url}</p>
        </div>
      )}
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>Закрыть</button>
      </div>
    </Modal>
  );
}
