import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loading from './Loading';

/**
 * Компонент-обертка для защищенных маршрутов
 * Проверяет аутентификацию пользователя перед рендерингом дочерних компонентов
 * Если пользователь не залогинен - редирект на /login
 * @param {Object} props - children: компоненты для рендеринга при успешной аутентификации
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Показываем загрузку пока проверяем аутентификацию
  if (isLoading) {
    return <Loading />;
  }

  // Если не аутентифицирован - редирект на логин
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если аутентифицирован - рендерим защищенный контент
  return children;
};

export default ProtectedRoute;
