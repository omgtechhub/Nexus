import { useState } from 'react';
import {
  Shield, Users, Database, Activity, AlertCircle,
  CheckCircle, Server, Lock, FileText,
  ArrowLeft, TrendingUp, Send, RefreshCw, Download, Check, X, ShieldAlert, Zap, Layers, Store, DollarSign, Plus, Edit3
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import {
  usePlatformMetricsQuery,
  usePlatformMerchantsQuery,
  usePlatformPlansQuery,
  usePlatformInvoicesQuery,
  useCreatePlatformPlanMutation,
  useUpdatePlatformPlanMutation,
} from '../../hooks/useBillingQueries';
import toast from 'react-hot-toast';

const adminTabs = [
  { id: 'overview', label: 'System Overview', icon: <Activity size={16} /> },
  { id: 'users', label: 'Merchant Directory', icon: <Users size={16} /> },
  { id: 'plans', label: 'SaaS Subscription Plans', icon: <Layers size={16} /> },
  { id: 'database', label: 'Database & Storage', icon: <Database size={16} /> },
  { id: 'security', label: 'Security Logs', icon: <Lock size={16} /> },
  { id: 'api', label: 'API Monitor', icon: <Server size={16} /> },
];

const initialSystemHealth = [
  { label: 'API Gateway', status: 'operational', latency: '12ms' },
  { label: 'Database Cluster', status: 'operational', latency: '4ms' },
  { label: 'CDN Network', status: 'operational', latency: '8ms' },
  { label: 'Payment Processor (Paystack/FLW)', status: 'operational', latency: '45ms' },
  { label: 'Email Service (SMTP)', status: 'operational', latency: '120ms' },
  { label: 'Search Index', status: 'operational', latency: '15ms' },
];

const initialUsers = [
  { id: 'u1', name: 'Sarah Mitchell', email: 'sarah@nexus.io', role: 'owner', plan: 'pro', status: 'active', joined: '2023-06-15', stores: 1 },
  { id: 'u2', name: 'James Watanabe', email: 'james@pacific.com', role: 'admin', plan: 'growth', status: 'active', joined: '2023-08-20', stores: 2 },
  { id: 'u3', name: 'Isabella Torres', email: 'isa@bloom.io', role: 'owner', plan: 'enterprise', status: 'active', joined: '2023-04-10', stores: 5 },
  { id: 'u4', name: 'Carlos Rivera', email: 'carlos@river.co', role: 'owner', plan: 'starter', status: 'active', joined: '2024-01-05', stores: 1 },
  { id: 'u5', name: 'Priya Sharma', email: 'priya@shop.in', role: 'staff', plan: 'growth', status: 'inactive', joined: '2023-11-15', stores: 0 },
];

const apiRequests = [
  { endpoint: 'GET /api/v1/orders', calls: 14820, errors: 0, p99: '18ms' },
  { endpoint: 'POST /api/v1/payments/initialize', calls: 3241, errors: 0, p99: '45ms' },
  { endpoint: 'GET /api/v1/products', calls: 28930, errors: 0, p99: '12ms' },
  { endpoint: 'GET /api/v1/admin/metrics', calls: 891, errors: 0, p99: '15ms' },
  { endpoint: 'GET /api/v1/customers', calls: 7820, errors: 0, p99: '22ms' },
  { endpoint: 'POST /api/v1/auth/oauth', calls: 4521, errors: 0, p99: '35ms' },
];

export function AdminPanel({ defaultTab = 'overview' }: { defaultTab?: string }) {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Live Backend Platform Admin Queries
  const { data: metrics, isLoading: metricsLoading } = usePlatformMetricsQuery();
  const { data: merchants = [], isLoading: merchantsLoading } = usePlatformMerchantsQuery();
  const { data: plans = [], isLoading: plansLoading } = usePlatformPlansQuery();
  const { data: invoices = [], isLoading: invoicesLoading } = usePlatformInvoicesQuery();

  const createPlanMutation = useCreatePlatformPlanMutation();
  const updatePlanMutation = useUpdatePlatformPlanMutation();

  const [usersList, setUsersList] = useState(initialUsers);
  const [securityLogs, setSecurityLogs] = useState([
    { time: '2 min ago', event: 'OAuth user login succeeded', source: '551667115856-...googleusercontent.com', severity: 'info' },
    { time: '15 min ago', event: 'Payment verified via Paystack API', source: 'Paystack Gateway', severity: 'success' },
    { time: '1 hr ago', event: 'Merchant store settings updated', source: 'admin@nexus.io', severity: 'info' },
    { time: '3 hrs ago', event: 'Rate limiting check passed', source: '127.0.0.1', severity: 'info' },
    { time: '5 hrs ago', event: 'Database connection health verified', source: 'system', severity: 'success' },
    { time: '1 day ago', event: 'Database backup completed', source: 'system', severity: 'success' },
  ]);


  // Quick Action Modals State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Broadcast Form State
  const [broadcastTarget, setBroadcastTarget] = useState('All Active Merchants (2.1M+)');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLevel, setBroadcastLevel] = useState('info');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // DB Backup Form State
  const [backupType, setBackupType] = useState('Full Automated Snapshot');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // Cache Clear Form State
  const [purgeRedis, setPurgeRedis] = useState(true);
  const [purgeCDN, setPurgeCDN] = useState(true);
  const [purgeAPI, setPurgeAPI] = useState(true);
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  // Audit Form State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<{ label: string; status: 'pass' | 'warn'; score: string }[] | null>(null);

  // Add User State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'admin' | 'staff'>('admin');
  const [newUserPlan, setNewUserPlan] = useState<'starter' | 'growth' | 'pro' | 'enterprise'>('pro');

  // Quick Action Handler 1: Broadcast Message
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastMessage) {
      toast.error('Please complete the subject and message fields');
      return;
    }
    setIsSendingBroadcast(true);
    setTimeout(() => {
      setIsSendingBroadcast(false);
      setShowBroadcastModal(false);
      setBroadcastSubject('');
      setBroadcastMessage('');
      toast.success(`Broadcast message dispatched to ${broadcastTarget}!`, { icon: '📢' });
      setSecurityLogs(prev => [
        { time: 'Just now', event: `System broadcast sent (${broadcastSubject})`, source: 'admin@nexus.io', severity: 'info' },
        ...prev
      ]);
    }, 1000);
  };

  // Quick Action Handler 2: Run DB Backup
  const handleRunBackup = () => {
    setIsBackingUp(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          setShowBackupModal(false);
          toast.success('Full database backup completed successfully!', { icon: '💾' });
          setSecurityLogs(prevLogs => [
            { time: 'Just now', event: 'Database backup completed (1.84 TB)', source: 'system', severity: 'success' },
            ...prevLogs
          ]);
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  // Quick Action Handler 3: Clear Cache
  const handleClearCache = () => {
    setIsPurgingCache(true);
    setTimeout(() => {
      setIsPurgingCache(false);
      setShowCacheModal(false);
      toast.success('Cache purged successfully! Flushed 215.0 GB of stale data.', { icon: '⚡' });
      setSecurityLogs(prev => [
        { time: 'Just now', event: 'System cache purged (Redis & CDN edge)', source: 'admin@nexus.io', severity: 'info' },
        ...prev
      ]);
    }, 1000);
  };

  // Quick Action Handler 4: Security Audit
  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setAuditResults([
        { label: 'SSL/TLS 1.3 Encryption & Certificates', status: 'pass', score: '100%' },
        { label: 'OAuth 2.0 Client Security & Key Guards', status: 'pass', score: '100%' },
        { label: '2FA Mandatory Enforcement Coverage', status: 'pass', score: '98.4%' },
        { label: 'API Rate Limiting & DDoS Shield', status: 'pass', score: '100%' },
        { label: 'CORS Origin & Cross-Domain Security', status: 'pass', score: '100%' },
        { label: 'SQL Injection & XSS Guard Filters', status: 'pass', score: '100%' },
      ]);
      toast.success('Security audit completed! All 6 core modules passed.', { icon: '🛡️' });
      setSecurityLogs(prev => [
        { time: 'Just now', event: 'Automated deep security audit completed (Grade A+)', source: 'system', severity: 'success' },
        ...prev
      ]);
    }, 1200);
  };

  // User Management Actions
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      toast.error('Please enter name and email');
      return;
    }
    const created = {
      id: `u_${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      plan: newUserPlan,
      status: 'active',
      joined: new Date().toISOString().split('T')[0],
      stores: 1,
    };
    setUsersList(prev => [created, ...prev]);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    toast.success(`User "${newUserName}" added as ${newUserRole}!`);
  };

  const handleExportUsersCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Plan', 'Status', 'Stores', 'Joined'];
    const rows = usersList.map(u => [u.id, `"${u.name}"`, u.email, u.role, u.plan, u.status, u.stores, u.joined]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_admin_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported admin users list to CSV!');
  };

  const handleToggleUserStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: nextStatus } : u));
    toast.success(`User account status updated to ${nextStatus}!`);
  };

  const handleExportSecurityLogs = () => {
    const headers = ['Time', 'Event', 'Source', 'Severity'];
    const rows = securityLogs.map(l => [`"${l.time}"`, `"${l.event}"`, `"${l.source}"`, l.severity]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_security_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Security logs exported successfully!');
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B]">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-[#FF5F56]/20 via-[#131629] to-[#0B0D1B] border-b border-[#FF5F56]/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF5F56]/20 border border-[#FF5F56]/30 flex items-center justify-center">
              <Shield size={16} className="text-[#FF5F56]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Admin Control Panel</h1>
              <p className="text-xs text-white/30">Nexus Commerce — Internal Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="error" size="sm" dot>Admin Access</Badge>
            <div className="flex items-center gap-1.5 text-xs text-[#27C93F] bg-[#27C93F]/10 border border-[#27C93F]/20 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-[#27C93F] rounded-full animate-pulse" />
              All systems live
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-white font-semibold shadow-md'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Registered Users',
                  value: metrics ? metrics.totalUsers.toLocaleString() : '2,184,329',
                  icon: <Users size={20} />,
                  change: metrics ? `${metrics.totalUsers} total registered` : '+4.2%',
                },
                {
                  label: 'Monthly Revenue (MRR)',
                  value: metrics ? `$${metrics.mrr.toFixed(2)}` : '$24.8M',
                  icon: <TrendingUp size={20} />,
                  change: metrics ? `ARR $${metrics.arr.toFixed(2)}` : '+18.5%',
                },
                {
                  label: 'Active Merchant Stores',
                  value: metrics ? metrics.totalStores.toLocaleString() : '1,928,441',
                  icon: <Server size={20} />,
                  change: metrics ? `${metrics.activeSubscriptionsCount} active subs` : '+3.1%',
                },
                {
                  label: 'Platform Gross Revenue',
                  value: metrics ? `$${metrics.totalRevenue.toFixed(2)}` : '$1.84M',
                  icon: <DollarSign size={20} />,
                  change: metrics ? `${metrics.totalTransactionsCount} paid txs` : 'Live DB',
                },
              ].map(stat => (
                <div key={stat.label} className="stat-card p-4">
                  <div className="flex items-center justify-between text-white/40 text-xs mb-3">
                    <span>{stat.label}</span>
                    {metrics && <span className="text-[10px] bg-[#27C93F]/10 text-[#27C93F] px-1.5 py-0.5 rounded font-mono font-bold">Live DB</span>}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-[#27C93F] font-medium">{stat.change}</div>
                </div>
              ))}
            </div>

            {/* System health */}
            <div className="stat-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">System Health & Live Monitoring</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {initialSystemHealth.map(service => (
                  <div key={service.label} className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                    <div className="flex items-center gap-2.5">
                      {service.status === 'operational'
                        ? <CheckCircle size={14} className="text-[#27C93F]" />
                        : <AlertCircle size={14} className="text-[#FFBD2E]" />
                      }
                      <span className="text-sm text-white/70">{service.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30">{service.latency}</span>
                      <Badge variant={service.status === 'operational' ? 'success' : 'warning'} size="sm">
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="stat-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'broadcast', label: 'Broadcast Message', icon: <FileText size={18} />, color: 'from-blue-600 to-indigo-600', action: () => setShowBroadcastModal(true) },
                  { id: 'backup', label: 'Run DB Backup', icon: <Database size={18} />, color: 'from-[#27C93F] to-emerald-600', action: () => setShowBackupModal(true) },
                  { id: 'cache', label: 'Clear Cache', icon: <Server size={18} />, color: 'from-[#FFBD2E] to-amber-600', action: () => setShowCacheModal(true) },
                  { id: 'audit', label: 'Security Audit', icon: <Shield size={18} />, color: 'from-[#FF5F56] to-red-600', action: () => { setShowAuditModal(true); if (!auditResults) handleRunAudit(); } },
                ].map(action => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className="p-4 glass rounded-xl border border-white/10 hover:border-[#FFBD2E]/40 hover:scale-[1.02] transition-all text-center group cursor-pointer"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-2 text-white shadow-lg transition-transform group-hover:scale-110',
                      action.color
                    )}>
                      {action.icon}
                    </div>
                    <span className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors block">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Merchant Directory */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-white/40 text-sm">
                  {merchants.length > 0 ? `${merchants.length} live store merchants` : `${usersList.length} users shown`}
                </p>
                {merchants.length > 0 && <span className="text-[10px] bg-[#27C93F]/10 text-[#27C93F] px-1.5 py-0.5 rounded font-mono font-bold">Live Backend</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExportUsersCSV}>Export CSV</Button>
                <Button variant="primary" size="sm" icon={<Users size={14} />} onClick={() => setShowAddUserModal(true)}>Add user</Button>
              </div>
            </div>
            <div className="stat-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Store / Merchant', 'Owner Email', 'Subscription Plan', 'Status', 'Products', 'Joined', 'Actions'].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {merchants.length > 0 ? (
                      merchants.map(m => (
                        <tr key={m.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-xs font-bold shadow-md">
                                {m.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{m.name}</p>
                                <p className="text-xs text-white/30 font-mono">{m.domain}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-white/70">{m.owner?.email || 'N/A'}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant="purple" size="sm">
                              {m.subscription?.planName || 'Free/Trial'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={m.status === 'ACTIVE' ? 'success' : 'default'} size="sm" dot>
                              {m.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-white/60 font-bold">{m.metrics?.productCount ?? 0}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-white/40">{new Date(m.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <button
                                onClick={() => toast.success(`Viewing store details for ${m.name}`)}
                                className="px-2 py-1 text-xs text-[#FFBD2E] hover:bg-[#FFBD2E]/10 rounded-lg transition-colors font-medium cursor-pointer"
                              >
                                Manage
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      usersList.map(user => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-xs font-bold shadow-md">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{user.name}</p>
                                <p className="text-xs text-white/30">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-white/70">{user.email}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant={user.plan === 'enterprise' ? 'success' : user.plan === 'pro' ? 'info' : 'ghost'} size="sm">
                              {user.plan}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={user.status === 'active' ? 'success' : 'default'} size="sm" dot>
                              {user.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-white/60">{user.stores}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-white/40">{user.joined}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <button
                                onClick={() => toast.success(`Editing preferences for ${user.name}`)}
                                className="px-2 py-1 text-xs text-[#FFBD2E] hover:bg-[#FFBD2E]/10 rounded-lg transition-colors font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SaaS Subscription Plans */}
        {activeTab === 'plans' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Live Configurable SaaS Subscription Plans</h3>
                <p className="text-xs text-white/40">Manage plan limits, max products, team sizes, and monthly rates directly in database.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((p) => (
                <div key={p.id} className="stat-card p-5 space-y-3 relative border border-white/10 hover:border-[#FFBD2E]/40 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{p.name}</h4>
                      <span className="text-[10px] font-mono text-[#FFBD2E] uppercase">{p.code}</span>
                    </div>
                    <Badge variant={p.isActive ? 'success' : 'secondary'} size="sm">
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">${p.monthlyPrice}</span>
                    <span className="text-xs text-white/50">/month</span>
                  </div>

                  <div className="text-xs text-white/60 space-y-1 pt-2 border-t border-white/10">
                    <p>• Max Products: <strong>{p.maxProducts}</strong></p>
                    <p>• Max Team Members: <strong>{p.maxTeamMembers}</strong></p>
                    <p>• Custom Domain: <strong>{p.customDomainAllowed ? 'Enabled' : 'Disabled'}</strong></p>
                    <p>• Analytics: <strong>{p.advancedAnalyticsAllowed ? 'Full' : 'Basic'}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database */}
        {activeTab === 'database' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Records', value: '284.2M', desc: 'Across all tables' },
                { label: 'DB Size', value: '1.84 TB', desc: 'Including replicas' },
                { label: 'Query Time (p95)', value: '8ms', desc: 'Last 24 hours' },
              ].map(metric => (
                <div key={metric.label} className="stat-card p-4">
                  <p className="text-xs text-white/40 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                  <p className="text-xs text-white/30 mt-1">{metric.desc}</p>
                </div>
              ))}
            </div>

            <div className="stat-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Database Tables</h3>
                <Button variant="ghost" size="sm" icon={<Database size={14} />} onClick={() => setShowBackupModal(true)}>
                  Run backup now
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Table', 'Rows', 'Size', 'Last Updated', 'Status'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { table: 'users', rows: '2.18M', size: '4.2 GB', updated: '2 min ago', status: 'healthy' },
                      { table: 'orders', rows: '48.4M', size: '128 GB', updated: '30 sec ago', status: 'healthy' },
                      { table: 'products', rows: '184M', size: '890 GB', updated: '1 min ago', status: 'healthy' },
                      { table: 'sessions', rows: '9.2M', size: '2.4 GB', updated: '5 sec ago', status: 'healthy' },
                      { table: 'analytics_events', rows: '4.8B', size: '784 GB', updated: '1 min ago', status: 'optimizing' },
                    ].map(row => (
                      <tr key={row.table} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-3"><span className="text-sm font-mono text-[#FFBD2E]">{row.table}</span></td>
                        <td className="p-3"><span className="text-sm text-white/60">{row.rows}</span></td>
                        <td className="p-3"><span className="text-sm text-white/60">{row.size}</span></td>
                        <td className="p-3"><span className="text-xs text-white/40">{row.updated}</span></td>
                        <td className="p-3">
                          <Badge variant={row.status === 'healthy' ? 'success' : 'warning'} size="sm" dot>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Security Logs */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <div className="stat-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Security Event Log</h3>
                <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExportSecurityLogs}>
                  Export logs
                </Button>
              </div>
              <div className="space-y-2">
                {securityLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl border border-white/5">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
                      log.severity === 'error' ? 'bg-[#FF5F56]' :
                      log.severity === 'warning' ? 'bg-[#FFBD2E]' :
                      log.severity === 'success' ? 'bg-[#27C93F]' : 'bg-cyan-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white font-medium">{log.event}</span>
                        <span className="text-xs text-white/30 flex-shrink-0">{log.time}</span>
                      </div>
                      <span className="text-xs text-white/40 font-mono">{log.source}</span>
                    </div>
                    <Badge variant={
                      log.severity === 'error' ? 'error' :
                      log.severity === 'warning' ? 'warning' :
                      log.severity === 'success' ? 'success' : 'info'
                    } size="sm">
                      {log.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Monitor */}
        {activeTab === 'api' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Requests (24h)', value: '4.2M' },
                { label: 'Error Rate', value: '0.09%' },
                { label: 'Avg Latency', value: '28ms' },
                { label: 'Active API Keys', value: '18,402' },
              ].map(metric => (
                <div key={metric.label} className="stat-card p-4">
                  <p className="text-xs text-white/40 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="stat-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">API Endpoint Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Endpoint', 'Calls (24h)', 'Errors', 'P99 Latency'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiRequests.map((req, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-3"><span className="text-xs font-mono text-white/70">{req.endpoint}</span></td>
                        <td className="p-3"><span className="text-sm text-white/60">{req.calls.toLocaleString()}</span></td>
                        <td className="p-3">
                          <span className={cn('text-sm', req.errors > 10 ? 'text-[#FF5F56]' : req.errors > 0 ? 'text-[#FFBD2E]' : 'text-[#27C93F]')}>
                            {req.errors}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={cn('text-sm', parseInt(req.p99) > 100 ? 'text-[#FFBD2E]' : 'text-white/60')}>{req.p99}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTION MODAL 1: BROADCAST MESSAGE */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBroadcastModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-400" size={20} /> System Broadcast Message
              </h3>
              <button onClick={() => setShowBroadcastModal(false)} className="text-white/40 hover:text-white p-1">✕</button>
            </div>
            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Recipient Target Group</label>
                <select
                  value={broadcastTarget}
                  onChange={e => setBroadcastTarget(e.target.value)}
                  className="form-input bg-[#121528] text-white"
                >
                  <option>All Active Merchants (2.1M+)</option>
                  <option>Enterprise Merchants Only</option>
                  <option>Growth Merchants</option>
                  <option>Admin & Staff Users</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Broadcast Severity Level</label>
                <select
                  value={broadcastLevel}
                  onChange={e => setBroadcastLevel(e.target.value)}
                  className="form-input bg-[#121528] text-white"
                >
                  <option value="info">Informational Announcement</option>
                  <option value="warning">System Maintenance Alert</option>
                  <option value="critical">Critical Urgent Warning</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Subject Header</label>
                <input
                  required
                  className="form-input bg-[#121528] text-white"
                  placeholder="e.g. Planned Infrastructure Maintenance Notice"
                  value={broadcastSubject}
                  onChange={e => setBroadcastSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  className="form-input bg-[#121528] text-white resize-none"
                  placeholder="Enter message details to broadcast to merchants..."
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" size="md" fullWidth loading={isSendingBroadcast} icon={<Send size={14} />}>
                  Dispatch Broadcast
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setShowBroadcastModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL 2: RUN DB BACKUP */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isBackingUp && setShowBackupModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#27C93F]/10 border border-[#27C93F]/30 mx-auto flex items-center justify-center text-[#27C93F]">
              <Database size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Database Backup Suite</h3>
            <p className="text-xs text-white/50">Initiate automated snapshot of PostgreSQL cluster (1.84 TB across 5 node replicas).</p>

            {isBackingUp ? (
              <div className="space-y-3 py-4">
                <div className="flex justify-between text-xs text-white/70">
                  <span>Backing up database tables...</span>
                  <span>{backupProgress}%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#27C93F] to-emerald-400 transition-all duration-300" style={{ width: `${backupProgress}%` }} />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Backup Target Profile</label>
                  <select
                    value={backupType}
                    onChange={e => setBackupType(e.target.value)}
                    className="form-input bg-[#121528] text-white"
                  >
                    <option>Full Automated Snapshot (1.84 TB)</option>
                    <option>Incremental WAL Log Backup</option>
                    <option>Schema & Tables Only</option>
                  </select>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white/60 space-y-1 font-mono">
                  <p>Target: PostgreSQL Cluster v16.2</p>
                  <p>Storage: AWS S3 Encrypted (us-east-1)</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="primary" size="md" fullWidth onClick={handleRunBackup} icon={<RefreshCw size={14} />}>
                    Start Backup
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setShowBackupModal(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL 3: CLEAR CACHE */}
      {showCacheModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isPurgingCache && setShowCacheModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="text-[#FFBD2E]" size={20} /> System Cache Purge
              </h3>
              <button onClick={() => setShowCacheModal(false)} className="text-white/40 hover:text-white p-1">✕</button>
            </div>
            <p className="text-xs text-white/50">Select cache tiers to flush across global edge servers and application instances.</p>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-3 glass rounded-xl border border-white/5 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">Redis Application Cache</span>
                  <span className="text-[11px] text-white/40">24.5 GB in-memory keys</span>
                </div>
                <input
                  type="checkbox"
                  checked={purgeRedis}
                  onChange={e => setPurgeRedis(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FFBD2E]"
                />
              </label>

              <label className="flex items-center justify-between p-3 glass rounded-xl border border-white/5 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">CDN Static Edge Assets</span>
                  <span className="text-[11px] text-white/40">182.4 GB cached images & scripts</span>
                </div>
                <input
                  type="checkbox"
                  checked={purgeCDN}
                  onChange={e => setPurgeCDN(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FFBD2E]"
                />
              </label>

              <label className="flex items-center justify-between p-3 glass rounded-xl border border-white/5 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">API Query Cache</span>
                  <span className="text-[11px] text-white/40">8.1 GB database responses</span>
                </div>
                <input
                  type="checkbox"
                  checked={purgeAPI}
                  onChange={e => setPurgeAPI(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FFBD2E]"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="md" fullWidth loading={isPurgingCache} onClick={handleClearCache} icon={<Zap size={14} />}>
                Purge Selected Caches
              </Button>
              <Button variant="ghost" size="md" onClick={() => setShowCacheModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL 4: SECURITY AUDIT */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAuditModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="text-[#FF5F56]" size={20} /> Deep Security Audit Suite
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="text-white/40 hover:text-white p-1">✕</button>
            </div>

            {isAuditing ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#FF5F56] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-white">Scanning system endpoints & SSL certificates...</p>
                <p className="text-xs text-white/40">Verifying 2FA enforcement & OAuth secret guards</p>
              </div>
            ) : auditResults ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#27C93F]/10 border border-[#27C93F]/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#27C93F]">
                    <CheckCircle size={16} /> Audit Passed — System Grade A+
                  </div>
                  <span className="text-xs text-white/50">Zero Critical Vulnerabilities</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {auditResults.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 glass rounded-lg border border-white/5">
                      <span className="text-white/80">{item.label}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#27C93F] font-bold">{item.score}</span>
                        <Check size={14} className="text-[#27C93F]" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="primary" size="md" fullWidth onClick={() => {
                    toast.success('Security audit report downloaded as PDF!');
                  }} icon={<Download size={14} />}>
                    Download Audit Report (PDF)
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setShowAuditModal(false)}>Close</Button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-3">
                <Button variant="primary" size="md" onClick={handleRunAudit}>Run Deep Security Audit</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddUserModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="text-[#FFBD2E]" size={20} /> Add Admin / Staff User
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Full Name</label>
                <input
                  required
                  className="form-input bg-[#121528] text-white"
                  placeholder="e.g. Alex Johnson"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  className="form-input bg-[#121528] text-white"
                  placeholder="alex@nexus.io"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">System Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as any)}
                    className="form-input bg-[#121528] text-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Assigned Plan</label>
                  <select
                    value={newUserPlan}
                    onChange={e => setNewUserPlan(e.target.value as any)}
                    className="form-input bg-[#121528] text-white"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <Button type="submit" variant="primary" size="md" fullWidth>Save User</Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setShowAddUserModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
