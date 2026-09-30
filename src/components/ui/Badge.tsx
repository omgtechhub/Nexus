import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'default', size = 'sm', className, dot }: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-body border border-white/10',
    success: 'bg-[#27C93F]/15 text-[#27C93F] border border-[#27C93F]/30',
    warning: 'bg-[#FFBD2E]/15 text-[#FFBD2E] border border-[#FFBD2E]/30',
    error: 'bg-[#FF5F56]/15 text-[#FF5F56] border border-[#FF5F56]/30',
    info: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    ghost: 'bg-transparent text-muted border border-white/10',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      variants[variant],
      sizes[size],
      className
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' && 'bg-[#27C93F]',
          variant === 'warning' && 'bg-[#FFBD2E]',
          variant === 'error' && 'bg-[#FF5F56]',
          variant === 'info' && 'bg-cyan-400',
          variant === 'default' && 'bg-white/50',
        )} />
      )}
      {children}
    </span>
  );
}
