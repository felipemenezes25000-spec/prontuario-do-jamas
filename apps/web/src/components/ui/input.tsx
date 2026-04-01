import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Show error glow styling */
  error?: boolean;
  /** Render as search input with icon */
  search?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, search, ...props }, ref) => {
    const inputClasses = cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow duration-200',
      // Default focus glow (teal)
      !error && 'focus-visible:ring-teal-500/40 focus-visible:border-teal-500/50',
      // Error state
      error &&
        'border-red-500/50 ring-2 ring-red-500/20 focus-visible:ring-red-500/40 focus-visible:border-red-500/60',
      // Search variant left padding for icon
      search && 'pl-9',
      className,
    );

    if (search) {
      return (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type={type ?? 'search'}
            className={inputClasses}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={inputClasses}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
