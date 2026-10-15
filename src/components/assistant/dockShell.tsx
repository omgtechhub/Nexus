import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { focusRing } from '../voice/VoiceShared';

/**
 * The chrome every docked panel shares.
 *
 * Deliberately not positioned: the dock is a flex column and owns where its
 * children sit. A panel that positioned itself `fixed bottom-5 right-5` — as
 * the shopping assistant used to — lands on top of the launchers underneath
 * it, which is exactly the collision the dock exists to prevent.
 */

/** Height of one launcher, so the dock reserves a stable column width. */
export const LAUNCHER_SIZE = 'h-14 w-14';

export const panelShell = cn(
  'flex max-h-[min(38rem,calc(100vh-10rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col',
  'overflow-hidden rounded-2xl border border-[var(--ink)]/15 bg-[var(--surface-base)] shadow-2xl'
);

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  onClose,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="flex flex-shrink-0 items-center gap-2 border-b border-[var(--ink)]/10 px-4 py-3">
      <span className="flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-bold text-primary">{title}</h2>
        {subtitle && <p className="truncate text-[11px] text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the assistant"
          className={cn(
            'rounded-lg p-2 text-muted hover:bg-[var(--ink)]/10 hover:text-primary',
            focusRing
          )}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

/**
 * Chat / Talk.
 *
 * A tablist rather than two launchers: it is one assistant, and which input a
 * person uses is a preference that can change mid-conversation — typing a
 * follow-up to something they just said should not mean reopening anything.
 */
export function ModeTabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (next: T) => void;
  tabs: { id: T; label: string; icon: ReactNode; disabled?: boolean; title?: string }[];
}) {
  return (
    <div
      role="tablist"
      aria-label="How to talk to Nexus IQ"
      className="flex flex-shrink-0 gap-1 border-b border-[var(--ink)]/10 px-3 py-2"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={value === tab.id}
          disabled={tab.disabled}
          title={tab.title}
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5',
            'text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            value === tab.id
              ? 'bg-[var(--ink)]/10 text-primary'
              : 'text-muted hover:bg-[var(--ink)]/5 hover:text-primary',
            focusRing
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
