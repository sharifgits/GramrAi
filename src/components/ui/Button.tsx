import React from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "w-full py-4 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 border-b-4",
          {
            'bg-[#6e5aff] text-white shadow-[#6e5aff]/20 border-indigo-600': variant === 'primary',
            'bg-slate-200 text-slate-400 dark:bg-[#131b2c] dark:text-slate-600 shadow-none border-b-4 border-slate-300 dark:border-[#212b43]': variant === 'secondary',
            'bg-emerald-500 text-white shadow-emerald-500/20 border-emerald-600': variant === 'success',
            'bg-rose-500 text-white shadow-rose-500/20 border-rose-600': variant === 'danger',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
