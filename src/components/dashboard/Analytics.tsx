import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { mockAnalytics } from '../../data/mockData';
import { TrendingUp, TrendingDown } from 'lucide-react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const COLORS = ['#FF5F56', '#FFBD2E', '#27C93F', '#38BDF8', '#C084FC'];

const trafficData = [
  { name: 'Organic Search', value: 42, color: '#27C93F' },
  { name: 'Social Media', value: 24, color: '#FFBD2E' },
  { name: 'Direct', value: 18, color: '#FF5F56' },
  { name: 'Email', value: 10, color: '#38BDF8' },
  { name: 'Paid Ads', value: 6, color: '#C084FC' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass border border-white/10 rounded-xl p-3 shadow-xl">
        <p className="text-xs text-white/50 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const kpis = [
  { label: 'Avg. Order Value', value: '$45.12', change: 8.3, positive: true },
  { label: 'Return Rate', value: '2.1%', change: -0.4, positive: true },
  { label: 'Cart Abandonment', value: '68.5%', change: -3.2, positive: true },
  { label: 'Customer LTV', value: '$284', change: 15.7, positive: true },
];

export function Analytics() {
  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="stat-card p-4">
            <p className="text-xs text-white/40 mb-2">{kpi.label}</p>
            <div className="text-2xl font-bold text-white mb-1">{kpi.value}</div>
            <div className={`flex items-center gap-1 text-xs font-medium ${kpi.positive ? 'text-[#27C93F]' : 'text-[#FF5F56]'}`}>
              {kpi.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(kpi.change)}% this month
            </div>
          </div>
        ))}
      </div>

      {/* Main revenue & orders chart */}
      <div className="stat-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Revenue & Orders</h3>
            <p className="text-xs text-white/30">Combined performance over 14 periods</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-white/50"><span className="w-3 h-0.5 bg-[#FFBD2E] rounded-full inline-block" />Revenue</span>
            <span className="flex items-center gap-1.5 text-white/50"><span className="w-3 h-0.5 bg-[#FF5F56] rounded-full inline-block" />Orders</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={mockAnalytics.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFBD2E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FFBD2E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#FFBD2E" strokeWidth={2.5} dot={false} name="revenue" />
            <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#FF5F56" strokeWidth={2} dot={false} strokeDasharray="4 4" name="orders" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Traffic sources */}
        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold text-white mb-5">Traffic Sources</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={trafficData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {trafficData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {trafficData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-white/60">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top products */}
        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold text-white mb-5">Revenue by Product</h3>
          <div className="space-y-3">
            {mockAnalytics.topProducts.map((product, i) => {
              const maxRevenue = mockAnalytics.topProducts[0].revenue;
              const pct = (product.revenue / maxRevenue) * 100;
              return (
                <div key={product.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/70 truncate max-w-[160px]">{product.title}</span>
                    <span className="text-white font-semibold">{formatCurrency(product.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: COLORS[i % COLORS.length],
                        transition: 'width 1s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visitors area chart */}
      <div className="stat-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Store Visitors</h3>
            <p className="text-xs text-white/30">Unique visitor sessions</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={mockAnalytics.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#27C93F" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#27C93F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="visitors" stroke="#27C93F" strokeWidth={2.5} fill="url(#visitorsGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
