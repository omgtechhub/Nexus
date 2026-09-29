import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

const navItems = [
  {
    label: 'Products',
    children: [
      { label: 'Online Store', desc: 'Build your storefront' },
      { label: 'Point of Sale', desc: 'In-person selling' },
      { label: 'Nexus Payments', desc: 'Accept any payment' },
      { label: 'Nexus Capital', desc: 'Merchant growth funding' },
      { label: 'Nexus Shipping', desc: 'Discounted labels & tracking' },
      { label: 'Nexus Markets', desc: 'Global cross-border sales' },
      { label: 'NexusIQ', desc: 'Powered by Merchant AI' },
      { label: 'Shop Pay', desc: '1-Click accelerated checkout' },
    ],
  },
  {
    label: 'Solutions',
    children: [
      { label: 'Startups', desc: 'Launch in minutes' },
      { label: 'Small Business', desc: 'All-in-one store software' },
      { label: 'Enterprises', desc: 'Scale to millions' },
      { label: 'D2C Brands', desc: 'Own your channel' },
      { label: 'B2B Wholesale', desc: 'Trade efficiently' },
      { label: 'Marketplaces', desc: 'Multi-vendor platform' },
      { label: 'Retail', desc: 'Brick-and-mortar stores' },
      { label: 'International', desc: 'Cross-border trade' },
    ],
  },
  { label: 'Pricing' },
  {
    label: 'Resources',
    children: [
      { label: 'Resource Hub', desc: 'Calculators, guides & tools' },
      { label: 'Documentation', desc: 'API & Liquid theme engine' },
      { label: 'Blog', desc: 'CRO playbooks & growth' },
      { label: 'Help Center', desc: '24/7 store support & FAQs' },
      { label: 'Partners', desc: 'Agency partner network' },
      { label: 'App Store', desc: 'Extend store functionality' },
      { label: 'Changelog', desc: 'Latest updates & releases' },
      { label: 'Community', desc: 'Merchant forums & events' },
    ],
  },
  {
    label: 'Company',
    children: [
      { label: 'About Us', desc: 'Our mission & leadership team' },
      { label: 'Careers', desc: 'Open remote positions' },
      { label: 'Press', desc: 'Media kit & news releases' },
      { label: 'Investors', desc: 'Financial reports & funding' },
      { label: 'Contact', desc: '24/7 support & sales office' },
    ],
  },
];

export function Navbar() {
  const { navigate, isAuthenticated, user, isAdmin, isCustomer } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (label: string) => {
    if (label === 'Pricing') {
      navigate('pricing');
    } else if (label === 'Resources') {
      navigate('resources');
    }
    setActiveDropdown(null);
    setMobileOpen(false);
  };

  const handleProductClick = (label: string) => {
    setActiveDropdown(null);
    setMobileOpen(false);
    if (label === 'Online Store') navigate('online-store');
    else if (label === 'Point of Sale') navigate('pos');
    else if (label === 'Nexus Payments') navigate('payments');
    else if (label === 'Nexus Capital') navigate('capital');
    else if (label === 'Nexus Shipping') navigate('shipping');
    else if (label === 'Nexus Markets') navigate('markets');
    else if (label === 'NexusIQ' || label === 'AI Assistant') navigate('ai-assistant');
    else if (label === 'Shop Pay') navigate('shop-pay');
    else if (label === 'Startups') navigate('startups');
    else if (label === 'Small Business') navigate('small-business');
    else if (label === 'Enterprises' || label === 'Enterprise') navigate('enterprises');
    else if (label === 'D2C Brands') navigate('d2c');
    else if (label === 'B2B Wholesale') navigate('b2b');
    else if (label === 'Marketplaces') navigate('marketplaces');
    else if (label === 'Retail') navigate('retail');
    else if (label === 'International') navigate('international');
    else if (label === 'Resource Hub') navigate('resources');
    else if (label === 'Documentation') navigate('docs');
    else if (label === 'Blog') navigate('blog');
    else if (label === 'Help Center') navigate('help-center');
    else if (label === 'Partners') navigate('partners');
    else if (label === 'App Store') navigate('app-store');
    else if (label === 'Changelog') navigate('changelog');
    else if (label === 'Status Page') navigate('status-page');
    else if (label === 'Community') navigate('community');
    else if (label === 'About Us') navigate('about');
    else if (label === 'Careers') navigate('careers');
    else if (label === 'Press') navigate('press');
    else if (label === 'Investors') navigate('investors');
    else if (label === 'Contact') navigate('contact');
  };

  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const toggleMobileCategory = (label: string) => {
    setMobileExpanded(mobileExpanded === label ? null : label);
  };

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-[#0B0D1B]/95 backdrop-blur-xl border-b border-[#222642] shadow-2xl'
          : 'bg-transparent'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => navigate('marketing')}
              className="flex items-center gap-2.5 group flex-shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:shadow-yellow-500/40 transition-all">
                <Zap size={16} className="text-white" fill="currentColor" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Nexus</span>
            </button>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <div key={item.label} className="relative">
                  <button
                    onClick={() => {
                      if (item.children) {
                        setActiveDropdown(activeDropdown === item.label ? null : item.label);
                      } else {
                        handleNavClick(item.label);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      'text-white/70 hover:text-white hover:bg-white/5',
                      activeDropdown === item.label && 'text-white bg-white/5'
                    )}
                  >
                    {item.label}
                    {item.children && (
                      <ChevronDown size={14} className={cn(
                        'transition-transform duration-200',
                        activeDropdown === item.label && 'rotate-180'
                      )} />
                    )}
                  </button>

                  {/* Dropdown */}
                  {item.children && activeDropdown === item.label && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#0D0F1F] rounded-xl shadow-2xl border border-white/20 overflow-hidden py-2 z-50">
                      {item.children.map(child => (
                        <button
                          key={child.label}
                          onClick={() => handleProductClick(child.label)}
                          className="w-full flex flex-col items-start px-4 py-2.5 hover:bg-white/10 transition-colors text-left group/item"
                        >
                          <span className="text-sm font-semibold text-white group-hover/item:text-[#FFBD2E] transition-colors">{child.label}</span>
                          <span className="text-xs text-white/40 mt-0.5">{child.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={() => navigate('customer-portal')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#27C93F] bg-[#27C93F]/10 border border-[#27C93F]/30 hover:bg-[#27C93F]/20 transition-colors"
              >
                Track Order
              </button>

              {isAuthenticated ? (
                <>
                  {isAdmin ? (
                    <button
                      onClick={() => navigate('/admin/dashboard')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/20 transition-colors"
                    >
                      Admin Portal
                    </button>
                  ) : isCustomer ? (
                    <button
                      onClick={() => navigate('/account/dashboard')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#27C93F] bg-[#27C93F]/10 border border-[#27C93F]/30 hover:bg-[#27C93F]/20 transition-colors"
                    >
                      Customer Account
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/seller/dashboard')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Merchant Dashboard
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (isAdmin) navigate('/admin/dashboard');
                      else if (isCustomer) navigate('/account/dashboard');
                      else navigate('/seller/dashboard');
                    }}
                    className="flex items-center gap-2 rounded-full border border-white/10 hover:border-emerald-500/50 p-0.5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                      {user?.avatar
                        ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        : user?.name?.charAt(0)
                      }
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/seller/login')}
                  >
                    Log in
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/seller/register')}
                  >
                    Start free trial
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2.5 rounded-xl text-white/80 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <div className="relative top-16 left-0 right-0 bg-[#0B0D1B] border-b border-[#222642] max-h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-3 shadow-2xl">
            {navItems.map(item => (
              <div key={item.label} className="border-b border-white/5 pb-2">
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleMobileCategory(item.label)}
                      className="w-full flex items-center justify-between py-3 px-3 rounded-xl text-white font-semibold text-base hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {item.label}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[#FFBD2E]">
                          {item.children.length}
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        className={cn(
                          'text-white/40 transition-transform duration-200',
                          mobileExpanded === item.label && 'rotate-180 text-[#FFBD2E]'
                        )}
                      />
                    </button>

                    {/* Accordion Subitems */}
                    {mobileExpanded === item.label && (
                      <div className="mt-1 ml-2 pl-3 border-l-2 border-[#FFBD2E]/40 space-y-1 py-1">
                        {item.children.map(child => (
                          <button
                            key={child.label}
                            onClick={() => handleProductClick(child.label)}
                            className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-white/10 transition-all text-xs font-medium text-white/80 hover:text-white flex flex-col"
                          >
                            <span className="font-semibold text-sm text-white">{child.label}</span>
                            <span className="text-[11px] text-white/40">{child.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleNavClick(item.label)}
                    className="w-full text-left py-3 px-3 rounded-xl text-white font-semibold text-base hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </button>
                )}
              </div>
            ))}

            {/* Account & Quick Action Buttons */}
            <div className="pt-4 space-y-3">
              {isAuthenticated ? (
                <Button variant="primary" size="md" fullWidth onClick={() => {
                  if (isAdmin) navigate('/admin/dashboard');
                  else if (isCustomer) navigate('/account/dashboard');
                  else navigate('/seller/dashboard');
                  setMobileOpen(false);
                }}>
                  {isCustomer ? 'Customer Account' : 'Merchant Dashboard'}
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" size="md" fullWidth onClick={() => { navigate('/seller/login'); setMobileOpen(false); }}>
                    Log in
                  </Button>
                  <Button variant="primary" size="md" fullWidth onClick={() => { navigate('/seller/register'); setMobileOpen(false); }}>
                    Free Trial
                  </Button>
                </div>
              )}

              {/* Quick Legal & Support Footer Links in Mobile Menu */}
              <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-center text-xs text-white/40">
                <button onClick={() => { navigate('privacy'); setMobileOpen(false); }} className="hover:text-white py-1">Privacy Policy</button>
                <button onClick={() => { navigate('terms'); setMobileOpen(false); }} className="hover:text-white py-1">Terms of Service</button>
                <button onClick={() => { navigate('cookies'); setMobileOpen(false); }} className="hover:text-white py-1">Cookie Policy</button>
                <button onClick={() => { navigate('sitemap'); setMobileOpen(false); }} className="hover:text-white py-1">Sitemap</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for desktop dropdowns */}
      {activeDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
      )}
    </>
  );
}
