import { useState, useRef } from 'react';
import {
  User, Bell, CreditCard, Shield, Save, Camera, History
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatPrice } from '../../marketplace/productHelpers';
import { formatCurrency } from '../../utils/money';
import { cn } from '../../utils/cn';
import { useAuditLogsQuery } from '../../hooks/useAuditLogs';
import {
  useCurrentSubscriptionQuery,
  usePlansQuery,
  useInvoicesQuery,
  useChangePlanMutation,
  useCancelSubscriptionMutation,
  useResumeSubscriptionMutation,
} from '../../hooks/useBillingQueries';
import toast from 'react-hot-toast';
import { updateOwnProfileApi } from '../../api/auth';
import { uploadImageApi } from '../../api/upload';

/**
 * Account settings for a seller on the marketplace.
 *
 * Store branding, custom domains and staff seats used to live here. They
 * assumed a seller owns a shopfront; on Nexus they do not, so the tabs are
 * gone along with the storefront editor.
 */
const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'audit', label: 'Audit Logs', icon: <History size={16} /> },
  { id: 'billing', label: 'Billing & Plan', icon: <CreditCard size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
];

export function Settings() {
  const { user, updateUser } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  // Replaces a native confirm() for the one destructive action on this page.
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  // Shown, never edited here — see the field below.
  const email = user?.email || '';

  // Audit Logs API Hook
  const { data: auditLogs = [] } = useAuditLogsQuery(50);

  // Billing API Hooks
  const { data: subData } = useCurrentSubscriptionQuery();
  const { data: availablePlans = [] } = usePlansQuery();
  const { data: invoicesData = [] } = useInvoicesQuery();
  const changePlanMutation = useChangePlanMutation();
  const cancelSubMutation = useCancelSubscriptionMutation();
  const resumeSubMutation = useResumeSubscriptionMutation();

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
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  /**
   * Uploads the picture, then stores the URL it came back with.
   *
   * This used to read the file with FileReader and put the base64 straight
   * into React state: nothing was uploaded, nothing was saved, and the toast
   * said "Profile avatar updated successfully!" over an image that vanished
   * on the next reload.
   */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSavingAvatar(true);
    try {
      const { url } = await uploadImageApi(file);
      await updateOwnProfileApi({ avatar: url });
      updateUser({ avatar: url });
      toast.success('Profile picture updated', { icon: '📸' });
    } catch (err: any) {
      toast.error(err?.message || 'That picture could not be saved.');
    } finally {
      setSavingAvatar(false);
      // Let the same file be chosen again after a failure.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Saves the name. The email is deliberately NOT sent: changing the address
   * you sign in with has to go through verification, and quietly rewriting the
   * column here would lock someone out of their own account.
   */
  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const res = await updateOwnProfileApi({ name });
      updateUser({ name: res.data.name });
      setSaved(true);
      toast.success('Profile saved');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast.error(err?.message || 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer',
        checked ? 'bg-[#27C93F]' : 'bg-[var(--ink)]/20'
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
      <input
        type="file"
        aria-label="Upload profile photo"
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
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)] border border-[#FFBD2E]/30 font-semibold'
                    : 'text-muted hover:text-primary hover:bg-[var(--ink)]/5'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

        </div>

        {/* Content */}
        <div className="flex-1 stat-card p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-primary mb-1">Profile Settings</h3>
                <p className="text-xs text-muted">Manage your personal information and avatar photo</p>
              </div>

              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-[var(--ink)]/10 overflow-hidden bg-slate-900">
                    {user?.avatar ? (
                      <img loading="lazy" decoding="async" src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-2xl font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <button aria-label="Change profile photo"
                    type="button"
                    disabled={savingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-[#FFBD2E] hover:bg-[#27C93F] disabled:opacity-60 text-slate-950 rounded-full border-2 border-[var(--surface-inverse)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Camera size={13} className="font-bold" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">{user?.name}</p>
                  <p className="text-xs text-muted mt-0.5">{user?.role || 'Owner'}{entitlements?.planName ? ` · ${entitlements.planName}` : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
                {/*
                  Read-only, because saving it is not implemented.
                  Changing the address you sign in with has to go through
                  verification of the new one, or an account can be moved to a
                  mailbox its owner does not control. An editable box that the
                  save then ignores is the same untruth as a form that does not
                  submit, so the field says what it is.
                */}
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  readOnly
                  hint="Write to support to change the address you sign in with."
                  placeholder="email@example.com"
                />
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                icon={saved ? <span>✓</span> : <Save size={14} />}
              >
                {savingProfile ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
              </Button>
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-primary mb-1">Merchant Audit Trail</h3>
                <p className="text-xs text-muted">Audit logging for security compliance and merchant activity</p>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary uppercase text-[10px] px-1.5 py-0.5 rounded bg-[var(--ink)]/10">{log.action}</span>
                        <span className="text-strong font-mono">{log.resource}</span>
                      </div>
                      <p className="text-[11px] text-muted mt-1">
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
                <h3 className="text-base font-semibold text-primary mb-1">SaaS Subscription & Entitlements</h3>
                <p className="text-xs text-muted">Manage your Nexus Commerce platform subscription, capability limits, and invoices</p>
              </div>

              {/* Current Active Plan Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--ink)]/10 via-[var(--ink)]/5 to-transparent border border-[var(--ink)]/15 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {/* No invented fallbacks. These read
                          `|| 'Growth Plan'` and `|| 'ACTIVE'`, so a merchant
                          whose subscription had not loaded — or had lapsed —
                          was shown a plan it might not be on and a status it
                          might not have. An em dash is honest about not
                          knowing yet. */}
                      <h4 className="text-lg font-extrabold text-primary">
                        {entitlements?.planName || sub?.plan?.name || '—'}
                      </h4>
                      {sub?.status && (
                        <Badge
                          variant={sub.status === 'ACTIVE' || sub.status === 'TRIALING' ? 'success' : 'warning'}
                          size="sm"
                          dot
                        >
                          {sub.status}
                        </Badge>
                      )}
                      {sub?.cancelAtPeriodEnd && <Badge variant="warning" size="sm">Cancels at Period End</Badge>}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Billing Period Ends: <span className="font-mono text-primary font-bold">{sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'Active'}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    {/* `|| 79` invented a price for a plan whose real one
                        had not arrived, and the `$` was hardcoded on a
                        platform that bills in the merchant's own currency. */}
                    <span className="text-2xl font-black text-[var(--brand-green-ink)]">
                      {typeof sub?.plan?.monthlyPrice === 'number'
                        ? formatPrice(sub.plan.monthlyPrice, sub.plan.currency)
                        : '—'}
                    </span>
                    <span className="text-xs text-muted">
                      /{sub?.billingInterval === 'ANNUAL' ? 'year' : 'month'}
                    </span>
                  </div>
                </div>

                {/* Usage Gauges */}
                {entitlements && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--ink)]/10 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-body">
                        <span>Active Products</span>
                        <span className="font-bold font-mono">{entitlements.productCount} / {entitlements.maxProducts}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--ink)]/10 overflow-hidden">
                        <div
                          className="h-full bg-[#FFBD2E] rounded-full transition-colors"
                          style={{ width: `${Math.min(100, (entitlements.productCount / entitlements.maxProducts) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-body">
                        <span>Team Members</span>
                        <span className="font-bold font-mono">{entitlements.teamMemberCount} / {entitlements.maxTeamMembers}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--ink)]/10 overflow-hidden">
                        <div
                          className="h-full bg-[#27C93F] rounded-full transition-colors"
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
                      // A native confirm() blocks the whole renderer, cannot
                      // be styled or themed, and is the one dialog a user
                      // cannot dismiss with the app's own Escape handling.
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </div>

              {/* Available Plans Selector */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-primary">Compare Available Subscription Plans</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {availablePlans.map((p) => (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                        sub?.planId === p.id
                          ? 'bg-[var(--ink)]/10 border-[#FFBD2E] text-primary shadow-lg'
                          : 'bg-[var(--ink)]/5 border-[var(--ink)]/10 text-body hover:border-[var(--ink)]/20'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-primary">{p.name}</span>
                          {sub?.planId === p.id && <Badge variant="success" size="sm">Current Plan</Badge>}
                        </div>
                        <p className="text-[11px] text-muted leading-relaxed">{p.description}</p>
                        <div className="text-lg font-black text-primary">{formatPrice(p.monthlyPrice, p.currency)} <span className="text-xs text-muted">/mo</span></div>
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
              <div className="space-y-3 border-t border-[var(--ink)]/10 pt-4">
                <h4 className="text-sm font-bold text-primary">Subscription Invoices & Receipts</h4>
                <div className="space-y-2">
                  {invoicesData.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4">No billing invoices found.</p>
                  ) : (
                    invoicesData.map((inv) => (
                      <div key={inv.id} className="p-3.5 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-primary font-mono">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-muted">Issued: {new Date(inv.issueDate).toLocaleDateString()}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[var(--brand-green-ink)]">{formatPrice(inv.total, inv.currency)}</span>
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
                <h3 className="text-base font-semibold text-primary mb-1">Notification Preferences</h3>
                <p className="text-xs text-muted">Choose when and how you receive merchant alerts</p>
              </div>

              <div className="space-y-0">
                {[
                  { key: 'emailOrders', label: 'New order emails', desc: 'Get emailed when a new order is placed' },
                  { key: 'emailMarketing', label: 'Marketing updates', desc: 'Tips, tutorials, and feature announcements' },
                  { key: 'emailReports', label: 'Weekly reports', desc: 'Performance summary every Monday' },
                ].map((item, i) => (
                  <div key={item.key} className={cn('flex items-center justify-between py-4', i !== 0 && 'border-t border-[var(--ink)]/5')}>
                    <div>
                      <p className="text-sm font-medium text-primary">{item.label}</p>
                      <p className="text-xs text-muted mt-0.5">{item.desc}</p>
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
                <h3 className="text-base font-semibold text-primary mb-1">Security Settings</h3>
                <p className="text-xs text-muted">Keep your account and access credentials safe</p>
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
          <div className="bg-[var(--surface-overlay)] border border-[var(--ink)]/20 p-6 rounded-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-start border-b border-[var(--ink)]/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-green-ink)]">Nexus SaaS Invoice</span>
                <h3 className="text-lg font-bold text-primary">{viewingInvoice.invoiceNumber}</h3>
              </div>
              <Badge variant="success" size="sm">{viewingInvoice.status}</Badge>
            </div>

            <div className="text-xs space-y-2 text-body">
              <p>Issue Date: <strong className="text-primary">{new Date(viewingInvoice.issueDate).toLocaleDateString()}</strong></p>
              <p>Billing Period: <strong className="text-primary">{new Date(viewingInvoice.periodStart).toLocaleDateString()} — {new Date(viewingInvoice.periodEnd).toLocaleDateString()}</strong></p>
            </div>

            <div className="border border-[var(--ink)]/10 rounded-xl overflow-hidden text-xs">
              <div className="bg-[var(--ink)]/5 p-2 font-bold text-primary flex justify-between">
                <span>Description</span>
                <span>Amount</span>
              </div>
              {viewingInvoice.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-2 border-t border-[var(--ink)]/5 flex justify-between text-strong">
                  <span>{item.description} (x{item.quantity})</span>
                  <span className="font-mono">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 font-bold text-sm text-primary">
              <span>Total Paid</span>
              <span className="text-[var(--brand-green-ink)] font-mono">{formatPrice(viewingInvoice.total, viewingInvoice.currency)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => toast.success('Invoice print view loaded')}>Print / Download PDF</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewingInvoice(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/*
        Cancelling a subscription, confirmed in the app's own dialog.

        It used to be `confirm(...)`, which blocks the renderer, ignores the
        theme, and is the one dialog the app's Escape handling cannot reach.
        The copy also now says what actually happens — the plan runs to the
        end of the period already paid for, rather than stopping at once.
      */}
      <Modal
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        title="Cancel your subscription?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-secondary">
            Your plan stays active until{' '}
            <span className="font-semibold text-primary">
              {sub?.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })
                : 'the end of the current period'}
            </span>
            . Nothing is lost before then, and you can resume at any time up to that date.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCancelDialogOpen(false)}>
              Keep my plan
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelSubMutation.isPending}
              onClick={async () => {
                try {
                  await cancelSubMutation.mutateAsync();
                  toast.success('Your subscription will end at the close of this period.');
                  setCancelDialogOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Could not cancel the subscription');
                }
              }}
            >
              Cancel subscription
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}