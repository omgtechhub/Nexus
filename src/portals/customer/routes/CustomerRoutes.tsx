import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from '../../../components/auth/AuthPage';
import { RequireCustomer } from '../../../app/auth/guards';
import { CustomerLayout } from '../layout/CustomerLayout';
import { CustomerDashboard } from '../pages/CustomerDashboard';
import { CustomerOrders } from '../pages/CustomerOrders';
import { CustomerProfile } from '../pages/CustomerProfile';
import { CustomerAddresses } from '../pages/CustomerAddresses';
import { useApp } from '../../../context/AppContext';

export function CustomerRoutes() {
  const { isAuthenticated } = useApp();

  return (
    <Routes>
      <Route
        path="login"
        element={
          isAuthenticated
            ? <Navigate to="/account/dashboard" replace />
            : <AuthPage mode="login" portal="customer" />
        }
      />
      <Route
        path="register"
        element={
          isAuthenticated
            ? <Navigate to="/account/dashboard" replace />
            : <AuthPage mode="signup" portal="customer" />
        }
      />

      <Route element={<RequireCustomer><CustomerLayout /></RequireCustomer>}>
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="orders/:id" element={<CustomerOrders />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="addresses" element={<CustomerAddresses />} />
      </Route>

      {/* Tracking works without an account, so it lives at the top level. */}
      <Route path="track" element={<Navigate to="/track" replace />} />

      <Route path="*" element={<Navigate to="/account/dashboard" replace />} />
    </Routes>
  );
}
