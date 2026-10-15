import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { verifyEmailApi } from '../api/auth';
import { useApp } from '../context/AppContext';

/**
 * Confirm an email address from the link in the verification email.
 *
 * The token is single-use, so the request is fired exactly once even under
 * React's development double-invoke — a second call would consume a token that
 * the first had already burned and show a spurious failure.
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { isAuthenticated, accountType } = useApp();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setStatus('error');
      setMessage('This confirmation link is missing its token.');
      return;
    }

    verifyEmailApi(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Your email address is confirmed.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err instanceof Error ? err.message : 'This confirmation link is invalid or has expired.'
        );
      });
  }, [token]);

  const homePath =
    accountType === 'ADMIN'
      ? '/admin/dashboard'
      : accountType === 'CUSTOMER'
        ? '/account/dashboard'
        : '/seller/dashboard';

  return (
    <main className="min-h-screen bg-[var(--surface-base)] text-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 mb-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFBD2E] rounded-lg"
        >
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center">
            <Zap size={18} className="text-white" fill="currentColor" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold">Nexus</span>
        </Link>

        <div
          className="bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl p-8 text-center space-y-4"
          role="status"
          aria-live="polite"
        >
          {status === 'verifying' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[var(--ink)]/5 text-muted mx-auto flex items-center justify-center">
                <Loader2 size={26} className="animate-spin" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold">Confirming your email</h1>
              <p className="text-sm text-muted">One moment…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div
                className="w-14 h-14 rounded-2xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-[var(--brand-green-ink)] mx-auto flex items-center justify-center"
                aria-hidden="true"
              >
                <CheckCircle2 size={28} />
              </div>
              <h1 className="text-2xl font-bold">Email confirmed</h1>
              <p className="text-sm text-secondary leading-relaxed">{message}</p>
              <Button variant="primary" size="md" fullWidth>
                <Link to={isAuthenticated ? homePath : '/seller/login'} className="block w-full">
                  {isAuthenticated ? 'Go to your dashboard' : 'Sign in'}
                </Link>
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div
                className="w-14 h-14 rounded-2xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 text-[var(--brand-red-ink)] mx-auto flex items-center justify-center"
                aria-hidden="true"
              >
                <AlertCircle size={28} />
              </div>
              <h1 className="text-2xl font-bold">Could not confirm</h1>
              <p className="text-sm text-secondary leading-relaxed">{message}</p>
              <p className="text-xs text-muted">
                Confirmation links expire after 48 hours and can only be used once. Request a new
                one from your account settings.
              </p>
              <Button variant="secondary" size="md" fullWidth>
                <Link to={isAuthenticated ? homePath : '/'} className="block w-full">
                  {isAuthenticated ? 'Back to your dashboard' : 'Back to Nexus'}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
