import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { resetPasswordApi } from '../api/auth';

/** Mirrors the server's rules so the user isn't rejected after submitting. */
const RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, passed: r.test(password) })), [password]);
  const allPassed = checks.every((c) => c.passed);
  const matches = password.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allPassed) {
      setError('Your password does not meet all the requirements below.');
      return;
    }
    if (!matches) {
      setError('The two passwords do not match.');
      return;
    }

    setStatus('saving');
    try {
      await resetPasswordApi(token, password);
      setStatus('done');
      // Every session was revoked server-side, so sending them to sign in is
      // the honest next step rather than pretending they are still logged in.
      setTimeout(() => navigate('/seller/login'), 2500);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-[#0B0D1B] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#131629] border border-[#FF5F56]/30 rounded-2xl p-8 text-center space-y-4">
          <div
            className="w-14 h-14 rounded-2xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 text-[#FF5F56] mx-auto flex items-center justify-center"
            aria-hidden="true"
          >
            <AlertCircle size={28} />
          </div>
          <h1 className="text-2xl font-bold">This link is incomplete</h1>
          <p className="text-sm text-white/60">
            The reset link is missing its token. Request a fresh one and use the most recent email.
          </p>
          <Button variant="primary" size="md" fullWidth onClick={() => navigate('/forgot-password')}>
            Request a new link
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D1B] text-white flex items-center justify-center p-6">
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

        {status === 'done' ? (
          <div className="bg-[#131629] border border-[#222642] rounded-2xl p-8 text-center space-y-4">
            <div
              className="w-14 h-14 rounded-2xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-[#27C93F] mx-auto flex items-center justify-center"
              aria-hidden="true"
            >
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-2xl font-bold">Password changed</h1>
            <p className="text-sm text-white/60 leading-relaxed">
              For your security, every device has been signed out. Taking you to sign in…
            </p>
          </div>
        ) : (
          <div className="bg-[#131629] border border-[#222642] rounded-2xl p-8">
            <h1 className="text-2xl font-bold mb-2">Choose a new password</h1>
            <p className="text-sm text-white/50 mb-6">
              This also signs you out everywhere else.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input
                label="New password"
                id="new-password"
                type={reveal ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={16} aria-hidden="true" />}
                aria-describedby="password-rules"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setReveal((v) => !v)}
                    aria-label={reveal ? 'Hide password' : 'Show password'}
                    className="text-white/40 hover:text-white/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFBD2E] rounded p-1"
                  >
                    {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <ul id="password-rules" className="space-y-1.5">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        c.passed
                          ? 'w-4 h-4 rounded-full bg-[#27C93F]/15 text-[#27C93F] flex items-center justify-center'
                          : 'w-4 h-4 rounded-full border border-white/20'
                      }
                      aria-hidden="true"
                    >
                      {c.passed ? <CheckCircle2 size={11} /> : null}
                    </span>
                    <span className={c.passed ? 'text-white/70' : 'text-white/40'}>{c.label}</span>
                    <span className="sr-only">{c.passed ? '— met' : '— not yet met'}</span>
                  </li>
                ))}
              </ul>

              <Input
                label="Confirm new password"
                id="confirm-password"
                type={reveal ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                icon={<Lock size={16} aria-hidden="true" />}
                error={confirm.length > 0 && !matches ? 'Passwords do not match' : undefined}
              />

              {error && (
                <p role="alert" className="text-xs text-[#FF5F56] flex items-start gap-1.5">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={status === 'saving'}
                disabled={!allPassed || !matches}
              >
                Set new password
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
