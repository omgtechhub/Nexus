import { Routes, Route, Navigate } from 'react-router-dom';
import { CustomerPortalPage } from '../../../pages/CustomerPortalPage';
import { AuthPage } from '../../../components/auth/AuthPage';
import { RequireCustomer } from '../../../app/auth/guards';
import { CustomerLayout } from '../layout/CustomerLayout';
import { useApp } from '../../../context/AppContext';

export function CustomerRoutes() {
  const { isAuthenticated } = useApp();

  return (
    <Routes>
      <Route
        path="login"
        element={
          isAuthenticated ? (
            <Navigate to="/account/dashboard" replace />
          ) : (
            <AuthPage mode="login" portal="customer" />
          )
        }
      />
      <Route
        path="register"
        element={
          isAuthenticated ? (
            <Navigate to="/account/dashboard" replace />
          ) : (
            <AuthPage mode="signup" portal="customer" />
          )
        }
      />
      <Route
        element={
          <RequireCustomer>
            <CustomerLayout />
          </RequireCustomer>
        }
      >
        <Route path="dashboard" element={<CustomerPortalPage defaultTab="dashboard" />} />
        <Route path="orders" element={<CustomerPortalPage defaultTab="orders" />} />
        <Route path="orders/:id" element={<CustomerPortalPage defaultTab="orders" />} />
        <Route path="profile" element={<CustomerPortalPage defaultTab="profile" />} />
        <Route path="addresses" element={<CustomerPortalPage defaultTab="addresses" />} />
        <Route path="settings" element={<CustomerPortalPage defaultTab="settings" />} />
        <Route path="track" element={<CustomerPortalPage defaultTab="track" />} />
        <Route path="notifications" element={<CustomerPortalPage defaultTab="notifications" />} />
      </Route>

      <Route path="*" element={<Navigate to="/account/dashboard" replace />} />
    </Routes>
  );
}
