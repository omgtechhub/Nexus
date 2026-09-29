import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { forgotPasswordApi } from '../api/auth';

/**
 * Request a password reset link.
 *
 * The confirmation is deliberately identical whether or not the address is
 * registered — matching the server, which refuses to confirm account existence
 * to an anonymous caller.
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('sending');

    try {
      await forgotPasswordApi(email.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not send the reset link. Try again.');
    }
  };

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

        {status === 'sent' ? (
          <div className="bg-[#131629] border border-[#222642] rounded-2xl p-8 text-center space-y-4">
            <div
              className="w-14 h-14 rounded-2xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-[#27C93F] mx-auto flex items-center justify-center"
              aria-hidden="true"
            >
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-2xl font-bold">Check your inbox</h1>
            <p className="text-sm text-white/60 leading-relaxed">
              If an account exists for <span className="text-white/90">{email}</span>, a reset link
              is on its way. It expires in 60 minutes.
            </p>
            <p className="text-xs text-white/40">
              Nothing arrived? Check spam, or{' '}
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="text-[#FFBD2E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFBD2E] rounded"
              >
                try another address
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="bg-[#131629] border border-[#222642] rounded-2xl p-8">
            <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">
              Enter the email address on your account and we'll send you a link to choose a new
              password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input
                label="Email address"
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={<Mail size={16} aria-hidden="true" />}
                error={error || undefined}
                aria-describedby={error ? 'reset-email-error' : undefined}
              />

              {error && (
                <p id="reset-email-error" role="alert" className="text-xs text-[#FF5F56]">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={status === 'sending'}
                disabled={!email.trim()}
              >
                Send reset link
              </Button>
            </form>
          </div>
        )}

        <Link
          to="/seller/login"
          className="mt-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFBD2E] rounded"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
