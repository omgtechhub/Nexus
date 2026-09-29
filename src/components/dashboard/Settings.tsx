import { useState, useRef } from 'react';
import {
  User, Bell, CreditCard, Shield, Store, Save, Camera, Users, Globe, History, Trash2, ShieldCheck, Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import {
  useTeamQuery,
  useUpdateMemberRoleMutation,
  useRemoveTeamMemberMutation,
  useInviteTeamMemberMutation,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
  useDomainsQuery,
  useAddDomainMutation,
  useVerifyDomainMutation,
  useSetPrimaryDomainMutation,
  useDeleteDomainMutation,
  useAuditLogsQuery,
} from '../../hooks/usePhase7Queries';
import {
  useCurrentSubscriptionQuery,
  usePlansQuery,
  useInvoicesQuery,
  useChangePlanMutation,
  useCancelSubscriptionMutation,
  useResumeSubscriptionMutation,
} from '../../hooks/useBillingQueries';
import { PlatformAdminView } from '../admin/PlatformAdminView';
import toast from 'react-hot-toast';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'store', label: 'Store', icon: <Store size={16} /> },
  { id: 'team', label: 'Team', icon: <Users size={16} /> },
  { id: 'domains', label: 'Domains', icon: <Globe size={16} /> },
  { id: 'audit', label: 'Audit Logs', icon: <History size={16} /> },
  { id: 'billing', label: 'Billing & Plan', icon: <CreditCard size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
];

export function Settings() {
  const { user, updateUser, store, storeSettings } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Store Form State
  const [storeName, setStoreName] = useState(store?.name || 'Aura Apparel');
  const [storeUrl, setStoreUrl] = useState(storeSettings?.storeUrl || 'auraapparel');

  // Team API Hooks
  const { data: teamData } = useTeamQuery();
  const updateRoleMutation = useUpdateMemberRoleMutation();
  const removeMemberMutation = useRemoveTeamMemberMutation();
  const inviteMemberMutation = useInviteTeamMemberMutation();
  const resendInviteMutation = useResendInvitationMutation();
  const revokeInviteMutation = useRevokeInvitationMutation();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'STAFF' | 'VIEWER'>('STAFF');
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Domains API Hooks
  const { data: domainsData = [] } = useDomainsQuery();
  const addDomainMutation = useAddDomainMutation();
  const verifyDomainMutation = useVerifyDomainMutation();
  const setPrimaryDomainMutation = useSetPrimaryDomainMutation();
  const deleteDomainMutation = useDeleteDomainMutation();

  const [newDomain, setNewDomain] = useState('');
  const [showDomainForm, setShowDomainForm] = useState(false);

  // Audit Logs API Hook
  const { data: auditLogs = [] } = useAuditLogsQuery(50);

  // Billing API Hooks
  const { data: subData } = useCurrentSubscriptionQuery();
  const { data: availablePlans = [] } = usePlansQuery();
  const { data: invoicesData = [] } = useInvoicesQuery();
  const changePlanMutation = useChangePlanMutation();
  const cancelSubMutation = useCancelSubscriptionMutation();
  const resumeSubMutation = useResumeSubscriptionMutation();

  // Platform Admin Modal
  const [showPlatformAdmin, setShowPlatformAdmin] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Notifications Form State
  const [notifPrefs, setNotifPrefs] = useState(user?.notificationPrefs || {
    emailOrders: true,
    emailMarketing: false,
    emailReports: true,
    pushNotifications: true,
    smsAlerts: false,
  });

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateUser({ avatar: reader.result });
        toast.success('Profile avatar updated successfully!', { icon: '📸' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Enter the email address to invite');
      return;
    }
    try {
      await inviteMemberMutation.mutateAsync({ email, role: inviteRole });
      toast.success(`Invitation sent to ${email}`);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not send that invitation');
    }
  };

  const handleResendInvite = async (id: string, email: string) => {
    try {
      await resendInviteMutation.mutateAsync(id);
      toast.success(`Invitation resent to ${email}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not resend that invitation');
    }
  };

  const handleRevokeInvite = async (id: string, email: string) => {
    try {
      await revokeInviteMutation.mutateAsync(id);
      toast.success(`Invitation to ${email} revoked`);
    } catch (err: any) {
      toast.error(err.message || 'Could not revoke that invitation');
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    if (!domain) {
      toast.error('Enter the domain you want to connect');
      return;
    }
    try {
      await addDomainMutation.mutateAsync(domain);
      toast.success('Domain added. Point your DNS at Nexus, then verify.');
      setNewDomain('');
      setShowDomainForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not add that domain');
    }
  };

  const handleVerifyDomain = async (id: string) => {
    try {
      const res = await verifyDomainMutation.mutateAsync(id);
      if (res.verified) {
        toast.success('DNS verified. The domain is now live.');
      } else {
        toast.error(res.message || 'DNS does not point at Nexus yet. Records can take a while to propagate.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
  };

  const handleSetPrimaryDomain = async (id: string, domain: string) => {
    try {
      await setPrimaryDomainMutation.mutateAsync(id);
      toast.success(`${domain} is now your primary domain`);
    } catch (err: any) {
      toast.error(err.message || 'Could not set the primary domain');
    }
  };

  const handleDeleteDomain = async (id: string, domain: string) => {
    try {
      await deleteDomainMutation.mutateAsync(id);
      toast.success(`${domain} disconnected`);
    } catch (err: any) {
      toast.error(err.message || 'Could not disconnect that domain');
    }
  };

  const handleSaveProfile = () => {
    updateUser({ name, email });
    setSaved(true);
    toast.success('Profile information saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer',
        checked ? 'bg-[#27C93F]' : 'bg-white/20'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200'
      )} style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  );

  const sub = subData?.subscription;
  const entitlements = subData?.entitlements;

  return (
    <div className="max-w-5xl">
      {showPlatformAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#060813]">
          <PlatformAdminView onClose={() => setShowPlatformAdmin(false)} />
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="sm:w-48 flex-shrink-0 space-y-3">
          <nav className="space-y-1">
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-[#FFBD2E]/10 text-[#FFBD2E] border border-[#FFBD2E]/30 font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Platform Admin Console Quick Access */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFBD2E] flex items-center gap-1">
              <ShieldCheck size={12} /> Platform Admin
            </span>
            <p className="text-[11px] text-white/50">Access platform MRR/ARR analytics & global SaaS plans.</p>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => setShowPlatformAdmin(true)}
            >
              Open Admin Portal
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 stat-card p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Profile Settings</h3>
                <p className="text-xs text-white/40">Manage your personal information and avatar photo</p>
              </div>

              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-white/10 overflow-hidden bg-slate-900">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-2xl font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-[#FFBD2E] hover:bg-[#27C93F] text-slate-950 rounded-full border-2 border-[#141414] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Camera size={13} className="font-bold" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{user?.role || 'Owner'} · {entitlements?.planName || 'Pro Merchant'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <Button variant="primary" size="md" onClick={handleSaveProfile} icon={saved ? <span>✓</span> : <Save size={14} />}>
                {saved ? 'Saved!' : 'Save changes'}
              </Button>
            </div>
          )}

          {/* Store Tab */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Store Profile & Settings</h3>
                <p className="text-xs text-white/40">Configure store identity, currency, and business defaults</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Store Name"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <Input
                  label="Store URL Handle"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  rightElement={<span className="text-xs text-white/30 pr-1">.nexuscommerce.io</span>}
                />
              </div>

              <Button variant="primary" size="md" onClick={() => toast.success('Store profile updated!')} icon={<Save size={14} />}>
                Save store configuration
              </Button>
            </div>
          )}

          {/* TEAM MANAGEMENT TAB */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Team Management & RBAC</h3>
                  <p className="text-xs text-white/40">Invite staff members and manage access permissions (OWNER, ADMIN, STAFF, VIEWER)</p>
                </div>
                {!showInviteForm && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={14} aria-hidden="true" />}
                    onClick={() => setShowInviteForm(true)}
                  >
                    Invite member
                  </Button>
                )}
              </div>

              {showInviteForm && (
                <form onSubmit={handleInviteMember} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <label htmlFor="invite-email" className="mb-1.5 block text-xs text-white/50">
                        Email address
                      </label>
                      <input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="teammate@example.com"
                        required
                        className="w-full rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#FFBD2E]/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="invite-role" className="mb-1.5 block text-xs text-white/50">Role</label>
                      <select
                        id="invite-role"
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as 'ADMIN' | 'STAFF' | 'VIEWER')}
                        className="w-full rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-sm text-white focus:border-[#FFBD2E]/50 focus:outline-none"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="STAFF">Staff</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" variant="primary" size="sm" loading={inviteMemberMutation.isPending}>
                      Send invitation
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowInviteForm(false); setInviteEmail(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {teamData?.invitations && teamData.invitations.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Pending invitations
                  </h4>
                  <div className="space-y-2">
                    {teamData.invitations.map(inv => (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white">{inv.email}</p>
                          <p className="text-[11px] text-white/40">
                            {inv.role} · invited {new Date(inv.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvite(inv.id, inv.email)}
                            loading={resendInviteMutation.isPending}
                          >
                            Resend
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id, inv.email)}
                            className="rounded p-1.5 text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
                            aria-label={`Revoke the invitation to ${inv.email}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {teamData?.members.map(m => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FFBD2E]/20 text-[#FFBD2E] flex items-center justify-center font-bold text-xs">
                        {m.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{m.name} {m.userId === user?.id && '(You)'}</p>
                        <p className="text-[11px] text-white/40">{m.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={m.role}
                        onChange={async (e) => {
                          try {
                            await updateRoleMutation.mutateAsync({ memberId: m.id, role: e.target.value as any });
                            toast.success('Role updated successfully');
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to update role');
                          }
                        }}
                        disabled={m.role === 'OWNER'}
                        className="px-2.5 py-1 rounded bg-[#121528] border border-white/10 text-white text-xs"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="STAFF">STAFF</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>

                      {m.role !== 'OWNER' && (
                        <button
                          onClick={async () => {
                            if (confirm(`Remove ${m.name} from team?`)) {
                              try {
                                await removeMemberMutation.mutateAsync(m.id);
                                toast.success('Member removed from team');
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to remove member');
                              }
                            }
                          }}
                          className="text-red-400 hover:text-red-300 text-xs font-semibold p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOM DOMAINS TAB */}
          {activeTab === 'domains' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Custom Domain Management</h3>
                  <p className="text-xs text-white/40">Connect your custom web domain with real automated DNS verification</p>
                </div>
                {!showDomainForm && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={14} aria-hidden="true" />}
                    onClick={() => setShowDomainForm(true)}
                  >
                    Add domain
                  </Button>
                )}
              </div>

              {showDomainForm && (
                <form onSubmit={handleAddDomain} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <label htmlFor="new-domain" className="mb-1.5 block text-xs text-white/50">
                    Domain
                  </label>
                  <input
                    id="new-domain"
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    placeholder="shop.yourbrand.com"
                    required
                    className="w-full rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#FFBD2E]/50 focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-white/40">
                    Add the domain here first, point its DNS at Nexus, then verify.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" variant="primary" size="sm" loading={addDomainMutation.isPending}>
                      Add domain
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowDomainForm(false); setNewDomain(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {domainsData.map((dom: any) => (
                  <div key={dom.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{dom.domain}</span>
                        {dom.isPrimary && <Badge variant="success" size="sm">Primary</Badge>}
                        {dom.status === 'VERIFIED' ? (
                          <Badge variant="success" size="sm" dot>DNS Verified</Badge>
                        ) : (
                          <Badge variant="warning" size="sm" dot>DNS Pending</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {dom.status !== 'VERIFIED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVerifyDomain(dom.id)}
                            loading={verifyDomainMutation.isPending}
                          >
                            Verify DNS
                          </Button>
                        )}
                        {dom.status === 'VERIFIED' && !dom.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimaryDomain(dom.id, dom.domain)}
                            loading={setPrimaryDomainMutation.isPending}
                          >
                            Make primary
                          </Button>
                        )}
                        {!dom.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                            className="rounded p-1.5 text-red-400 transition-colors hover:text-red-300"
                            aria-label={`Disconnect ${dom.domain}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    {dom.status !== 'VERIFIED' && (
                      <p className="text-[11px] text-white/40">
                        Create a CNAME for{' '}
                        <span className="font-mono text-white/70">{dom.domain}</span>{' '}
                        pointing at{' '}
                        <span className="font-mono text-white/70">stores.nexuscommerce.io</span>, then verify.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Merchant Audit Trail</h3>
                <p className="text-xs text-white/40">Audit logging for security compliance and store activity</p>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/10">{log.action}</span>
                        <span className="text-white/80 font-mono">{log.resource}</span>
                      </div>
                      <p className="text-[11px] text-white/40 mt-1">
                        By {log.userEmail || 'System'} • {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BILLING & SAAS SUBSCRIPTION TAB */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">SaaS Subscription & Entitlements</h3>
                <p className="text-xs text-white/40">Manage your Nexus Commerce platform subscription, capability limits, and invoices</p>
              </div>

              {/* Current Active Plan Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-white/10 via-white/5 to-transparent border border-white/15 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-extrabold text-white">{entitlements?.planName || sub?.plan?.name || 'Growth Plan'}</h4>
                      <Badge variant="success" size="sm" dot>{sub?.status || 'ACTIVE'}</Badge>
                      {sub?.cancelAtPeriodEnd && <Badge variant="warning" size="sm">Cancels at Period End</Badge>}
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Billing Period Ends: <span className="font-mono text-white font-bold">{sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'Active'}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-[#27C93F]">
                      ${sub?.plan?.monthlyPrice || 79}
                    </span>
                    <span className="text-xs text-white/40">/month</span>
                  </div>
                </div>

                {/* Usage Gauges */}
                {entitlements && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-white/70">
                        <span>Active Products</span>
                        <span className="font-bold font-mono">{entitlements.productCount} / {entitlements.maxProducts}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#FFBD2E] rounded-full transition-all"
                          style={{ width: `${Math.min(100, (entitlements.productCount / entitlements.maxProducts) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-white/70">
                        <span>Team Members</span>
                        <span className="font-bold font-mono">{entitlements.teamMemberCount} / {entitlements.maxTeamMembers}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#27C93F] rounded-full transition-all"
                          style={{ width: `${Math.min(100, (entitlements.teamMemberCount / entitlements.maxTeamMembers) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  {sub?.cancelAtPeriodEnd ? (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={resumeSubMutation.isPending}
                      onClick={async () => {
                        await resumeSubMutation.mutateAsync();
                        toast.success('Subscription resumed!');
                      }}
                    >
                      Resume Subscription
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={cancelSubMutation.isPending}
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel your subscription at period end?')) {
                          await cancelSubMutation.mutateAsync();
                          toast.success('Subscription cancellation scheduled for period end.');
                        }
                      }}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </div>

              {/* Available Plans Selector */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">Compare Available Subscription Plans</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {availablePlans.map((p) => (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        sub?.planId === p.id
                          ? 'bg-white/10 border-[#FFBD2E] text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-white">{p.name}</span>
                          {sub?.planId === p.id && <Badge variant="success" size="sm">Current Plan</Badge>}
                        </div>
                        <p className="text-[11px] text-white/40 leading-relaxed">{p.description}</p>
                        <div className="text-lg font-black text-white">${p.monthlyPrice} <span className="text-xs text-white/40">/mo</span></div>
                      </div>

                      <div className="pt-4">
                        {sub?.planId !== p.id && (
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            loading={changePlanMutation.isPending}
                            onClick={async () => {
                              try {
                                await changePlanMutation.mutateAsync(p.code);
                                toast.success(`Switched subscription to ${p.name}!`);
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to change plan');
                              }
                            }}
                          >
                            Switch to {p.name}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoices History */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <h4 className="text-sm font-bold text-white">Subscription Invoices & Receipts</h4>
                <div className="space-y-2">
                  {invoicesData.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-4">No billing invoices found.</p>
                  ) : (
                    invoicesData.map((inv) => (
                      <div key={inv.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white font-mono">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-white/40">Issued: {new Date(inv.issueDate).toLocaleDateString()}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#27C93F]">${inv.total.toFixed(2)}</span>
                          <Badge variant="success" size="sm">{inv.status}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingInvoice(inv)}
                          >
                            View Invoice
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Notification Preferences</h3>
                <p className="text-xs text-white/40">Choose when and how you receive store alerts</p>
              </div>

              <div className="space-y-0">
                {[
                  { key: 'emailOrders', label: 'New order emails', desc: 'Get emailed when a new order is placed' },
                  { key: 'emailMarketing', label: 'Marketing updates', desc: 'Tips, tutorials, and feature announcements' },
                  { key: 'emailReports', label: 'Weekly reports', desc: 'Performance summary every Monday' },
                ].map((item, i) => (
                  <div key={item.key} className={cn('flex items-center justify-between py-4', i !== 0 && 'border-t border-white/5')}>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                      onChange={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Security Settings</h3>
                <p className="text-xs text-white/40">Keep your account and access credentials safe</p>
              </div>

              <div className="space-y-3">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button variant="primary" size="md" onClick={() => toast.success('Password updated')}>Update password</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Printable View Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121528] border border-white/20 p-6 rounded-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#27C93F]">Nexus SaaS Invoice</span>
                <h3 className="text-lg font-bold text-white">{viewingInvoice.invoiceNumber}</h3>
              </div>
              <Badge variant="success" size="sm">{viewingInvoice.status}</Badge>
            </div>

            <div className="text-xs space-y-2 text-white/70">
              <p>Issue Date: <strong className="text-white">{new Date(viewingInvoice.issueDate).toLocaleDateString()}</strong></p>
              <p>Billing Period: <strong className="text-white">{new Date(viewingInvoice.periodStart).toLocaleDateString()} — {new Date(viewingInvoice.periodEnd).toLocaleDateString()}</strong></p>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden text-xs">
              <div className="bg-white/5 p-2 font-bold text-white flex justify-between">
                <span>Description</span>
                <span>Amount</span>
              </div>
              {viewingInvoice.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-2 border-t border-white/5 flex justify-between text-white/80">
                  <span>{item.description} (x{item.quantity})</span>
                  <span className="font-mono">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 font-bold text-sm text-white">
              <span>Total Paid</span>
              <span className="text-[#27C93F] font-mono">${viewingInvoice.total.toFixed(2)} {viewingInvoice.currency}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => toast.success('Invoice print view loaded')}>Print / Download PDF</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewingInvoice(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
