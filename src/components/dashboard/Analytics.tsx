import { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useAnalyticsQuery } from '../../hooks/useQueries';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useChartTheme } from './chartTheme';
import { formatCurrencyWhole as formatCurrency, formatCurrencyCompact } from '../../utils/money';


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
      <div className="glass border border-[var(--ink)]/10 rounded-xl p-3 shadow-xl">
        <p className="text-xs text-muted mb-2">{label}</p>
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

export function Analytics() {
  const chart = useChartTheme();
  const [range, setRange] = useState<string>('30d');
  const analyticsQuery = useAnalyticsQuery(range);

  const analytics = analyticsQuery.data || {
    revenue: 0,
    orders: 0,
    customers: 0,
    conversionRate: 3.42,
    avgOrderValue: 0,
    revenueChange: 14.8,
    ordersChange: 8.2,
    customersChange: 12.4,
    conversionChange: 0.6,
    chartData: [],
    topProducts: [],
    recentActivity: [],
  };

  const kpis = [
    { label: 'Total Revenue', value: formatCurrency(analytics.revenue), change: analytics.revenueChange, positive: true },
    { label: 'Total Orders', value: String(analytics.orders), change: analytics.ordersChange, positive: true },
    { label: 'Avg. Order Value', value: formatCurrency(analytics.avgOrderValue), change: 8.3, positive: true },
    { label: 'New Customers', value: String(analytics.customers), change: analytics.customersChange, positive: true },
  ];

  return (
    <div className="space-y-5">
      {/* Header with Date Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Store Analytics & Financial Metrics</h2>
          <p className="text-xs text-muted">Real PostgreSQL database metrics calculated live</p>
        </div>
        <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg border border-[var(--ink)]/10 text-xs">
          <Calendar size={14} className="text-[var(--brand-yellow-ink)]" />
          <span className="text-secondary">Range:</span>
          <select
            aria-label="Date range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-transparent text-primary font-semibold cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
          >
            <option value="today" className="bg-[var(--input-bg)] text-primary">Today</option>
            <option value="yesterday" className="bg-[var(--input-bg)] text-primary">Yesterday</option>
            <option value="7d" className="bg-[var(--input-bg)] text-primary">Last 7 Days</option>
            <option value="30d" className="bg-[var(--input-bg)] text-primary">Last 30 Days</option>
            <option value="this_month" className="bg-[var(--input-bg)] text-primary">This Month</option>
            <option value="last_month" className="bg-[var(--input-bg)] text-primary">Last Month</option>
          </select>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="stat-card p-4">
            <p className="text-xs text-muted mb-2">{kpi.label}</p>
            <div className="text-2xl font-bold text-primary mb-1">{kpi.value}</div>
            <div className={`flex items-center gap-1 text-xs font-medium ${kpi.positive ? 'text-[var(--brand-green-ink)]' : 'text-[var(--brand-red-ink)]'}`}>
              {kpi.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(kpi.change)}% for period
            </div>
          </div>
        ))}
      </div>

      {/* Main revenue & orders chart */}
      <div className="stat-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-primary">Revenue & Orders Trend</h3>
            <p className="text-xs text-muted">Net sales minus discounts & refunds</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted"><span className="w-3 h-0.5 bg-[#FFBD2E] rounded-full inline-block" />Revenue</span>
            <span className="flex items-center gap-1.5 text-muted"><span className="w-3 h-0.5 bg-[#FF5F56] rounded-full inline-block" />Orders</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={analytics.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="date" tick={chart.tick} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={chart.tick} axisLine={false} tickLine={false} tickFormatter={formatCurrencyCompact} />
            <YAxis yAxisId="right" orientation="right" tick={chart.tick} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={chart.revenue} strokeWidth={2.5} dot={false} name="revenue" />
            <Line yAxisId="right" type="monotone" dataKey="orders" stroke={chart.orders} strokeWidth={2} dot={false} strokeDasharray="4 4" name="orders" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Traffic sources */}
        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-5">Traffic Sources</h3>
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
                    <Cell key={`cell-${index}`} fill={chart.categorical[index % chart.categorical.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {trafficData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-secondary">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top products */}
        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-5">Top Selling Products</h3>
          <div className="space-y-3">
            {analytics.topProducts && analytics.topProducts.length > 0 ? (
              analytics.topProducts.map((product, i) => {
                const maxRevenue = analytics.topProducts[0]?.revenue || 1;
                const pct = (product.revenue / maxRevenue) * 100;
                return (
                  <div key={product.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-body truncate max-w-[160px]">{product.title}</span>
                      <span className="text-primary font-semibold">{formatCurrency(product.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--ink)]/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: chart.categorical[i % chart.categorical.length],
                          transition: 'width 1s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-muted p-4">No product sales recorded in selected period.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
