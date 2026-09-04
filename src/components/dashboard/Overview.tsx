import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, BarChart2, ArrowRight, Package } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { mockAnalytics, mockOrders } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const formatCompact = (v: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact' }).format(v);

const stats = [
  {
    label: 'Total Revenue',
    value: formatCurrency(mockAnalytics.revenue),
    change: mockAnalytics.revenueChange,
    icon: <DollarSign size={20} />,
    color: 'emerald',
    description: 'vs last month',
  },
  {
    label: 'Total Orders',
    value: formatCompact(mockAnalytics.orders),
    change: mockAnalytics.ordersChange,
    icon: <ShoppingBag size={20} />,
    color: 'blue',
    description: 'vs last month',
  },
  {
    label: 'Active Customers',
    value: formatCompact(mockAnalytics.customers),
    change: mockAnalytics.customersChange,
    icon: <Users size={20} />,
    color: 'purple',
    description: 'vs last month',
  },
  {
    label: 'Conversion Rate',
    value: `${mockAnalytics.conversionRate}%`,
    change: mockAnalytics.conversionChange,
    icon: <BarChart2 size={20} />,
    color: 'amber',
    description: 'vs last month',
  },
];

const colorConfig: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  emerald: { bg: 'bg-[#FF5F56]/10', text: 'text-[#FF5F56]', border: 'border-[#FF5F56]/30', fill: '#FF5F56' },
  blue: { bg: 'bg-[#FFBD2E]/10', text: 'text-[#FFBD2E]', border: 'border-[#FFBD2E]/30', fill: '#FFBD2E' },
  purple: { bg: 'bg-[#27C93F]/10', text: 'text-[#27C93F]', border: 'border-[#27C93F]/30', fill: '#27C93F' },
  amber: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', fill: '#38bdf8' },
};

const orderStatusConfig: Record<string, { variant: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
  confirmed: { variant: 'info' },
  processing: { variant: 'warning' },
  shipped: { variant: 'success' },
  delivered: { variant: 'success' },
  cancelled: { variant: 'error' },
  pending: { variant: 'default' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass border border-white/10 rounded-xl p-3 shadow-xl">
        <p className="text-xs text-white/50 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Overview() {
  const { navigate } = useApp();

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => {
          const colors = colorConfig[stat.color];
          const isPositive = stat.change > 0;
          return (
            <div key={stat.label} className="stat-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', colors.bg, colors.text, colors.border)}>
                  {stat.icon}
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                  isPositive ? 'text-[#27C93F] bg-[#27C93F]/10' : 'text-[#FF5F56] bg-[#FF5F56]/10'
                )}>
                  {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
              <div className="text-xs text-white/40">{stat.label}</div>
              <div className="text-xs text-white/25 mt-0.5">{stat.description}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 stat-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Revenue Overview</h3>
              <p className="text-xs text-white/30 mt-0.5">Last 14 data points</p>
            </div>
            <select className="text-xs bg-white/5 border border-white/10 text-white/60 rounded-lg px-2 py-1 outline-none">
              <option>Last 30 days</option>
              <option>Last 60 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockAnalytics.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFBD2E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF5F56" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#FFBD2E" strokeWidth={2.5} fill="url(#revenueGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="stat-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Top Products</h3>
            <button
              onClick={() => navigate('dashboard', 'products')}
              className="text-xs text-[#FFBD2E] hover:text-[#27C93F] flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-3">
            {mockAnalytics.topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/40 font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{product.title}</p>
                  <p className="text-[10px] text-white/30">{product.units} units sold</p>
                </div>
                <div className="text-xs font-semibold text-[#27C93F]">{formatCurrency(product.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="stat-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
            <button
              onClick={() => navigate('dashboard', 'orders')}
              className="text-xs text-[#FFBD2E] hover:text-[#27C93F] flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {mockOrders.slice(0, 4).map(order => (
              <div key={order.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{order.orderNumber}</span>
                    <span className="text-xs font-semibold text-white">{formatCurrency(order.total)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-white/40">{order.customer.name}</span>
                    <Badge variant={orderStatusConfig[order.status]?.variant || 'default'} size="sm">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="stat-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {mockAnalytics.recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm flex-shrink-0">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 leading-relaxed">{activity.message}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visitors chart */}
      <div className="stat-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Store Visitors</h3>
            <p className="text-xs text-white/30">Unique visitors over time</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={mockAnalytics.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="visitors" fill="#27C93F" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
