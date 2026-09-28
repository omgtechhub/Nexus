import { useState } from 'react';
import { Search, Mail, Phone, MapPin, ShoppingBag, DollarSign, UserPlus, Send, AlertTriangle, RotateCw } from 'lucide-react';
import { Customer } from '../../types';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useCustomersQuery } from '../../hooks/useQueries';
import toast from 'react-hot-toast';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

export function Customers() {
  const { navigate, customers: customersList, addCustomer } = useApp();
  const { isError, error, refetch } = useCustomersQuery();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showComposeEmailModal, setShowComposeEmailModal] = useState(false);

  // New Customer State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const filtered = customersList.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const avatarColors = [
    'from-[#FF5F56] to-[#EF4444]',
    'from-[#FFBD2E] to-[#F59E0B]',
    'from-[#27C93F] to-[#10B981]',
    'from-cyan-500 to-blue-600',
    'from-purple-500 to-indigo-600',
  ];

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error('Please provide a name and email');
      return;
    }

    setIsSubmitting(true);
    addCustomer(
      {
        name,
        email,
        phone,
        location,
        totalOrders: 0,
        totalSpent: 0,
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowAddCustomerModal(false);
          setName('');
          setEmail('');
          setPhone('');
          setLocation('');
          toast.success(`Customer "${name}" created successfully!`, { icon: '👤' });
        },
        onError: (err: any) => {
          setIsSubmitting(false);
          toast.error(err.message || 'Failed to create customer');
        },
      }
    );
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) {
      toast.error('Please enter an email subject and body');
      return;
    }

    setShowComposeEmailModal(false);
    setEmailSubject('');
    setEmailBody('');
    toast.success(`Email sent to ${selectedCustomer?.email}!`, { icon: '✉️' });
  };

  const handleViewOrders = () => {
    const custName = selectedCustomer?.name;
    setSelectedCustomer(null);
    navigate('dashboard', 'orders');
    toast.success(`Showing orders for ${custName}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-white/40 text-sm">{customersList.length} customers</p>
        <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => setShowAddCustomerModal(true)}>
          Add customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="form-input pl-9 h-9 text-sm"
        />
      </div>

      {/* Customer cards */}
      {isError ? (
        <div className="stat-card p-6 border border-[#FF5F56]/30 bg-[#FF5F56]/5 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center mx-auto text-[#FF5F56]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Couldn't load customers</h4>
            <p className="text-xs text-[#FF5F56] mt-1">{(error as Error)?.message || 'An error occurred while fetching customers.'}</p>
          </div>
          <Button variant="ghost" size="sm" icon={<RotateCw size={13} />} onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer, index) => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className="stat-card p-5 text-left hover:border-[#FFBD2E]/30 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
                  {getInitials(customer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{customer.name}</h3>
                  <p className="text-xs text-white/40 truncate">{customer.email}</p>
                  {customer.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/30">
                      <MapPin size={10} />
                      {customer.location}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#FFBD2E] mb-1">
                    <ShoppingBag size={12} />
                  </div>
                  <div className="text-sm font-bold text-white">{customer.totalOrders}</div>
                  <div className="text-[10px] text-white/30">Orders</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#27C93F] mb-1">
                    <DollarSign size={12} />
                  </div>
                  <div className="text-sm font-bold text-white">{formatCurrency(customer.totalSpent)}</div>
                  <div className="text-[10px] text-white/30">Spent</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-[10px] text-white/25">
                  Customer since {new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {customer.totalSpent > 1000 && (
                  <span className="text-[10px] bg-[#FFBD2E]/20 text-[#FFBD2E] px-1.5 py-0.5 rounded-full font-medium">VIP</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Customer detail modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="relative bg-[#121528] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Customer Profile</h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {getInitials(selectedCustomer.name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    {selectedCustomer.totalSpent > 1000 && (
                      <span className="text-xs bg-[#FFBD2E]/20 text-[#FFBD2E] px-2 py-0.5 rounded-full font-medium">VIP Customer</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <Mail size={14} className="text-white/30 flex-shrink-0" />
                  {selectedCustomer.email}
                </div>
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Phone size={14} className="text-white/30 flex-shrink-0" />
                    {selectedCustomer.phone}
                  </div>
                )}
                {selectedCustomer.location && (
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <MapPin size={14} className="text-white/30 flex-shrink-0" />
                    {selectedCustomer.location}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-xl p-4 text-center border border-white/5">
                  <div className="text-xl font-bold text-white">{selectedCustomer.totalOrders}</div>
                  <div className="text-xs text-white/40 mt-0.5">Total Orders</div>
                </div>
                <div className="glass rounded-xl p-4 text-center border border-white/5">
                  <div className="text-xl font-bold text-[#27C93F]">{formatCurrency(selectedCustomer.totalSpent)}</div>
                  <div className="text-xs text-white/40 mt-0.5">Total Spent</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  icon={<Mail size={14} />}
                  onClick={() => setShowComposeEmailModal(true)}
                >
                  Send email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ShoppingBag size={14} />}
                  onClick={handleViewOrders}
                >
                  View orders
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddCustomerModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="text-[#FFBD2E]" size={20} /> Add New Customer
            </h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Full Name</label>
                <input
                  required
                  className="form-input bg-[#121528] text-white"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  className="form-input bg-[#121528] text-white"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="form-input bg-[#121528] text-white"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Location</label>
                <input
                  className="form-input bg-[#121528] text-white"
                  placeholder="e.g. San Francisco, US"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-3">
                <Button type="submit" variant="primary" size="md" fullWidth disabled={isSubmitting}>
                  {isSubmitting ? 'Saving customer...' : 'Save Customer'}
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setShowAddCustomerModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      {showComposeEmailModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowComposeEmailModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="text-[#FFBD2E]" size={20} /> Email {selectedCustomer.name}
            </h3>
            <p className="text-xs text-white/40">Recipient: {selectedCustomer.email}</p>
            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Subject</label>
                <input
                  required
                  className="form-input bg-[#121528] text-white"
                  placeholder="e.g. Special offer for your next order!"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  className="form-input bg-[#121528] text-white resize-none"
                  placeholder="Write your email message..."
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" size="md" fullWidth icon={<Send size={14} />}>
                  Send Email
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setShowComposeEmailModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
