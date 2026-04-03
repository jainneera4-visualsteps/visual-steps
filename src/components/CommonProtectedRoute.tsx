import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function CommonProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Allow access if parent is logged in OR if kid has a valid session
  const kidSession = localStorage.getItem('kid_session');
  const isKidAuthorized = !!kidSession;

  if (!user && !isKidAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
