import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Zap, ArrowLeft, Lock, Mail, User, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { getAssetUrl } from '../../utils/assetPath';

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email or username'),
  password: z.string().min(1, 'Please enter your password'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

interface AuthPageProps {
  mode: 'login' | 'signup';
  /** Which portal this form signs into. Controls copy and post-login routing. */
  portal?: 'seller' | 'customer' | 'admin';
}

const passwordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-[#FF5F56]' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-[#FFBD2E]' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-cyan-500' };
  return { score, label: 'Strong', color: 'bg-[#27C93F]' };
};

export function AuthPage({ mode, portal = 'seller' }: AuthPageProps) {
  const routerNavigate = useNavigate();
  const { navigate, login, signup, loginWithOAuth, isLoading, isAuthenticated, user } = useApp();

  const [oauthPending, setOauthPending] = useState(false);

  if (isAuthenticated && user?.email && !user.email.includes('@nexus.io')) {
    const target = portal === 'customer' ? '/account/dashboard' : (portal === 'admin' ? '/admin/dashboard' : '/seller/dashboard');
    return <Navigate to={target} replace />;
  }
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  /**
   * Password reset is not implemented server-side yet (Phase 1). Say so rather
   * than claiming an email was sent — the previous version told users to check
   * an inbox that would never receive anything.
   */
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Password reset is not available yet. Contact support@nexuscommerce.io to regain access.');
  };
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [watchedPassword, setWatchedPassword] = useState('');

  const isLogin = mode === 'login';

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password, portal);
      if (result.success) {
        toast.success('Welcome back!', { icon: '👋' });
        const targetPath = portal === 'customer' ? '/account/dashboard' : (portal === 'admin' ? '/admin/dashboard' : '/seller/dashboard');
        routerNavigate(targetPath);
      } else {
        toast.error(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Please try again.');
    }
  };

  const handleSignup = async (data: SignupForm) => {
    const result = await signup(data.name, data.email, data.password, undefined, portal === 'customer' ? 'CUSTOMER' : 'SELLER', portal);
    if (result.success) {
      toast.success('Account created & stored in database! Welcome to Nexus 🎉');
    } else {
      toast.error(result.error || 'Failed to create account. Please try again.');
    }
  };

  /**
   * Google Identity Services popup.
   *
   * The access token it returns is the only acceptable proof of identity — it
   * is forwarded to the server, which verifies it with Google. There is no
   * "type your email instead" fallback: that would let anyone sign in as
   * anyone, which is exactly the hole this replaced.
   */
  const startGoogleSignIn = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      toast.error('Google sign-in is not configured. Use your email and password.');
      return;
    }

    const requestToken = () => {
      const gsi = (window as any).google?.accounts?.oauth2;
      if (!gsi) return false;

      try {
        const tokenClient = gsi.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (!tokenResponse?.access_token) {
              setOauthPending(false);
              toast.error('Google sign-in was cancelled.');
              return;
            }

            const result = await loginWithOAuth(
              'google',
              { accessToken: tokenResponse.access_token },
              portal
            );
            setOauthPending(false);

            if (result.success) {
              toast.success('Signed in with Google.', { icon: '🎉' });
            } else {
              toast.error(result.error || 'Google sign-in failed.');
            }
          },
          error_callback: () => {
            setOauthPending(false);
            toast.error('Google sign-in was cancelled.');
          },
        });

        setOauthPending(true);
        tokenClient.requestAccessToken();
        return true;
      } catch {
        return false;
      }
    };

    if (requestToken()) return;

    // Load the GSI client once, then retry.
    const scriptId = 'google-gsi-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const onReady = () => {
      if (!requestToken()) {
        toast.error('Could not open Google sign-in. Use your email and password.');
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = onReady;
      script.onerror = () => toast.error('Could not load Google sign-in.');
      document.body.appendChild(script);
    } else {
      onReady();
    }
  };

  const handleOAuthClick = (provider: 'google' | 'github') => {
    if (provider === 'google') {
      startGoogleSignIn();
      return;
    }
    // GitHub needs a server-side redirect flow; it is not wired up yet.
    toast.error('GitHub sign-in is not available yet. Use Google or your email and password.');
  };

  const strength = passwordStrength(watchedPassword);

  return (
    <div className="min-h-screen bg-[#0B0D1B] flex">
      {/* Left panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6">
          <button
            onClick={() => navigate('marketing')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to home
          </button>
          <button onClick={() => navigate('marketing')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center shadow-md">
              <Zap size={14} className="text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-white text-sm">Nexus</span>
          </button>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {isLogin ? 'Welcome back' : 'Start your journey'}
              </h1>
              <p className="text-white/50">
                {isLogin
                  ? 'Sign in to your Nexus Commerce account'
                  : '14-day free trial · No credit card required'}
              </p>
            </div>

            {/* OAuth buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleOAuthClick('google')}
                disabled={isLoading || oauthPending}
                aria-busy={oauthPending}
                className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-white disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {oauthPending ? 'Connecting…' : 'Google'}
              </button>
              <button
                type="button"
                onClick={() => handleOAuthClick('github')}
                disabled={isLoading}
                className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-white disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#0B0D1B] text-white/30">or continue with email</span>
              </div>
            </div>

            {/* Form */}
            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <Input
                  label="Email address or Username"
                  type="text"
                  placeholder="you@company.com or username"
                  icon={<Mail size={16} />}
                  error={loginForm.formState.errors.email?.message}
                  {...loginForm.register('email')}
                />
                <div>
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    icon={<Lock size={16} />}
                    error={loginForm.formState.errors.password?.message}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-white/30 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    {...loginForm.register('password')}
                  />
                  <div className="flex justify-end mt-1.5">
                    <button 
                      type="button" 
                      onClick={() => { setResetSubmitted(false); setShowForgotModal(true); }}
                      className="text-xs text-[#FFBD2E] hover:text-[#27C93F] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  className="mt-2 rounded-xl"
                >
                  Sign in
                </Button>
              </form>
            ) : (
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <Input
                  label="Full name"
                  type="text"
                  placeholder="Sarah Mitchell"
                  icon={<User size={16} />}
                  error={signupForm.formState.errors.name?.message}
                  {...signupForm.register('name')}
                />
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@company.com"
                  icon={<Mail size={16} />}
                  error={signupForm.formState.errors.email?.message}
                  {...signupForm.register('email')}
                />
                <div>
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    icon={<Lock size={16} />}
                    error={signupForm.formState.errors.password?.message}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-white/30 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    {...signupForm.register('password', {
                      onChange: e => setWatchedPassword(e.target.value)
                    })}
                  />
                  {watchedPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-all duration-300',
                              i < strength.score ? strength.color : 'bg-white/10'
                            )}
                          />
                        ))}
                      </div>
                      <p className={cn(
                        'text-xs font-medium',
                        strength.score <= 1 ? 'text-[#FF5F56]' :
                        strength.score <= 2 ? 'text-[#FFBD2E]' :
                        strength.score <= 3 ? 'text-cyan-400' : 'text-[#27C93F]'
                      )}>
                        {strength.label} password
                      </p>
                    </div>
                  )}
                </div>
                <Input
                  label="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  icon={<Lock size={16} />}
                  error={signupForm.formState.errors.confirmPassword?.message}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1 text-white/30 hover:text-white/70 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  {...signupForm.register('confirmPassword')}
                />

                <p className="text-xs text-white/30 leading-relaxed">
                  By creating an account, you agree to our{' '}
                  <button type="button" onClick={() => navigate('terms')} className="text-[#FFBD2E] hover:underline">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => navigate('privacy')} className="text-[#FFBD2E] hover:underline">Privacy Policy</button>.
                </p>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  className="rounded-xl"
                >
                  Create free account
                </Button>
              </form>
            )}

            {/* Switch mode */}
            <p className="text-center text-sm text-white/40 mt-6">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => navigate(isLogin ? 'signup' : 'login')}
                className="text-[#FFBD2E] hover:text-[#27C93F] font-medium transition-colors"
              >
                {isLogin ? 'Start free trial' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - Visual */}
      <div className="hidden lg:flex flex-col w-[45%] bg-gradient-to-br from-[#0B0D1B] via-[#131629] to-[#1E122C] p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-[#FF5F56]/20 blur-3xl animate-pulse-slow" />

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="mb-12">
            <div className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Commerce built
              <br />
              <span className="text-gradient">for the future</span>
            </div>
            <p className="text-white/50 text-lg leading-relaxed">
              Join 2.1 million merchants growing with Nexus Commerce.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-4">
            {[
              'AI-powered store building and optimization',
              'World-class checkout that converts up to 50% more',
              'Real-time analytics and predictive insights',
              'Multi-channel selling across web, social, and POS',
              'Enterprise security with 99.99% uptime',
            ].map(feature => (
              <div key={feature} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#27C93F]/20 border border-[#27C93F]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-[#27C93F]" />
                </div>
                <span className="text-sm text-white/70">{feature}</span>
              </div>
            ))}
          </div>

          {/* Testimonial mini */}
          <div className="mt-12 p-6 glass rounded-2xl border border-white/10">
            <p className="text-sm text-white/70 italic mb-4">
              "Nexus Commerce tripled our revenue in 6 months. The AI tools alone were worth every penny."
            </p>
            <div className="flex items-center gap-3">
              <img src={getAssetUrl('/images/avatar-1.jpg')} alt="" className="w-9 h-9 rounded-full object-cover border border-white/20" />
              <div>
                <div className="text-sm font-medium text-white">Sarah M.</div>
                <div className="text-xs text-white/40">Mitchell Collective · $2.4M ARR</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowForgotModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121528] border border-white/20 p-6 rounded-2xl space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Reset Your Password</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Enter the email address associated with your store account, and we'll send you a password reset link.
            </p>

            {resetSubmitted ? (
              <div className="p-4 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-[#27C93F] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} /> Reset link sent! Please check your email inbox.
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="merchant@yourstore.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" type="submit">
                    Send Reset Link
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setShowForgotModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* OAuth Email Selection Modal */}
    </div>
  );
}
