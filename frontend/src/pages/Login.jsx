import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Modal from '../components/Modal';
import logo from '../assets/logo.svg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const isEmailWithDomain = (value) => {
    const normalized = String(value || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedPassword = password;

    // Basic validation
    if (!normalizedEmail || !normalizedPassword) {
      setErrorMessage('Пожалуйста, заполните email и пароль.');
      setShowErrorModal(true);
      return;
    }

    // Client requirement: show a specific error for an email without a domain.
    if (!isEmailWithDomain(normalizedEmail)) {
      setErrorMessage('Неверный формат почты: отсутствует домен.');
      setShowErrorModal(true);
      return;
    }

    try {
      await authAPI.login(normalizedEmail, normalizedPassword);
      navigate('/dashboard/general');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('Данные для авторизации неверные. Попробуйте еще раз.');
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

      <Modal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage('');
        }}
      >
        <h2>Ошибка</h2>
        <p>{errorMessage || 'Данные для авторизации неверные. Попробуйте еще раз.'}</p>
        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowErrorModal(false);
              setErrorMessage('');
            }}
          >
            Хорошо
          </button>
        </div>
      </Modal>
    </div>
  );
}
