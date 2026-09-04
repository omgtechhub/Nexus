import { useState } from 'react';
import {
  Shield, Users, Database, Activity, AlertCircle,
  CheckCircle, Server, Lock, FileText,
  ArrowLeft, TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

const adminTabs = [
  { id: 'overview', label: 'System Overview', icon: <Activity size={16} /> },
  { id: 'users', label: 'User Management', icon: <Users size={16} /> },
  { id: 'database', label: 'Database', icon: <Database size={16} /> },
  { id: 'security', label: 'Security Logs', icon: <Lock size={16} /> },
  { id: 'api', label: 'API Monitor', icon: <Server size={16} /> },
];

const systemHealth = [
  { label: 'API Gateway', status: 'operational', latency: '12ms' },
  { label: 'Database Cluster', status: 'operational', latency: '4ms' },
  { label: 'CDN Network', status: 'operational', latency: '8ms' },
  { label: 'Payment Processor', status: 'operational', latency: '45ms' },
  { label: 'Email Service', status: 'degraded', latency: '320ms' },
  { label: 'Search Index', status: 'operational', latency: '15ms' },
];

const mockUsers = [
  { id: 'u1', name: 'Sarah Mitchell', email: 'sarah@nexus.io', role: 'owner', plan: 'pro', status: 'active', joined: '2023-06-15', stores: 1 },
  { id: 'u2', name: 'James Watanabe', email: 'james@pacific.com', role: 'admin', plan: 'growth', status: 'active', joined: '2023-08-20', stores: 2 },
  { id: 'u3', name: 'Isabella Torres', email: 'isa@bloom.io', role: 'owner', plan: 'enterprise', status: 'active', joined: '2023-04-10', stores: 5 },
  { id: 'u4', name: 'Carlos Rivera', email: 'carlos@river.co', role: 'owner', plan: 'starter', status: 'active', joined: '2024-01-05', stores: 1 },
  { id: 'u5', name: 'Priya Sharma', email: 'priya@shop.in', role: 'staff', plan: 'growth', status: 'inactive', joined: '2023-11-15', stores: 0 },
];

const apiRequests = [
  { endpoint: 'GET /api/v1/orders', calls: 14820, errors: 12, p99: '45ms' },
  { endpoint: 'POST /api/v1/orders', calls: 3241, errors: 2, p99: '120ms' },
  { endpoint: 'GET /api/v1/products', calls: 28930, errors: 0, p99: '22ms' },
  { endpoint: 'PUT /api/v1/products/:id', calls: 891, errors: 5, p99: '89ms' },
  { endpoint: 'GET /api/v1/customers', calls: 7820, errors: 1, p99: '33ms' },
  { endpoint: 'POST /api/v1/auth/login', calls: 4521, errors: 89, p99: '200ms' },
];

const securityLogs = [
  { time: '2 min ago', event: 'Failed login attempt', source: '192.168.1.100', severity: 'warning' },
  { time: '15 min ago', event: 'API key generated', source: 'admin@nexus.io', severity: 'info' },
  { time: '1 hr ago', event: 'Password changed', source: 'sarah@nexus.io', severity: 'info' },
  { time: '3 hrs ago', event: 'Suspicious activity blocked', source: '203.45.12.88', severity: 'error' },
  { time: '5 hrs ago', event: 'New admin role assigned', source: 'system', severity: 'warning' },
  { time: '1 day ago', event: 'Database backup completed', source: 'system', severity: 'success' },
];

export function AdminPanel() {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-[#0B0D1B]">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-[#FF5F56]/20 via-[#131629] to-[#0B0D1B] border-b border-[#FF5F56]/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('dashboard', 'overview')}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mr-4"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
            <div className="w-8 h-8 rounded-xl bg-[#FF5F56]/20 border border-[#FF5F56]/30 flex items-center justify-center">
              <Shield size={16} className="text-[#FF5F56]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Admin Control Panel</h1>
              <p className="text-xs text-white/30">Nexus Commerce — Internal Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="error" size="sm" dot>Admin Access</Badge>
            <div className="flex items-center gap-1.5 text-xs text-[#27C93F] bg-[#27C93F]/10 border border-[#27C93F]/20 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-[#27C93F] rounded-full animate-pulse" />
              All systems live
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-white font-semibold shadow-md'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Merchants', value: '2,184,329', icon: <Users size={20} />, color: 'blue', change: '+4.2%' },
                { label: 'Monthly Revenue', value: '$24.8M', icon: <TrendingUp size={20} />, color: 'emerald', change: '+18.5%' },
                { label: 'Active Stores', value: '1,928,441', icon: <Server size={20} />, color: 'purple', change: '+3.1%' },
                { label: 'Open Tickets', value: '284', icon: <AlertCircle size={20} />, color: 'amber', change: '-12%' },
              ].map(stat => (
                <div key={stat.label} className="stat-card p-4">
                  <div className="text-white/40 text-xs mb-3">{stat.label}</div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-[#27C93F] font-medium">{stat.change} this month</div>
                </div>
              ))}
            </div>

            {/* System health */}
            <div className="stat-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">System Health</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {systemHealth.map(service => (
                  <div key={service.label} className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                    <div className="flex items-center gap-2.5">
                      {service.status === 'operational'
                        ? <CheckCircle size={14} className="text-[#27C93F]" />
                        : <AlertCircle size={14} className="text-[#FFBD2E]" />
                      }
                      <span className="text-sm text-white/70">{service.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30">{service.latency}</span>
                      <Badge variant={service.status === 'operational' ? 'success' : 'warning'} size="sm">
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="stat-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Broadcast Message', icon: <FileText size={16} />, color: 'blue' },
                  { label: 'Run DB Backup', icon: <Database size={16} />, color: 'emerald' },
                  { label: 'Clear Cache', icon: <Server size={16} />, color: 'purple' },
                  { label: 'Security Audit', icon: <Shield size={16} />, color: 'red' },
                ].map(action => (
                  <button key={action.label} className="p-4 glass rounded-xl border border-white/5 hover:border-white/20 transition-all text-center group">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-2 text-white/40 group-hover:text-white transition-colors">
                      {action.icon}
                    </div>
                    <span className="text-xs text-white/50 group-hover:text-white transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* User Management */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-white/40 text-sm">{mockUsers.length} users shown</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Export CSV</Button>
                <Button variant="primary" size="sm" icon={<Users size={14} />}>Add user</Button>
              </div>
            </div>
            <div className="stat-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['User', 'Role', 'Plan', 'Status', 'Stores', 'Joined', 'Actions'].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockUsers.map(user => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-xs font-bold shadow-md">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{user.name}</p>
                              <p className="text-xs text-white/30">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={user.role === 'owner' ? 'purple' : user.role === 'admin' ? 'warning' : 'default'} size="sm">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={user.plan === 'enterprise' ? 'success' : user.plan === 'pro' ? 'info' : 'ghost'} size="sm">
                            {user.plan}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={user.status === 'active' ? 'success' : 'default'} size="sm" dot>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-white/60">{user.stores}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs text-white/40">{user.joined}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <button className="px-2 py-1 text-xs text-[#FFBD2E] hover:bg-[#FFBD2E]/10 rounded-lg transition-colors font-medium">Edit</button>
                            <button className="px-2 py-1 text-xs text-[#FF5F56] hover:bg-[#FF5F56]/10 rounded-lg transition-colors font-medium">Suspend</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Database */}
        {activeTab === 'database' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Records', value: '284.2M', desc: 'Across all tables' },
                { label: 'DB Size', value: '1.84 TB', desc: 'Including replicas' },
                { label: 'Query Time (p95)', value: '8ms', desc: 'Last 24 hours' },
              ].map(metric => (
                <div key={metric.label} className="stat-card p-4">
                  <p className="text-xs text-white/40 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                  <p className="text-xs text-white/30 mt-1">{metric.desc}</p>
                </div>
              ))}
            </div>

            <div className="stat-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Database Tables</h3>
                <Button variant="ghost" size="sm" icon={<Database size={14} />}>Run backup now</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Table', 'Rows', 'Size', 'Last Updated', 'Status'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { table: 'users', rows: '2.18M', size: '4.2 GB', updated: '2 min ago', status: 'healthy' },
                      { table: 'orders', rows: '48.4M', size: '128 GB', updated: '30 sec ago', status: 'healthy' },
                      { table: 'products', rows: '184M', size: '890 GB', updated: '1 min ago', status: 'healthy' },
                      { table: 'sessions', rows: '9.2M', size: '2.4 GB', updated: '5 sec ago', status: 'healthy' },
                      { table: 'analytics_events', rows: '4.8B', size: '784 GB', updated: '1 min ago', status: 'optimizing' },
                    ].map(row => (
                      <tr key={row.table} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-3"><span className="text-sm font-mono text-[#FFBD2E]">{row.table}</span></td>
                        <td className="p-3"><span className="text-sm text-white/60">{row.rows}</span></td>
                        <td className="p-3"><span className="text-sm text-white/60">{row.size}</span></td>
                        <td className="p-3"><span className="text-xs text-white/40">{row.updated}</span></td>
                        <td className="p-3">
                          <Badge variant={row.status === 'healthy' ? 'success' : 'warning'} size="sm" dot>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Security Logs */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <div className="stat-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Security Event Log</h3>
                <Button variant="ghost" size="sm">Export logs</Button>
              </div>
              <div className="space-y-2">
                {securityLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl border border-white/5">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
                      log.severity === 'error' ? 'bg-[#FF5F56]' :
                      log.severity === 'warning' ? 'bg-[#FFBD2E]' :
                      log.severity === 'success' ? 'bg-[#27C93F]' : 'bg-cyan-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white font-medium">{log.event}</span>
                        <span className="text-xs text-white/30 flex-shrink-0">{log.time}</span>
                      </div>
                      <span className="text-xs text-white/40 font-mono">{log.source}</span>
                    </div>
                    <Badge variant={
                      log.severity === 'error' ? 'error' :
                      log.severity === 'warning' ? 'warning' :
                      log.severity === 'success' ? 'success' : 'info'
                    } size="sm">
                      {log.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Monitor */}
        {activeTab === 'api' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Requests (24h)', value: '4.2M' },
                { label: 'Error Rate', value: '0.09%' },
                { label: 'Avg Latency', value: '28ms' },
                { label: 'Active API Keys', value: '18,402' },
              ].map(metric => (
                <div key={metric.label} className="stat-card p-4">
                  <p className="text-xs text-white/40 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="stat-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">API Endpoint Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Endpoint', 'Calls (24h)', 'Errors', 'P99 Latency'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiRequests.map((req, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-3"><span className="text-xs font-mono text-white/70">{req.endpoint}</span></td>
                        <td className="p-3"><span className="text-sm text-white/60">{req.calls.toLocaleString()}</span></td>
                        <td className="p-3">
                          <span className={cn('text-sm', req.errors > 10 ? 'text-[#FF5F56]' : req.errors > 0 ? 'text-[#FFBD2E]' : 'text-[#27C93F]')}>
                            {req.errors}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={cn('text-sm', parseInt(req.p99) > 100 ? 'text-[#FFBD2E]' : 'text-white/60')}>{req.p99}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
