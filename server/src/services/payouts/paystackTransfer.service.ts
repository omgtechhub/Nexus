import { isUsableSecretKey } from '../payments/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Paystack Transfers: actually sending a merchant their money.
 *
 * Payouts were recorded only — a row saying what was owed, which a human then
 * settled by their own means and marked PAID by hand. This executes them.
 *
 * Three Paystack calls are involved, and they are separate on purpose:
 *
 *  1. `GET /bank/resolve` — confirms an account number really belongs to the
 *     name the merchant typed. Done when they save their details, so a
 *     transposed digit is caught then rather than discovered when money goes
 *     to a stranger.
 *  2. `POST /transferrecipient` — registers the destination and returns a
 *     recipient code. That code is what later transfers reference, which is
 *     why the full account number is never stored.
 *  3. `POST /transfer` — moves the money, against the recipient code.
 *
 * **A transfer is asynchronous.** Paystack answers `status: "otp"`,
 * `"pending"` or `"success"` and then sends `transfer.success`,
 * `transfer.failed` or `transfer.reversed` to the webhook later. Nothing here
 * treats the initial response as final; `webhooks.controller.ts` is what moves
 * a payout to PAID, exactly as a charge is only settled by its webhook.
 */

export class TransferError extends Error {
  constructor(message: string, readonly code: string = 'TRANSFER_FAILED') {
    super(message);
    this.name = 'TransferError';
  }
}

function secretKey(): string {
  return (process.env.PAYSTACK_SECRET_KEY || '').trim();
}

/** Whether transfers can be attempted at all. */
export function transfersConfigured(): boolean {
  return isUsableSecretKey(secretKey());
}

async function paystack(path: string, init?: RequestInit): Promise<any> {
  if (!transfersConfigured()) {
    throw new TransferError(
      'Paystack is not configured, so transfers cannot be made.',
      'NOT_CONFIGURED'
    );
  }

  let response: Response;
  try {
    response = await fetch(`https://api.paystack.co${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string>),
      },
    });
  } catch (err) {
    // Not knowing whether a transfer started is not the same as it having
    // failed, and must never be reported as either.
    throw new TransferError(
      `Could not reach Paystack: ${(err as Error).message}`,
      'GATEWAY_UNREACHABLE'
    );
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    throw new TransferError(`Paystack returned HTTP ${response.status} with an unreadable body`);
  }

  if (!response.ok || data?.status !== true) {
    throw new TransferError(data?.message || `Paystack returned HTTP ${response.status}`);
  }

  return data.data;
}

export interface ResolvedAccount {
  accountNumber: string;
  accountName: string;
}

/**
 * Confirm an account number resolves, and to whom.
 *
 * The returned name is Paystack's, from the bank — not what the merchant
 * typed. Storing theirs over it would defeat the point of asking.
 */
export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<ResolvedAccount> {
  const data = await paystack(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  );

  return {
    accountNumber: String(data.account_number),
    accountName: String(data.account_name),
  };
}

/** Register a destination, returning the token later transfers reference. */
export async function createTransferRecipient(params: {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  currency: string;
}): Promise<string> {
  const data = await paystack('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      // `nuban` is Paystack's type for a Nigerian bank account; it is also
      // what they use for the other African markets they settle in.
      type: 'nuban',
      name: params.accountName,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency,
    }),
  });

  if (!data?.recipient_code) {
    throw new TransferError('Paystack did not return a recipient code');
  }

  return String(data.recipient_code);
}

export interface TransferInitiation {
  /** Paystack's transfer code, stored on the payout for the webhook to match. */
  transferCode: string;
  /** What Paystack said right now — never treated as final. */
  status: string;
  /** True when Paystack requires an OTP to release the transfer. */
  requiresOtp: boolean;
}

/**
 * Start a transfer.
 *
 * `reference` is our own payout reference, so the webhook can be matched back
 * to the row even if the transfer code is lost.
 */
export async function initiateTransfer(params: {
  recipientCode: string;
  amount: number;
  currency: string;
  reference: string;
  reason?: string;
}): Promise<TransferInitiation> {
  const data = await paystack('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      // Paystack takes the minor unit, the same as a charge.
      amount: Math.round(params.amount * 100),
      recipient: params.recipientCode,
      reason: params.reason || 'Nexus merchant payout',
      reference: params.reference,
      currency: params.currency,
    }),
  });

  const status = String(data?.status || '').toLowerCase();

  if (!data?.transfer_code) {
    throw new TransferError('Paystack did not return a transfer code');
  }

  if (status === 'otp') {
    /**
     * The business has OTP confirmation switched on for transfers.
     *
     * The money has not moved and will not until somebody enters a code sent
     * to the account owner. There is no sensible way to automate that, and
     * pretending the payout is in flight would be a lie — so it is surfaced
     * and the operator is told to disable OTP on the Paystack dashboard if
     * they want automated payouts.
     */
    logger.warn({
      msg: 'Paystack transfer requires an OTP; it will not complete on its own',
      reference: params.reference,
      transferCode: data.transfer_code,
    });
  }

  return {
    transferCode: String(data.transfer_code),
    status,
    requiresOtp: status === 'otp',
  };
}
