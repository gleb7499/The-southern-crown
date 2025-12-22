import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

/**
 * Хук для проверки аутентификации пользователя
 * Проверяет валидность сессии при каждом монтировании компонента
 * @returns {Object} { isAuthenticated, isLoading, user }
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getMe();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { isAuthenticated, isLoading, user };
};
