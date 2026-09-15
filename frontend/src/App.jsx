import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import './styles/App.css';

// Lazy loading of pages - each page in a separate chunk
const Login = lazy(() => import('./pages/Login'));
const General = lazy(() => import('./pages/General'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/dashboard/general"
              element={
                <ProtectedRoute>
                  <General />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Default redirects */}
            <Route path="/dashboard" element={<Navigate to="/dashboard/general" replace />} />
            <Route path="/" element={<Navigate to="/dashboard/general" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/general" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
