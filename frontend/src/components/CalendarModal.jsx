import React, { useState } from 'react';
import Modal from './Modal';

export default function CalendarModal({ isOpen, onClose, onSelect }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleSelect = () => {
    if (selectedDate) {
      onSelect(new Date(currentYear, currentMonth, selectedDate));
      onClose();
    }
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Выбор даты</h2>
      <div className="calendar">
        <div className="calendar-header">
          <button 
            className="btn" 
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
          >
            &lt;
          </button>
          <span>{monthNames[currentMonth]} {currentYear}</span>
          <button 
            className="btn" 
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
          >
            &gt;
          </button>
        </div>
        <div className="calendar-grid">
          {days.map(day => (
            <div
              key={day}
              className={`calendar-day ${selectedDate === day ? 'selected' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSelect}>OK</button>
      </div>
    </Modal>
  );
}
