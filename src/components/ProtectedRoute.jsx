import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute
 * @param {React.ReactNode} children
 * @param {string|string[]} [roles] - role(s) được phép truy cập
 * @param {string} [redirectTo] - trang redirect nếu sai role (mặc định '/')
 */
const ProtectedRoute = ({ children, roles, redirectTo = '/' }) => {
  const { isAuthenticated, isInitialized, role } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="flex min-h-[360px] items-center justify-center" role="status">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="sr-only">Đang kiểm tra phiên đăng nhập</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(role)) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
