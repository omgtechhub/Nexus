import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

type AccountType = 'CUSTOMER' | 'SELLER' | 'ADMIN';

/** Where a given account type belongs when it lands somewhere it shouldn't. */
const HOME_FOR: Record<AccountType, string> = {
  ADMIN: '/admin/dashboard',
  SELLER: '/seller/dashboard',
  CUSTOMER: '/account/dashboard',
};

export function AccessDenied({ message, returnTo }: { message?: string; returnTo?: string }) {
  const { accountType } = useApp();
  const location = useLocation();
  const home = returnTo || (accountType ? HOME_FOR[accountType] : '/');

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex items-center justify-center p-6 text-center">
      <div className="glass p-8 rounded-3xl border border-red-500/30 max-w-md w-full space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 mx-auto flex items-center justify-center">
          <ShieldAlert size={28} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-black text-white">Access denied</h1>
        <p className="text-xs text-white/60 leading-relaxed">
          {message || `You do not have permission to open "${location.pathname}".`}
        </p>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => { window.location.href = home; }}
          icon={<ArrowLeft size={16} aria-hidden="true" />}
          className="bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold"
        >
          Return to your dashboard
        </Button>
      </div>
    </div>
  );
}

function AuthLoading() {
  return (
    <div
      className="min-h-screen bg-[#0B0D1B] flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Checking your session…</span>
      <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-[#FFBD2E] animate-spin" aria-hidden="true" />
    </div>
  );
}

/**
 * Shared gate for the three portals.
 *
 * Waits for the session check before deciding, so a signed-in user is never
 * bounced to a login screen during the initial /me round-trip. Anyone whose
 * account type doesn't match is sent to their own portal rather than shown a
 * dead end.
 */
function RequireAccountType({
  allow,
  loginPath,
  children,
}: {
  allow: AccountType;
  loginPath: string;
  children: React.ReactNode;
}) {
  const { isAuthenticated, accountType, isSessionLoading } = useApp();
  const location = useLocation();

  if (isSessionLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  // Session exists but the portal hasn't been resolved yet.
  if (!accountType) {
    return <AuthLoading />;
  }

  if (accountType !== allow) {
    return <Navigate to={HOME_FOR[accountType]} replace />;
  }

  return <>{children}</>;
}

export function RequireCustomer({ children }: { children: React.ReactNode }) {
  return (
    <RequireAccountType allow="CUSTOMER" loginPath="/account/login">
      {children}
    </RequireAccountType>
  );
}

export function RequireSeller({ children }: { children: React.ReactNode }) {
  return (
    <RequireAccountType allow="SELLER" loginPath="/seller/login">
      {children}
    </RequireAccountType>
  );
}

export function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  return (
    <RequireAccountType allow="ADMIN" loginPath="/admin/login">
      {children}
    </RequireAccountType>
  );
}
