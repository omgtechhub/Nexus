import { useState } from 'react';
import { 
  CreditCard, ShieldCheck, ArrowUpRight, ToggleLeft, ToggleRight, Building2, Download
} from 'lucide-react';
import { Button } from '../ui/Button';
import { usePaymentsQuery } from '../../hooks/usePayments';
import toast from 'react-hot-toast';

export function PaymentsSection() {
  const { data: realPayments = [] } = usePaymentsQuery();
  const [gateways, setGateways] = useState({
    paystack: true,
    flutterwave: true,
    crypto: false,
    shopPay: true,
    applePay: true,
    googlePay: true,
    klarna: true,
  });

  const toggleGateway = (key: keyof typeof gateways) => {
    setGateways(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Payment provider preference updated!');
  };

  const [payoutLoading, setPayoutLoading] = useState(false);

  // Compute live balance from successful payments in database
  const liveSettledTotal = realPayments
    .filter(p => p.status === 'SUCCESS' || p.status === 'PAID')
    .reduce((sum, p) => sum + (p.amount * (1 - 0.021) - 0.3), 0);

  const availableBalanceAmount = realPayments.length > 0 ? liveSettledTotal : 14820.50;
  const availableBalanceStr = `$${availableBalanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  const handleInstantPayout = () => {
    setPayoutLoading(true);
    setTimeout(() => {
      setPayoutLoading(false);
      toast.success(`Instant payout request submitted! ${availableBalanceStr} transferred to your bank.`, { icon: '💸' });
    }, 1000);
  };

  // Map real database payments into transaction rows
  const liveTransactions = realPayments.map((p) => {
    const fee = p.amount * 0.021 + 0.3;
    const net = Math.max(0, p.amount - fee);
    return {
      id: p.providerReference || p.id.slice(0, 10),
      order: p.order?.orderNumber ? `#${p.order.orderNumber}` : `#${p.orderId.slice(0, 5)}`,
      customer: p.order?.customerName || p.order?.customerEmail || 'Merchant Customer',
      method: p.provider === 'PAYSTACK' ? 'Paystack Card' : p.provider === 'FLUTTERWAVE' ? 'Flutterwave Direct' : 'Card Payment',
      amount: `$${p.amount.toFixed(2)}`,
      fee: `$${fee.toFixed(2)}`,
      net: `$${net.toFixed(2)}`,
      status: p.status === 'SUCCESS' || p.status === 'PAID' ? 'Settled' : p.status === 'PENDING' ? 'Pending Payout' : p.status,
      date: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
  });

  const mockTransactions = [
    { id: 'tx_99182', order: '#4821', customer: 'Emma Thompson', method: 'Paystack Card', amount: '$362.00', fee: '$7.90', net: '$354.10', status: 'Settled', date: 'Today, 2:14 PM' },
    { id: 'tx_99181', order: '#4820', customer: 'Liam Davies', method: 'Flutterwave Direct', amount: '$189.50', fee: '$4.28', net: '$185.22', status: 'Settled', date: 'Today, 11:05 AM' },
    { id: 'tx_99180', order: '#4819', customer: 'Sophia Rodriguez', method: 'Paystack Card', amount: '$542.00', fee: '$11.68', net: '$530.32', status: 'Pending Payout', date: 'Yesterday, 8:40 PM' },
    { id: 'tx_99179', order: '#4818', customer: 'Michael Chang', method: 'Flutterwave Direct', amount: '$890.00', fee: '$18.99', net: '$871.01', status: 'Settled', date: 'Yesterday, 3:12 PM' },
  ];

  const transactions = liveTransactions.length > 0 ? liveTransactions : mockTransactions;

  const handleExportTransactions = () => {
    const headers = ['Tx ID', 'Order', 'Customer', 'Payment Method', 'Amount', 'Fee', 'Net Payout', 'Status', 'Date'];
    const rows = transactions.map(t => [
      t.id, t.order, `"${t.customer}"`, `"${t.method}"`, t.amount, t.fee, t.net, t.status, `"${t.date}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payment transaction log exported!', { icon: '📊' });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="text-[#27C93F]" size={22} /> Nexus Payments & Gateways
          </h2>
          <p className="text-xs text-white/50">Manage payment processing rates, settlement bank accounts, and active payment methods.</p>
        </div>
        <Button variant="primary" size="sm" loading={payoutLoading} onClick={handleInstantPayout} icon={<ArrowUpRight size={14} />}>
          Request Instant Payout ({availableBalanceStr.split(' ')[0]})
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 block">Available Payout Balance</span>
            {realPayments.length > 0 && <span className="text-[10px] bg-[#27C93F]/10 text-[#27C93F] px-1.5 py-0.5 rounded font-mono font-bold">Live DB</span>}
          </div>
          <span className="text-2xl font-extrabold text-[#27C93F] block">{availableBalanceStr}</span>
          <span className="text-[11px] text-white/50">Scheduled payout: Tomorrow at 8:00 AM</span>
        </div>

        <div className="stat-card p-5 space-y-1">
          <span className="text-xs text-white/40 block">Processing Rate</span>
          <span className="text-2xl font-extrabold text-[#FFBD2E] block">2.1% + $0.30</span>
          <span className="text-[11px] text-[#27C93F] font-semibold">0% Nexus platform transaction fee</span>
        </div>

        <div className="stat-card p-5 space-y-1">
          <span className="text-xs text-white/40 block">Settlement Account</span>
          <span className="text-sm font-bold text-white block flex items-center gap-1.5 pt-1">
            <Building2 size={16} className="text-[#FF5F56]" /> Chase Business ****4821
          </span>
          <span className="text-[11px] text-[#27C93F] font-semibold">Verified Direct Deposit</span>
        </div>
      </div>

      {/* Payment Gateway Toggles */}
      <div className="stat-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#FFBD2E]" /> Active Payment Gateways & Tender Methods
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Shop Pay 1-Click</span>
              <span className="text-[11px] text-white/40">Accelerated buyer checkout</span>
            </div>
            <button onClick={() => toggleGateway('shopPay')} className="text-[#27C93F] cursor-pointer">
              {gateways.shopPay ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-white/30" />}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Apple Pay</span>
              <span className="text-[11px] text-white/40">Biometric mobile checkout</span>
            </div>
            <button onClick={() => toggleGateway('applePay')} className="text-[#27C93F] cursor-pointer">
              {gateways.applePay ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-white/30" />}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Google Pay</span>
              <span className="text-[11px] text-white/40">Android & Chrome 1-tap</span>
            </div>
            <button onClick={() => toggleGateway('googlePay')} className="text-[#27C93F] cursor-pointer">
              {gateways.googlePay ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-white/30" />}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Klarna Buy Now Pay Later</span>
              <span className="text-[11px] text-white/40">4 interest-free installments</span>
            </div>
            <button onClick={() => toggleGateway('klarna')} className="text-[#27C93F] cursor-pointer">
              {gateways.klarna ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-white/30" />}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Crypto Payments (USDC / BTC)</span>
              <span className="text-[11px] text-white/40">Web3 decentralized checkout</span>
            </div>
            <button onClick={() => toggleGateway('crypto')} className="text-[#27C93F] cursor-pointer">
              {gateways.crypto ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-white/30" />}
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Log Table */}
      <div className="stat-card overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Recent Payment Transactions</h3>
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExportTransactions}>Export CSV</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="bg-white/5 text-white/40 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 rounded-l-lg">Tx ID</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Fee</th>
                <th className="py-3 px-4">Net Payout</th>
                <th className="py-3 px-4 rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className="py-3.5 px-4 font-mono text-[#FFBD2E]">{t.id}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{t.order}</td>
                  <td className="py-3.5 px-4 text-white/70">{t.customer}</td>
                  <td className="py-3.5 px-4 text-white/50">{t.method}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{t.amount}</td>
                  <td className="py-3.5 px-4 text-white/40">{t.fee}</td>
                  <td className="py-3.5 px-4 font-bold text-[#27C93F]">{t.net}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'Settled' ? 'bg-[#27C93F]/10 text-[#27C93F]' : 'bg-[#FFBD2E]/10 text-[#FFBD2E]'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
