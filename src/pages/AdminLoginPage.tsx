import { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

export function AdminLoginPage() {
  const { navigate, login } = useApp();
  const [email, setEmail] = useState('admin@nexus.io');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await login(email, password, 'admin');
      setIsLoading(false);
      if (res.success) {
        toast.success('App Owner SuperAdmin authentication verified!', { icon: '🛡️' });
        navigate('admin');
      } else {
        toast.error(res.error || 'Authentication failed. Invalid admin credentials.');
      }
    } catch (err: any) {
      setIsLoading(false);
      toast.error(err.message || 'Authentication error. Unable to verify admin credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-deep)] text-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[300px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[250px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md glass p-8 rounded-3xl border border-red-500/30 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF5F56] to-red-600 border border-red-400/40 mx-auto flex items-center justify-center text-white shadow-xl">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Nexus App Owner Portal</h1>
          <p className="text-xs text-muted">Restricted Platform SuperAdmin System Administration</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-body mb-1">App Owner Admin Username / Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input aria-label="admin@nexus.io"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input bg-[var(--surface-overlay)] text-primary pl-10"
                placeholder="admin@nexus.io"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-body mb-1">Admin Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input aria-label="••••••••••••"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input bg-[var(--surface-overlay)] text-primary pl-10"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-[11px] text-red-300">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>SuperAdmin credentials grant access to global platform MRR, database snapshots & merchant accounts.</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-red-600 text-white font-bold rounded-xl"
            icon={<ArrowRight size={16} />}
            iconPosition="right"
          >
            Authenticate App Owner Access
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-[var(--ink)]/10">
          <button
            onClick={() => navigate('marketing')}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            ← Back to Public Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}
