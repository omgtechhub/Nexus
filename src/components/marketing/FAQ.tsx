import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';
import { faqs } from '../../data/marketingContent';
import { SUPPORT_WHATSAPP_ENABLED, whatsappLink } from '../../config/support';
import { cn } from '../../utils/cn';

const chatLink =
  'rounded font-medium text-[var(--brand-yellow-ink)] underline underline-offset-2 ' +
  'transition-colors hover:text-[var(--brand-green-ink)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Questions? We've got
            <span className="text-gradient"> answers</span>
          </h2>
          {/* This was a `<button>` with no handler at all — it looked like
              the way to reach a person and did nothing when pressed. It now
              opens the same WhatsApp conversation as the floating button, and
              falls back to the contact page on a deployment with no number
              configured, rather than rendering a dead control again. */}
          <p className="text-muted">
            Everything you need to know about Nexus Commerce. Can't find what you're looking for?{' '}
            {SUPPORT_WHATSAPP_ENABLED ? (
              <a
                href={whatsappLink('the Nexus FAQ')}
                target="_blank"
                rel="noopener noreferrer"
                className={chatLink}
              >
                Chat with us on WhatsApp
              </a>
            ) : (
              <Link to="/contact" className={chatLink}>
                Chat with us
              </Link>
            )}
            .
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={cn(
                'glass rounded-xl border transition-colors duration-300 overflow-hidden',
                openIndex === index ? 'border-[#FFBD2E]/40' : 'border-[var(--ink)]/5 hover:border-[var(--ink)]/10'
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className={cn(
                  'font-medium text-sm sm:text-base transition-colors',
                  openIndex === index ? 'text-primary' : 'text-body'
                )}>
                  {faq.question}
                </span>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-4 transition-colors',
                  openIndex === index
                    ? 'bg-[#FFBD2E]/20 text-[var(--brand-yellow-ink)]'
                    : 'bg-[var(--ink)]/10 text-muted'
                )}>
                  {openIndex === index ? <Minus size={12} /> : <Plus size={12} />}
                </div>
              </button>

              <div className={cn(
                'overflow-hidden transition-colors duration-300',
                openIndex === index ? 'max-h-96' : 'max-h-0'
              )}>
                <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-[var(--ink)]/5 pt-4">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
