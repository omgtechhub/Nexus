import { useState } from 'react';
import {
  CreditCard, ShieldCheck, Building2, Download, Wallet, AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { usePaymentsQuery } from '../../hooks/usePayments';
import {
  useMerchantBalanceQuery,
  useMyPayoutsQuery,
  usePayoutAccountQuery,
  useSavePayoutAccountMutation,
} from '../../hooks/usePayouts';
import { formatPrice } from '../../marketplace/productHelpers';
import toast from 'react-hot-toast';

/**
 * The providers the platform actually integrates.
 *
 * Kept beside the component rather than fetched: it mirrors
 * `server/src/services/payments/payment.factory.ts`, which is a deployment
 * fact rather than per-seller data. If a third provider is added there, it
 * belongs here too.
 */
const ACTIVE_PROVIDERS = [
  { name: 'Paystack', methods: 'Cards, bank transfer, USSD and mobile money' },
];

export function PaymentsSection() {
  const { data: realPayments = [] } = usePaymentsQuery();

  /**
   * Everything on this screen is now the server's figure.
   *
   * What it replaced, all of it invented in the browser:
   *
   *  - `availableBalanceAmount = realPayments.length > 0 ? computed : 14820.50`
   *    — a store with no payments was shown a **$14,820.50 balance**.
   *  - A hardcoded `2.1% + $0.30` "processing rate" matching no actual rate,
   *    captioned "0% Nexus platform transaction fee".
   *  - A "Chase Business ****4821 — Verified Direct Deposit" settlement
   *    account, for a platform that collected no bank details at all.
   *  - Four fabricated transactions with invented customer names, shown
   *    whenever there was no real data.
   *  - `handleInstantPayout`: a `setTimeout`, then a toast reading
   *    "transferred to your bank". No request was made and no money moved —
   *    the same shape of fake success the payment work removed from checkout.
   */
  const balanceQuery = useMerchantBalanceQuery();
  const payoutsQuery = useMyPayoutsQuery();
  const accountQuery = usePayoutAccountQuery();
  const saveAccount = useSavePayoutAccountMutation();

  const balance = balanceQuery.data;
  const payouts = payoutsQuery.data ?? [];
  const account = accountQuery.data;
  const currency = balance?.currency;

  const money = (amount: number) => formatPrice(amount, currency);

  const [accountForm, setAccountForm] = useState({
    accountName: '',
    bankName: '',
    bankCode: '',
    accountNumber: '',
  });
  const [editingAccount, setEditingAccount] = useState(false);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    saveAccount.mutate(accountForm, {
      onSuccess: () => {
        setEditingAccount(false);
        setAccountForm({ accountName: '', bankName: '', bankCode: '', accountNumber: '' });
      },
    });
  };

  /**
   * Transaction rows, with the real split.
   *
   * The fee shown is the platform commission the server recorded on each
   * payment when it settled — not a client-side guess at a gateway rate. A
   * payment that settled before commission existed has no split recorded and
   * says so rather than showing a fabricated one.
   */
  const transactions = realPayments.map((p) => {
    const fee = p.platformFeeAmount;
    const net = p.merchantNetAmount;

    return {
      id: p.providerReference || p.id.slice(0, 10),
      order: p.order?.orderNumber ? `${p.order.orderNumber}` : `#${p.orderId.slice(0, 5)}`,
      customer: p.order?.customerName || p.order?.customerEmail || '—',
      method: p.provider === 'PAYSTACK' ? 'Paystack' : p.provider === 'FLUTTERWAVE' ? 'Flutterwave' : 'Card',
      amount: formatPrice(p.amount, p.currency),
      fee: typeof fee === 'number' ? formatPrice(fee, p.currency) : '—',
      net: typeof net === 'number' ? formatPrice(net, p.currency) : '—',
      status: p.status === 'SUCCESS' || p.status === 'PAID'
        ? 'Settled'
        : p.status === 'PENDING' ? 'Awaiting payment' : p.status,
      date: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
  });

  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      toast.error('There are no transactions to export yet.');
      return;
    }

    const headers = ['Tx ID', 'Order', 'Customer', 'Payment Method', 'Amount', 'Platform fee', 'Your share', 'Status', 'Date'];
    const rows = transactions.map(t => [
      t.id, t.order, `"${t.customer}"`, `"${t.method}"`, t.amount, t.fee, t.net, t.status, `"${t.date}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `nexus_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payment transaction log exported.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <CreditCard className="text-[var(--brand-green-ink)]" size={22} /> Nexus Payments & Gateways
          </h2>
          <p className="text-xs text-muted">Manage payment processing rates, settlement bank accounts, and active payment methods.</p>
        </div>
        {/*
          No "Request Instant Payout" button.

          There was one, and it was a `setTimeout` followed by a toast saying
          the money had been transferred to the bank. Payouts are released by
          the platform, not self-served, so advertising a button that cannot
          do it is worse than not having one -- the card below says what
          actually happens instead.
        */}
        <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExportTransactions}>
          Export transactions
        </Button>
      </div>

      {/* Balance -- the server's figures, or nothing. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card space-y-1 p-5">
          <span className="block text-xs text-muted">Available to pay out</span>
          <span className="block text-2xl font-extrabold text-[var(--brand-green-ink)]">
            {balanceQuery.isPending ? '—' : money(balance?.available ?? 0)}
          </span>
          <span className="text-[11px] text-muted">
            {balance && balance.pendingPayouts > 0
              ? `${money(balance.pendingPayouts)} already scheduled`
              : 'Released by the Nexus team to your payout account'}
          </span>
        </div>

        <div className="stat-card space-y-1 p-5">
          <span className="block text-xs text-muted">Earned, lifetime</span>
          <span className="block text-2xl font-extrabold text-primary">
            {balanceQuery.isPending ? '—' : money(balance?.grossEarned ?? 0)}
          </span>
          <span className="text-[11px] text-muted">
            {money(balance?.paidOut ?? 0)} paid out
            {balance && balance.refunded > 0 ? ` · ${money(balance.refunded)} refunded` : ''}
          </span>
        </div>

        <div className="stat-card space-y-1 p-5">
          <span className="block text-xs text-muted">Platform commission</span>
          <span className="block text-2xl font-extrabold text-[var(--brand-yellow-ink)]">
            {balanceQuery.isPending ? '—' : `${balance?.commissionRate ?? 0}%`}
          </span>
          <span className="text-[11px] text-muted">
            {(balance?.commissionRate ?? 0) === 0
              ? 'Nexus takes nothing from your sales'
              : `${money(balance?.platformFees ?? 0)} withheld to date`}
          </span>
        </div>
      </div>

      {/* Payout account -- real, or an honest prompt to add one. */}
      <div className="stat-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
              <Building2 size={16} className="text-[var(--brand-red-ink)]" aria-hidden="true" />
              Where your money goes
            </h3>
            <p className="mt-1 text-[11px] text-muted">
              Only the last four digits are stored. Nexus keeps a token from the payment provider
              instead of your account number.
            </p>
          </div>
          {!editingAccount && (
            <Button variant="ghost" size="sm" onClick={() => setEditingAccount(true)}>
              {account ? 'Change account' : 'Add payout account'}
            </Button>
          )}
        </div>

        {!editingAccount && account && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 p-4 text-xs">
            <Wallet size={16} className="text-[var(--brand-green-ink)]" aria-hidden="true" />
            <span className="font-bold text-primary">{account.bankName}</span>
            <span className="font-mono text-body">{'••••'}{account.accountNumberLast4}</span>
            <span className="text-muted">{account.accountName}</span>
            {!account.verifiedAt && (
              <span className="flex items-center gap-1 rounded-full bg-[#FFBD2E]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--brand-yellow-ink)]">
                <AlertTriangle size={10} aria-hidden="true" />
                Not yet verified
              </span>
            )}
          </div>
        )}

        {!editingAccount && !account && !accountQuery.isPending && (
          <p className="rounded-xl border border-[#FFBD2E]/30 bg-[#FFBD2E]/5 p-4 text-xs text-body">
            You have not added a payout account yet. Add one so Nexus knows where to send your
            earnings.
          </p>
        )}

        {editingAccount && (
          <form onSubmit={handleSaveAccount} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Account holder name"
              value={accountForm.accountName}
              onChange={e => setAccountForm({ ...accountForm, accountName: e.target.value })}
              required
            />
            <Input
              label="Bank name"
              value={accountForm.bankName}
              onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })}
              required
            />
            <Input
              label="Bank code"
              value={accountForm.bankCode}
              onChange={e => setAccountForm({ ...accountForm, bankCode: e.target.value })}
              required
            />
            <Input
              label="Account number"
              inputMode="numeric"
              value={accountForm.accountNumber}
              onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              required
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" variant="primary" size="sm" loading={saveAccount.isPending}>
                Save payout account
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingAccount(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Payout history */}
      <div className="stat-card space-y-4 p-6">
        <h3 className="text-sm font-bold text-primary">Your payouts</h3>

        {payouts.length === 0 ? (
          <p className="text-xs text-muted">
            No payouts yet. Once you have earnings available, Nexus releases them to your payout
            account and each one appears here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-strong">
              <thead className="bg-[var(--ink)]/5 text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="rounded-l-lg px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="rounded-r-lg px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ink)]/5">
                {payouts.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--ink)]/5">
                    <td className="px-4 py-3.5 font-mono text-[var(--brand-yellow-ink)]">{p.reference}</td>
                    <td className="px-4 py-3.5 font-bold text-primary">{formatPrice(p.amount, p.currency)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        p.status === 'PAID'
                          ? 'bg-[#27C93F]/10 text-[var(--brand-green-ink)]'
                          : p.status === 'FAILED' || p.status === 'REVERSED'
                            ? 'bg-[#FF5F56]/10 text-[var(--brand-red-ink)]'
                            : 'bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)]'
                      }`}>
                        {p.status}
                      </span>
                      {p.failureReason && (
                        <span className="mt-1 block text-[10px] text-muted">{p.failureReason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {new Date(p.paidAt || p.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/*
        * Which gateways are live — and why this is a statement, not a control.
        *
        * It used to be seven toggles: Shop Pay, Apple Pay, Google Pay, Klarna
        * and crypto alongside Paystack. Two problems with that. The platform
        * settles through Paystack alone, so six of them named nothing. And the toggles wrote to local component state and
        * toasted "preference updated!", so even the two real ones were a
        * control that changed nothing and said it had.
        *
        * On a marketplace it should not be a seller control in the first
        * place: Nexus runs one checkout for every seller, so which providers
        * accept money is a platform decision. Saying so is more use to a
        * seller than a switch they cannot action.
        */}
      <div className="stat-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
            How buyers pay you
          </h3>
          <p className="mt-1 text-[11px] text-muted">
            Nexus runs the checkout for every seller, so there is no gateway for you to register or
            maintain. These are the providers currently settling your orders.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          {ACTIVE_PROVIDERS.map(provider => (
            <li
              key={provider.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 p-4"
            >
              <div className="min-w-0">
                <span className="block font-bold text-primary">{provider.name}</span>
                <span className="block text-[11px] text-muted">{provider.methods}</span>
              </div>
              <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[#27C93F]/10 px-2 py-1 text-[10px] font-bold text-[var(--brand-green-ink)]">
                <ShieldCheck size={11} aria-hidden="true" />
                Live
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Transaction Log Table */}
      <div className="stat-card overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">Recent Payment Transactions</h3>
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExportTransactions}>Export CSV</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-strong">
            <thead className="bg-[var(--ink)]/5 text-muted uppercase tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-[var(--ink)]/5">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-[var(--ink)]/5">
                  <td className="py-3.5 px-4 font-mono text-[var(--brand-yellow-ink)]">{t.id}</td>
                  <td className="py-3.5 px-4 font-bold text-primary">{t.order}</td>
                  <td className="py-3.5 px-4 text-body">{t.customer}</td>
                  <td className="py-3.5 px-4 text-muted">{t.method}</td>
                  <td className="py-3.5 px-4 font-bold text-primary">{t.amount}</td>
                  <td className="py-3.5 px-4 text-muted">{t.fee}</td>
                  <td className="py-3.5 px-4 font-bold text-[var(--brand-green-ink)]">{t.net}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'Settled' ? 'bg-[#27C93F]/10 text-[var(--brand-green-ink)]' : 'bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)]'
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
