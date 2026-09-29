import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLoginPage } from '../../../pages/AdminLoginPage';
import { RequirePlatformAdmin } from '../../../app/auth/guards';
import { useApp } from '../../../context/AppContext';
import { AdminLayout } from '../layout/AdminLayout';
import { AdminOverview } from '../pages/AdminOverview';
import { AdminMerchants } from '../pages/AdminMerchants';
import { AdminPlans } from '../pages/AdminPlans';
import { AdminInvoices, AdminTransactions } from '../pages/AdminBilling';

export function AdminRoutes() {
  const { isAdmin } = useApp();

  return (
    <Routes>
      <Route
        path="login"
        element={isAdmin ? <Navigate to="/admin/dashboard" replace /> : <AdminLoginPage />}
      />

      <Route element={<RequirePlatformAdmin><AdminLayout /></RequirePlatformAdmin>}>
        <Route path="dashboard" element={<AdminOverview />} />
        <Route path="merchants" element={<AdminMerchants />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="invoices" element={<AdminInvoices />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
