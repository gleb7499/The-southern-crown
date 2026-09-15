import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loading from './Loading';

/**
 * Wrapper component for protected routes
 * Checks user authentication before rendering child components
 * If the user is not logged in - redirect to /login
 * @param {Object} props - children: components to render on successful authentication
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <Loading />;
  }

  // If not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated - render the protected content
  return children;
};

export default ProtectedRoute;
