import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

interface ThemeToggleProps {
  className?: string;
  /** `icon` is the compact control for app chrome; `labelled` adds the word. */
  variant?: 'icon' | 'labelled';
}

/**
 * The light/dark switch.
 *
 * Built as a real `switch` so a screen reader announces its state rather than
 * just "button": `aria-checked` carries whether dark mode is on, and the label
 * says what pressing it does instead of what the icon depicts. The icon shows
 * the theme you would get, which is the convention people already read — a sun
 * while dark is active.
 */
export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const next = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={toggleTheme}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 rounded-xl',
        'border border-[var(--ink)]/10 bg-[var(--ink)]/5 text-secondary',
        'transition-colors hover:bg-[var(--ink)]/10 hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]',
        variant === 'icon' ? 'h-9 w-9' : 'h-9 px-3',
        className
      )}
    >
      {/* Both icons are always mounted and cross-faded, so the control never
          changes size as the label swaps. */}
      <span className="relative flex h-[18px] w-[18px] items-center justify-center">
        <Sun
          size={18}
          aria-hidden="true"
          className={cn(
            'absolute transition-[opacity,transform] duration-200',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
          )}
        />
        <Moon
          size={18}
          aria-hidden="true"
          className={cn(
            'absolute transition-[opacity,transform] duration-200',
            isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
        />
      </span>
      {variant === 'labelled' && (
        <span className="text-sm font-medium">{isDark ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
}
