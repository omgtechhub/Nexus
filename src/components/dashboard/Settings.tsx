import { useState } from 'react';
import { User, Bell, CreditCard, Shield, Store, Save, Camera } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'store', label: 'Store', icon: <Store size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
];

export function Settings() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(user?.notificationPrefs || {
    emailOrders: true,
    emailMarketing: false,
    emailReports: true,
    pushNotifications: true,
    smsAlerts: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-[#27C93F]' : 'bg-white/20'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-4.5' : 'translate-x-0.5'
      )} style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  );

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="sm:w-44 flex-shrink-0">
          <nav className="space-y-1">
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
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
        </div>

        {/* Content */}
        <div className="flex-1 stat-card p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Profile Settings</h3>
                <p className="text-xs text-white/40">Manage your personal information</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-white/10 overflow-hidden">
                    {user?.avatar
                      ? <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-2xl font-bold">{user?.name?.charAt(0)}</div>
                    }
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-[#FFBD2E] rounded-full border-2 border-[#141414] flex items-center justify-center hover:bg-[#27C93F] transition-colors">
                    <Camera size={12} className="text-slate-950 font-bold" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{user?.role} · {user?.plan} plan</p>
                  <button className="text-xs text-[#FFBD2E] hover:text-[#27C93F] mt-1 transition-colors font-medium">Change photo</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name" defaultValue={user?.name} placeholder="Your full name" />
                <Input label="Email Address" type="email" defaultValue={user?.email} placeholder="email@example.com" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Phone Number" type="tel" placeholder="+1 (555) 000-0000" />
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Timezone</label>
                  <select className="form-input">
                    <option>America/New_York (EST)</option>
                    <option>America/Chicago (CST)</option>
                    <option>America/Los_Angeles (PST)</option>
                    <option>Europe/London (GMT)</option>
                    <option>Asia/Tokyo (JST)</option>
                  </select>
                </div>
              </div>

              <Button variant="primary" size="md" onClick={handleSave} icon={saved ? <span>✓</span> : <Save size={14} />}>
                {saved ? 'Saved!' : 'Save changes'}
              </Button>
            </div>
          )}

          {/* Store Tab */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Store Settings</h3>
                <p className="text-xs text-white/40">Configure your storefront</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Store Name" defaultValue="Mitchell Collective" />
                <Input label="Store URL" defaultValue="mitchellcollective" rightElement={<span className="text-xs text-white/30 pr-1">.nexus.io</span>} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Currency</label>
                  <select className="form-input">
                    <option>USD — US Dollar</option>
                    <option>EUR — Euro</option>
                    <option>GBP — British Pound</option>
                    <option>CAD — Canadian Dollar</option>
                    <option>AUD — Australian Dollar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Industry</label>
                  <select className="form-input">
                    <option>Fashion & Apparel</option>
                    <option>Electronics</option>
                    <option>Home & Garden</option>
                    <option>Beauty & Health</option>
                    <option>Sports & Outdoors</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Store Description</label>
                <textarea className="form-input resize-none" rows={3} placeholder="Describe your store for SEO..." defaultValue="Premium fashion and lifestyle brand for modern living." />
              </div>
              <Button variant="primary" size="md" onClick={handleSave} icon={<Save size={14} />}>
                {saved ? 'Saved!' : 'Save settings'}
              </Button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Notification Preferences</h3>
                <p className="text-xs text-white/40">Choose when and how you receive alerts</p>
              </div>

              <div className="space-y-0">
                {[
                  { key: 'emailOrders', label: 'New order emails', desc: 'Get emailed when a new order is placed' },
                  { key: 'emailMarketing', label: 'Marketing updates', desc: 'Tips, tutorials, and feature announcements' },
                  { key: 'emailReports', label: 'Weekly reports', desc: 'Performance summary every Monday' },
                  { key: 'pushNotifications', label: 'Push notifications', desc: 'Browser and mobile push alerts' },
                  { key: 'smsAlerts', label: 'SMS alerts', desc: 'Critical alerts via text message' },
                ].map((item, i) => (
                  <div key={item.key} className={cn(
                    'flex items-center justify-between py-4',
                    i !== 0 && 'border-t border-white/5'
                  )}>
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
              <Button variant="primary" size="md" onClick={handleSave} icon={<Save size={14} />}>Save preferences</Button>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Billing & Subscription</h3>
                <p className="text-xs text-white/40">Manage your plan and payment methods</p>
              </div>

              <div className="glass-green rounded-2xl p-5 border border-emerald-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">Pro Plan</h4>
                      <Badge variant="success" size="sm" dot>Active</Badge>
                    </div>
                    <p className="text-sm text-white/50 mt-0.5">$79/month · Renews Feb 15, 2024</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400">$79</div>
                    <div className="text-xs text-white/30">/month</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">Upgrade to Enterprise</Button>
                  <Button variant="ghost" size="sm">Cancel plan</Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Payment Methods</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-white/10 flex items-center justify-center text-white text-xs font-bold">VISA</div>
                      <div>
                        <p className="text-sm text-white">Visa ending in 4242</p>
                        <p className="text-xs text-white/40">Expires 12/2026</p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">Default</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-3">+ Add payment method</Button>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Billing History</h4>
                <div className="space-y-1">
                  {[
                    { date: 'Jan 15, 2024', amount: '$79.00', status: 'Paid' },
                    { date: 'Dec 15, 2023', amount: '$79.00', status: 'Paid' },
                    { date: 'Nov 15, 2023', amount: '$79.00', status: 'Paid' },
                  ].map(invoice => (
                    <div key={invoice.date} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-sm text-white/60">{invoice.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{invoice.amount}</span>
                        <Badge variant="success" size="sm">{invoice.status}</Badge>
                        <button className="text-xs text-emerald-400 hover:text-emerald-300">PDF</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Security Settings</h3>
                <p className="text-xs text-white/40">Keep your account safe and secure</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Change Password</h4>
                <div className="space-y-3">
                  <Input label="Current Password" type="password" placeholder="Enter current password" />
                  <Input label="New Password" type="password" placeholder="At least 8 characters" />
                  <Input label="Confirm New Password" type="password" placeholder="Confirm new password" />
                  <Button variant="primary" size="md" onClick={handleSave}>Update password</Button>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Two-Factor Authentication</h4>
                    <p className="text-xs text-white/40 mt-0.5">Add an extra layer of security</p>
                  </div>
                  <Badge variant="success" size="sm" dot>Enabled</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Manage 2FA</Button>
                  <Button variant="ghost" size="sm">View backup codes</Button>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <h4 className="text-sm font-semibold text-white mb-3">Active Sessions</h4>
                <div className="space-y-2">
                  {[
                    { device: 'MacBook Pro (Current)', location: 'New York, US', time: 'Active now' },
                    { device: 'iPhone 15 Pro', location: 'New York, US', time: '2 hours ago' },
                  ].map(session => (
                    <div key={session.device} className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-medium text-white">{session.device}</p>
                        <p className="text-xs text-white/40">{session.location} · {session.time}</p>
                      </div>
                      {session.time !== 'Active now' && (
                        <button className="text-xs text-red-400 hover:text-red-300 transition-colors">Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <h4 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h4>
                <p className="text-xs text-white/40 mb-3">Permanently delete your account and all associated data.</p>
                <Button variant="danger" size="sm">Delete account</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
