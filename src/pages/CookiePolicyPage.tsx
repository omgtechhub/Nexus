import {
  Cookie, ShieldCheck, Server, Info, HardDrive, CheckCircle2, Trash2,
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { CONTACT } from '../config/contact';

/**
 * What this page may say is bounded by what the application actually does.
 *
 * The previous version carried an interactive consent manager with four
 * category toggles and a "Preferences saved to your browser!" confirmation.
 * `handleSavePreferences` set a success flag and nothing else: no store, no
 * cookie, no request, and nothing anywhere in the app read a preference. A
 * consent control that reports a choice it never records is worse than having
 * none — it is a written claim that consent was collected, contradicted by
 * the code, and it is the first thing an investigation asks to see.
 *
 * It also declared cookies that do not exist (`_nx_analytics_id`, `_fbp`,
 * `_gcl_au`), got the name and lifetime of the one real cookie wrong, named
 * Stripe and Google Analytics as providers the app has never loaded, and
 * promised transparency about local storage while listing none of it.
 *
 * Nexus sets exactly one cookie and it is strictly necessary. There is no
 * analytics, advertising or fingerprinting code in the client — verified by
 * grep, not by assumption — so there is nothing to consent to and no toggle
 * to offer. The honest version of this page is shorter and better.
 *
 * If a measurement or advertising tool is ever added, a real consent gate has
 * to land in the same change: the tool must not load until a stored choice
 * says it may.
 */

interface StorageEntry {
  name: string;
  kind: string;
  duration: string;
  purpose: string;
}

/** The single HTTP cookie the platform sets, plus what the CDN sets in front of it. */
const COOKIES: StorageEntry[] = [
  {
    name: 'nexus_session',
    kind: 'Strictly necessary — first party',
    duration: '30 days',
    purpose:
      'Identifies your signed-in session for the shop and the seller dashboard. HttpOnly, so page scripts cannot read it, and marked Secure over HTTPS. It holds a random token only — no personal details are stored in the cookie itself.',
  },
  {
    name: '__cf_bm, cf_clearance',
    kind: 'Strictly necessary — set by Cloudflare',
    duration: '30 minutes / up to 1 year',
    purpose:
      'Set by Cloudflare, which sits in front of Nexus as a CDN and bot filter, to tell automated traffic from people. Nexus does not read these and cannot use them to identify you.',
  },
];

/** Browser storage. Not cookies, but the policy is about both. */
const LOCAL_STORAGE: StorageEntry[] = [
  {
    name: 'nexus_cart_<store>',
    kind: 'localStorage',
    duration: 'Until cleared',
    purpose: 'Keeps your bag between visits so it is not lost when you close the tab.',
  },
  {
    name: 'nexus_user',
    kind: 'localStorage',
    duration: 'Until sign-out',
    purpose:
      'A copy of your own profile so the interface can render your name and avatar before the first request returns. Cleared on sign-out.',
  },
  {
    name: 'nexus_store',
    kind: 'localStorage',
    duration: 'Until sign-out',
    purpose: 'For sellers: which merchant account the dashboard is showing. Cleared on sign-out.',
  },
  {
    name: 'nexus_account_type',
    kind: 'localStorage',
    duration: 'Until sign-out',
    purpose: 'Whether to open the shopper or the seller interface on return.',
  },
  {
    name: 'nexus_payment_reference',
    kind: 'sessionStorage',
    duration: 'Until the tab is closed',
    purpose:
      'The reference of a payment in progress, so that a checkout can be confirmed when the payment provider sends you back. Discarded once the order is settled.',
  },
];

function StorageTable({ rows, caption }: { rows: StorageEntry[]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-strong">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-[var(--ink)]/5 text-muted uppercase tracking-wider text-[10px]">
          <tr>
            <th scope="col" className="py-3 px-4 rounded-l-lg">Name</th>
            <th scope="col" className="py-3 px-4">Type</th>
            <th scope="col" className="py-3 px-4">Lifetime</th>
            <th scope="col" className="py-3 px-4 rounded-r-lg">What it is for</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ink)]/5">
          {rows.map((row) => (
            <tr key={row.name} className="hover:bg-[var(--ink)]/5 align-top">
              <th scope="row" className="py-3 px-4 font-mono font-normal text-left text-[var(--brand-yellow-ink)] whitespace-nowrap">
                {row.name}
              </th>
              <td className="py-3 px-4 font-medium text-primary">{row.kind}</td>
              <td className="py-3 px-4 text-secondary whitespace-nowrap">{row.duration}</td>
              <td className="py-3 px-4 text-body leading-relaxed">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      <Navbar />

      <main id="main" tabIndex={-1} className="flex-1 pt-24 pb-16">
        <section className="relative overflow-hidden py-16 border-b border-[var(--line)]/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#27C93F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs font-semibold tracking-wide text-[var(--brand-yellow-ink)] mb-6">
                <Cookie size={14} /> Cookies &amp; browser storage • Last updated 18 October 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-6 leading-tight">
                Nexus Commerce{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">
                  Cookie Policy
                </span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed">
                This page lists every cookie and every piece of browser storage Nexus uses. The
                list is short, and it is complete.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          {/* The headline, because it is unusual and it is the point. */}
          <div className="glass p-8 rounded-2xl border border-[#27C93F]/40 bg-gradient-to-br from-[#27C93F]/5 to-transparent space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <CheckCircle2 size={22} className="text-[var(--brand-green-ink)]" />
              No tracking, so no consent banner
            </h2>
            <p className="text-body leading-relaxed">
              Nexus runs no analytics suite, no advertising pixel and no fingerprinting script. We
              do not load Google Analytics, the Meta pixel, Google Ads tags or any comparable
              third-party tracker, and we do not share browsing behaviour with advertisers or data
              brokers.
            </p>
            <p className="text-body leading-relaxed">
              Everything listed below is either required to sign you in and take your order, or is
              a convenience stored on your own device that never reaches our servers. That is why
              you are not asked to accept cookies when you arrive: under the ePrivacy rules and the
              Nigeria Data Protection Act, strictly necessary storage of this kind does not require
              consent. If that ever changes — if we add a measurement or advertising tool — we will
              ask first, and the tool will not load until you say yes.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Info size={22} className="text-[var(--brand-yellow-ink)]" />
              Cookies and browser storage, explained
            </h2>
            <p className="text-body text-sm leading-relaxed">
              A <strong className="text-primary">cookie</strong> is a small file a site asks your
              browser to keep and send back on each request. Nexus uses one, to know who is signed
              in.
            </p>
            <p className="text-body text-sm leading-relaxed">
              <strong className="text-primary">Local and session storage</strong> are areas your
              browser sets aside for a site to keep data on your own device. Unlike a cookie, this
              data is <em>not</em> transmitted with every request — it stays in your browser until
              it is cleared. Nexus uses it for your bag and a few interface details.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Server size={22} className="text-[var(--brand-green-ink)]" />
              Cookies we set
            </h2>
            <StorageTable rows={COOKIES} caption="Cookies set when you use Nexus Commerce" />
          </div>

          <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <HardDrive size={22} className="text-[var(--brand-yellow-ink)]" />
              Data kept in your browser
            </h2>
            <p className="text-body text-sm leading-relaxed">
              None of the following is sent to Nexus automatically. It lives on your device and is
              removed when you sign out or clear your browser data.
            </p>
            <StorageTable rows={LOCAL_STORAGE} caption="Local and session storage used by Nexus Commerce" />
          </div>

          <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Trash2 size={22} className="text-[var(--brand-red-ink)]" />
              Clearing or refusing it
            </h2>
            <p className="text-body text-sm leading-relaxed">
              Signing out clears your session cookie and the interface data above. You can also
              clear or block storage for this site from your browser&apos;s settings — in most
              browsers, under Privacy, &quot;Cookies and site data&quot;.
            </p>
            <p className="text-body text-sm leading-relaxed">
              Because the only cookie we set is the one that signs you in, blocking it means you
              will not be able to sign in or complete a purchase. Browsing the marketplace without
              an account works with everything blocked.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <ShieldCheck size={22} className="text-[var(--brand-red-ink)]" />
              For sellers
            </h2>
            <p className="text-body text-sm leading-relaxed">
              Your products are listed in a shopfront that Nexus serves, so the cookies set when a
              shopper browses your listings are ours and the responsibility for them is ours. There
              is nothing for you to install, and no mechanism for you to add a script of your own.
            </p>
            <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2 text-xs">
              <span className="text-[var(--brand-yellow-ink)] font-bold block">What stays with you</span>
              <p className="text-secondary leading-relaxed">
                If you advertise your Nexus listings from your own website, newsletter or ad
                account, the tracking you run there is yours — including any consent your
                jurisdiction requires before it runs. Anything on Nexus itself is covered by this
                policy.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Questions about this policy, or something you believe is missing from the tables above:{' '}
            <a
              href={`mailto:${CONTACT.privacy}`}
              className="text-[var(--brand-yellow-ink)] font-semibold hover:underline"
            >
              {CONTACT.privacy}
            </a>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
