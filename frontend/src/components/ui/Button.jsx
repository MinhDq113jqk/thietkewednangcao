import { forwardRef } from 'react';
import BootstrapButton from 'react-bootstrap/Button';
import Spinner from './Spinner';
const variants = { primary: 'primary', outline: 'outline-primary', ghost: 'light', danger: 'danger' };
const Button = forwardRef(({ children, variant = 'primary', size = 'md', loading = false, disabled = false, className = '', type = 'button', ...props }, ref) => (
  <BootstrapButton ref={ref} type={type} variant={variants[variant] || variant} size={size === 'md' ? undefined : size} disabled={disabled || loading} aria-busy={loading} className={className} {...props}>
    {loading && <Spinner size="sm" label="Đang xử lý..." />}{children}
  </BootstrapButton>
));
Button.displayName = 'Button';
export default Button;
