import { 
  CheckCircle2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';

export function StatusPage() {

  const systems = [
    { name: 'Storefront Global Edge CDN', status: 'Operational', uptime: '100%', latency: '14ms' },
    { name: 'Nexus Payments & Gateway API', status: 'Operational', uptime: '99.999%', latency: '22ms' },
    { name: 'Retail POS Register Network', status: 'Operational', uptime: '100%', latency: '18ms' },
    { name: 'NexusIQ AI Engine', status: 'Operational', uptime: '99.98%', latency: '1.1s' },
    { name: 'Real-time Webhook Dispatcher', status: 'Operational', uptime: '100%', latency: '35ms' },
    { name: 'Multi-Warehouse Inventory Sync', status: 'Operational', uptime: '100%', latency: '19ms' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden text-center">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#27C93F]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#27C93F]/40 bg-[#27C93F]/10 text-[#27C93F] text-xs font-medium mb-8 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" />
            <span>All Systems Operational</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
            Nexus Infrastructure <br />
            <span className="text-gradient">Real-Time Status.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Live health indicators across global CDN nodes, checkout gateways, POS registers, and webhooks.
          </p>
        </div>
      </section>

      {/* Status Systems List */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          {systems.map((sys, idx) => (
            <div key={idx} className="glass rounded-2xl p-6 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-[#27C93F]" />
                <div>
                  <h4 className="font-bold text-white text-base">{sys.name}</h4>
                  <div className="text-xs text-white/40">Latency: {sys.latency}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#27C93F] bg-[#27C93F]/10 px-3 py-1 rounded-full border border-[#27C93F]/20">
                  {sys.status} ({sys.uptime})
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
