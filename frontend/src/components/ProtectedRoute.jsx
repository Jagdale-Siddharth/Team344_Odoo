import { Navigate, useLocation } from 'react';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './UI/Spinner';

export const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400 font-medium">Verifying authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-panel rounded-2xl text-center space-y-4">
        <h2 className="text-xl font-bold text-rose-400">Access Denied</h2>
        <p className="text-sm text-slate-400">
          You do not have permission to view this page. Required role: {roles.join(', ')}.
        </p>
      </div>
    );
  }

  return children;
};
