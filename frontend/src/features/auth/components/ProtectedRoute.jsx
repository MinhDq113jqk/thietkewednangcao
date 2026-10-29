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
      <div className="d-flex align-items-center justify-content-center protected-route-detail-1" role="status">
        <span className="rounded-pill border-2 border-success protected-route-detail-2" />
        <span className="visually-hidden">Đang kiểm tra phiên đăng nhập</span>
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
