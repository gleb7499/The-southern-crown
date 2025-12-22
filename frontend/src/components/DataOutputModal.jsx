import { useState } from 'react';
import Modal from './Modal';
import CalendarModal from './CalendarModal';

export default function DataOutputModal({ isOpen, onClose }) {
  const [weight, setWeight] = useState('');
  const [uniformity, setUniformity] = useState('');
  const [deviation, setDeviation] = useState('');
  const [percentage, setPercentage] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate numeric fields
    if (!weight || !uniformity || !deviation || !percentage) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    if (!selectedDate) {
      alert('Пожалуйста, выберите дату');
      return;
    }

    const data = {
      weight: parseFloat(weight),
      uniformity: parseFloat(uniformity),
      deviation: parseFloat(deviation),
      percentage: parseFloat(percentage),
      date: selectedDate.toISOString().split('T')[0],
    };

    console.error('Data output:', data);
    alert(
      `Данные сохранены:\nВес: ${weight}\nЕдинобразие: ${uniformity}\nОтклонение: ${deviation}\n%: ${percentage}\nДата: ${selectedDate.toLocaleDateString('ru-RU')}`
    );

    // Reset form
    setWeight('');
    setUniformity('');
    setDeviation('');
    setPercentage('');
    setSelectedDate(null);
    onClose();
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <h2>Данные нового вывода</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Средний вес (г)</label>
            <input
              type="number"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Введите средний вес"
              required
            />
          </div>

          <div className="form-group">
            <label>Единобразие (%)</label>
            <input
              type="number"
              step="0.01"
              value={uniformity}
              onChange={(e) => setUniformity(e.target.value)}
              placeholder="Введите единобразие"
              required
            />
          </div>

          <div className="form-group">
            <label>Стандартное отклонение</label>
            <input
              type="number"
              step="0.01"
              value={deviation}
              onChange={(e) => setDeviation(e.target.value)}
              placeholder="Введите отклонение"
              required
            />
          </div>

          <div className="form-group">
            <label>Процент (%)</label>
            <input
              type="number"
              step="0.01"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="Введите процент"
              required
            />
          </div>

          <div className="form-group">
            <label>Дата измерения</label>
            <button type="button" className="btn" onClick={() => setShowCalendar(true)}>
              {selectedDate ? selectedDate.toLocaleDateString('ru-RU') : 'Выбрать дату'}
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      </Modal>

      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={handleDateSelect}
      />
    </>
  );
}
