import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Modal from '../components/Modal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await authAPI.login(email, password);
      navigate('/dashboard/general');
    } catch (error) {
      setShowErrorModal(true);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Авторизация</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Войти
          </button>
        </form>
      </div>

      <Modal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)}>
        <h2>Ошибка</h2>
        <p>Данные для авторизации не верные. Попробуйте еще раз.</p>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => setShowErrorModal(false)}>
            Хорошо
          </button>
        </div>
      </Modal>
    </div>
  );
}
