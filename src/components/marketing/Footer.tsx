import { Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const footerLinks = {
  Products: [
    'Online Store', 'Point of Sale', 'Nexus Payments', 'Nexus Capital',
    'Nexus Shipping', 'Nexus Markets', 'NexusIQ', 'Shop Pay'
  ],
  Solutions: [
    'Startups', 'Small Business', 'Enterprise', 'D2C Brands',
    'B2B Wholesale', 'Marketplaces', 'Retail', 'International'
  ],
  Resources: [
    'Documentation', 'Blog', 'Help Center', 'Partners',
    'App Store', 'Changelog', 'Status Page', 'Community'
  ],
  Company: [
    'About Us', 'Careers', 'Press', 'Investors',
    'Legal', 'Privacy', 'Terms', 'Contact'
  ],
};

const socialLinks = [
  { label: 'X/Twitter', href: '#', symbol: '𝕏' },
  { label: 'LinkedIn', href: '#', symbol: 'in' },
  { label: 'GitHub', href: '#', symbol: 'GH' },
  { label: 'YouTube', href: '#', symbol: '▶' },
  { label: 'Instagram', href: '#', symbol: '◻' },
];

export function Footer() {
  const { navigate } = useApp();

  const handleFooterClick = (link: string) => {
    switch (link) {
      case 'Online Store':
        navigate('online-store');
        break;
      case 'Point of Sale':
        navigate('pos');
        break;
      case 'Nexus Payments':
        navigate('payments');
        break;
      case 'Nexus Capital':
        navigate('capital');
        break;
      case 'Nexus Shipping':
        navigate('shipping');
        break;
      case 'Nexus Markets':
        navigate('markets');
        break;
      case 'NexusIQ':
        navigate('ai-assistant');
        break;
      case 'Shop Pay':
        navigate('shop-pay');
        break;
      case 'Startups':
        navigate('startups');
        break;
      case 'Small Business':
        navigate('small-business');
        break;
      case 'Enterprise':
      case 'Enterprises':
        navigate('enterprises');
        break;
      case 'D2C Brands':
        navigate('d2c');
        break;
      case 'B2B Wholesale':
        navigate('b2b');
        break;
      case 'Marketplaces':
        navigate('marketplaces');
        break;
      case 'Retail':
        navigate('retail');
        break;
      case 'International':
        navigate('international');
        break;
      case 'Documentation':
        navigate('docs');
        break;
      case 'Blog':
        navigate('blog');
        break;
      case 'Help Center':
        navigate('help-center');
        break;
      case 'Partners':
        navigate('partners');
        break;
      case 'App Store':
        navigate('app-store');
        break;
      case 'Changelog':
        navigate('changelog');
        break;
      case 'Status Page':
        navigate('status-page');
        break;
      case 'Community':
        navigate('community');
        break;
      case 'Privacy Policy':
      case 'Privacy':
        navigate('privacy');
        break;
      case 'Terms of Service':
      case 'Terms':
      case 'Legal':
        navigate('terms');
        break;
      case 'Cookie Policy':
        navigate('cookies');
        break;
      case 'Sitemap':
        navigate('sitemap');
        break;
      case 'About Us':
        navigate('about');
        break;
      case 'Careers':
        navigate('careers');
        break;
      case 'Press':
        navigate('press');
        break;
      case 'Investors':
        navigate('investors');
        break;
      case 'Contact':
        navigate('contact');
        break;
      default:
        navigate('marketing');
        break;
    }
  };

  return (
    <footer className="border-t border-[#222642] bg-[#0B0D1B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <button
              onClick={() => navigate('marketing')}
              className="flex items-center gap-2.5 mb-5 group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center shadow-lg shadow-red-900/40">
                <Zap size={18} className="text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-white">Nexus Commerce</span>
            </button>
            <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-xs">
              The universal e-commerce platform built for ambitious store owners, retail brands, and scaling enterprises.
            </p>
            <div className="flex gap-3">
              {socialLinks.map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-[#FFBD2E]/40 hover:bg-[#FFBD2E]/10 transition-all text-xs font-bold"
                >
                  {social.symbol}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link}>
                    <button 
                      onClick={() => handleFooterClick(link)}
                      className="text-sm text-white/40 hover:text-white hover:text-[#FFBD2E] transition-colors text-left"
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} Nexus Commerce, Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/30">
            <button onClick={() => navigate('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => navigate('terms')} className="hover:text-white transition-colors">Terms of Service</button>
            <button onClick={() => navigate('cookies')} className="hover:text-white transition-colors">Cookie Policy</button>
            <button onClick={() => navigate('sitemap')} className="hover:text-white transition-colors">Sitemap</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <button onClick={() => navigate('status-page')} className="flex items-center gap-2 hover:text-white transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" />
              All systems operational
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
