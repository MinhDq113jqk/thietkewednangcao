import { forwardRef } from 'react';
import Spinner from './Spinner';

const variants = {
  primary: 'bg-[#0F766E] text-white hover:bg-[#0B5F58]',
  outline: 'border border-[#0F766E] text-[#0F766E] bg-transparent hover:bg-[#E6F3F1]',
  ghost: 'text-[#405049] bg-transparent hover:bg-[#EEF2EF]',
  danger: 'bg-[#C93F2C] text-white hover:bg-[#AA3425]',
};
const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };

const Button = forwardRef(({ children, variant = 'primary', size = 'md', loading = false, disabled = false, className = '', ...props }, ref) => (
  <button
    ref={ref} disabled={disabled || loading} aria-busy={loading}
    className={['inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className].join(' ')}
    {...props}
  >
    {loading && <Spinner size="sm" label="Đang xử lý..." />}
    {children}
  </button>
));
Button.displayName = 'Button';
export default Button;
