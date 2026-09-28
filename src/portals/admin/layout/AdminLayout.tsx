import React from 'react';
import { Outlet } from 'react-router-dom';

export function AdminLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      {children || <Outlet />}
    </div>
  );
}
