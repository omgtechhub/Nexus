import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { AuthPage } from '../../../components/auth/AuthPage';
import { RequireSeller } from '../../../app/auth/guards';

export function SellerRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AuthPage mode="login" portal="seller" />} />
      <Route path="register" element={<AuthPage mode="signup" portal="seller" />} />

      {/* Every seller surface sits behind the guard. */}
      <Route
        path="dashboard"
        element={<RequireSeller><DashboardLayout /></RequireSeller>}
      />
      <Route
        path=":section"
        element={<RequireSeller><DashboardLayout /></RequireSeller>}
      />

      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
