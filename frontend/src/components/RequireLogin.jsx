import { Navigate } from "react-router-dom";

export default function RequireLogin({ user, loading, role, mustBeStaff, children }) {
  if (loading) {
    return <div className="empty section">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  if (mustBeStaff && !user.is_staff) {
    return <Navigate to="/" />;
  }
  return children;
}
