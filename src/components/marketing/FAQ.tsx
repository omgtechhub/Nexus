import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { faqs } from '../../data/marketingContent';
import { cn } from '../../utils/cn';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Questions? We've got
            <span className="text-gradient"> answers</span>
          </h2>
          <p className="text-white/50">
            Everything you need to know about Nexus Commerce. Can't find what you're looking for?{' '}
            <button className="text-[#FFBD2E] hover:text-[#27C93F] underline underline-offset-2 transition-colors font-medium">
              Chat with us
            </button>.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={cn(
                'glass rounded-xl border transition-all duration-300 overflow-hidden',
                openIndex === index ? 'border-[#FFBD2E]/40' : 'border-white/5 hover:border-white/10'
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className={cn(
                  'font-medium text-sm sm:text-base transition-colors',
                  openIndex === index ? 'text-white' : 'text-white/70'
                )}>
                  {faq.question}
                </span>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-4 transition-all',
                  openIndex === index
                    ? 'bg-[#FFBD2E]/20 text-[#FFBD2E]'
                    : 'bg-white/10 text-white/40'
                )}>
                  {openIndex === index ? <Minus size={12} /> : <Plus size={12} />}
                </div>
              </button>

              <div className={cn(
                'overflow-hidden transition-all duration-300',
                openIndex === index ? 'max-h-96' : 'max-h-0'
              )}>
                <div className="px-5 pb-5 text-sm text-white/50 leading-relaxed border-t border-white/5 pt-4">
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
