import BootstrapSpinner from 'react-bootstrap/Spinner';
export default function Spinner({ size = 'md', className = '', label = 'Đang tải...' }) {
  return <BootstrapSpinner animation="border" size={size === 'sm' ? 'sm' : undefined} className={className} role="status" aria-label={label} />;
}
export function LoadingStatus({ label = 'Đang tải...', size = 'md', className = '' }) {
  return <div className={`d-flex align-items-center justify-content-center gap-3 text-secondary ${className}`} aria-busy="true"><Spinner size={size} label={label} /><span aria-hidden="true">{label}</span></div>;
}
