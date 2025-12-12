import React, { useState } from 'react';
import Modal from './Modal';

export default function ExportFormatModal({ isOpen, onClose }) {
  const [selectedFormat, setSelectedFormat] = useState('xlsx');

  const handleExport = () => {
    alert(`Выгрузка в формате ${selectedFormat.toUpperCase()}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Выбор формата выгрузки</h2>
      <div className="export-options">
        <div
          className={`export-option ${selectedFormat === 'xlsx' ? 'selected' : ''}`}
          onClick={() => setSelectedFormat('xlsx')}
        >
          XLSX
        </div>
        <div
          className={`export-option ${selectedFormat === 'csv' ? 'selected' : ''}`}
          onClick={() => setSelectedFormat('csv')}
        >
          CSV
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={handleExport}>OK</button>
      </div>
    </Modal>
  );
}
