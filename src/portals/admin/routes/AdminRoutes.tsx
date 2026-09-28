import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminPanel } from '../../../components/admin/AdminPanel';
import { AdminLoginPage } from '../../../pages/AdminLoginPage';
import { RequirePlatformAdmin } from '../../../app/auth/guards';
import { useApp } from '../../../context/AppContext';

export function AdminRoutes() {
  const { isAuthenticated, user } = useApp();
  const isPlatformAdmin = Boolean(
    isAuthenticated && (
      (user as any)?.platformRole === 'PLATFORM_OWNER' ||
      (user as any)?.platformRole === 'PLATFORM_ADMIN'
    )
  );

  return (
    <Routes>
      <Route
        path="login"
        element={
          isPlatformAdmin ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminLoginPage />
          )
        }
      />
      <Route
        path="dashboard"
        element={
          <RequirePlatformAdmin>
            <AdminPanel />
          </RequirePlatformAdmin>
        }
      />
      <Route
        path=":tab"
        element={
          <RequirePlatformAdmin>
            <AdminPanel />
          </RequirePlatformAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
