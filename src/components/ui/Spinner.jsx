const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
};

const Spinner = ({ size = 'md', className = '', label = 'Đang tải...' }) => (
  <span
    className={[
      'inline-block animate-spin rounded-full border-current border-t-transparent',
      sizes[size],
      className,
    ].join(' ')}
    role="status"
    aria-label={label}
  />
);

export const LoadingStatus = ({
  label = 'Đang tải...',
  size = 'md',
  className = '',
}) => (
  <div className={['flex items-center justify-center gap-3 text-sm text-[#68756F]', className].join(' ')} aria-busy="true">
    <Spinner size={size} label={label} className="text-[#0F766E]" />
    <span aria-hidden="true">{label}</span>
  </div>
);

export default Spinner;
