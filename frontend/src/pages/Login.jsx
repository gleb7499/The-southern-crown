import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Modal from '../components/Modal';
import logo from '../assets/logo.svg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      setShowErrorModal(true);
      return;
    }

    try {
      await authAPI.login(email, password);
      navigate('/dashboard/general');
    } catch (error) {
      console.error('Login error:', error);
      setShowErrorModal(true);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Южная Корона" className="logo" />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email адрес"
              aria-required="true"
              required
            />
          </div>
          <div className="form-group">
            <input
              id="password"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Пароль"
              aria-required="true"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" aria-label="Войти в систему">
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
