import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spinner } from '../components/ui/Loading';

/** Blocks rendering until auth boot completes; redirects guests to login. */
export default function ProtectedRoute() {
  const { status, booted, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!booted && status !== 'authenticated') {
    return <Spinner label="Checking session" className="min-h-screen" />;
  }
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return <Outlet />;
}

export { ProtectedRoute };

/** Restricts a route subtree to specific roles. */
export function RoleRoute({ roles }) {
  const { user, booted } = useSelector((s) => s.auth);
  if (!booted) return <Spinner label="Loading" className="min-h-screen" />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
