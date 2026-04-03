import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function KidProtectedRoute() {
  const { user, isLoading } = useAuth();
  const { kidId } = useParams();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Allow access if parent is logged in OR if kid has a valid session
  const kidSession = localStorage.getItem('kid_session');
  const isKidAuthorized = kidSession && JSON.parse(kidSession).kidId === kidId;

  if (!user && !isKidAuthorized) {
    return <Navigate to="/?mode=kid" replace />;
  }

  return <Outlet />;
}
