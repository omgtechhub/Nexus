# Merchant payouts

## What exists

| Piece | Where |
|---|---|
| Commission rate | `commission.ts` — `PLATFORM_COMMISSION_PERCENT`, **defaults to 0** |
| Split, captured per payment | `Payment.platformFeeAmount` / `merchantNetAmount` / `commissionRate` |
| Derived balance | `payout.service.ts` → `merchantBalance(storeId)` |
| Payout records | `Payout` model, `MerchantPayoutAccount` model |
| Merchant API | `GET /api/payouts/balance`, `GET /api/payouts`, `GET/PUT /api/payouts/account` |
| Admin API | `GET /api/admin/payouts/payable`, `GET /api/admin/payouts`, `POST /api/admin/payouts`, `PATCH /api/admin/payouts/:id` |

## The two design decisions worth knowing

**The balance is derived, never stored.** It is computed from the money events
already recorded — settled payments (merchant net), successful refunds, and
payouts in a non-failed state. A stored running total is a second source of
truth that drifts from the transactions the moment anything goes wrong, and
reconciling it afterwards is guesswork.

**The commission is fixed at settlement, not recomputed.** `splitPayment` runs
once per payment, when it settles, and the rate used is written onto the
payment row. Changing `PLATFORM_COMMISSION_PERCENT` therefore affects new sales
only; money already taken is never re-valued.

## What is NOT built: executing the transfer

`POST /api/admin/payouts` records an **obligation**, not a transfer. Nothing in
this codebase moves money to a merchant. A payout is created `PENDING` and an
admin marks it `PAID` once they have paid by their own means
(`method: MANUAL`, the default).

Automating it through Paystack Transfers needs four things this repo does not
have, each of them a deployment or commercial decision rather than missing code:

1. **A funded transfer balance** on the platform's Paystack account, and
   transfers enabled on it (Paystack gates this per business).
2. **Verified merchant bank details.** `PUT /api/payouts/account` takes them
   and stores only the last four digits plus a provider recipient token — the
   full number is never persisted. Registering the recipient
   (`POST /transferrecipient`) and resolving the account name
   (`GET /bank/resolve`) both need a live secret key, so `verifiedAt` stays
   null until that is wired up.
3. **A decision on the commission rate**, which is currently 0 — so merchants
   are owed 100% of every sale and the platform's only revenue is
   subscriptions.
4. **A payout schedule** — on request, weekly, on a threshold — and who may
   trigger it.

### Wiring the provider in

The seam is `PayoutMethod.PROVIDER_TRANSFER` plus `Payout.providerReference`.
An implementation would:

1. Register the recipient when the merchant saves their account, storing the
   returned code in `MerchantPayoutAccount.providerRecipientId` and setting
   `verifiedAt`.
2. On payout creation with `method: PROVIDER_TRANSFER`, call
   `POST /transfer`, store the transfer code in `providerReference`, and move
   the payout to `PROCESSING`.
3. Handle `transfer.success` / `transfer.failed` / `transfer.reversed` in
   `webhooks.controller.ts` by calling `updatePayoutStatus`. Those events
   already reach the webhook endpoint and are currently recorded as
   `unhandled_event` — which is why the registry marks them processed rather
   than leaving them to accumulate.

`ALLOWED_TRANSITIONS` in `payout.service.ts` already models the states those
webhooks produce, including `PAID → REVERSED`.

## Operational note

`backfillMissingCommissions()` runs at startup. Every payment that settled
before this subsystem existed has a null `merchantNetAmount`, which would read
as a zero balance; the backfill applies the *current* rate to them, because
there is no record of what was agreed at the time. That is precisely why the
rate is captured per payment from now on.
