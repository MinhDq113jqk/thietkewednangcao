const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  primary: 'bg-amber-100 text-amber-700',
};

const statusVariants = {
  pending: 'warning',
  confirmed: 'info',
  packing: 'info',
  shipping: 'info',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'danger',
};

const Badge = ({ children, variant = 'default', status, className = '' }) => {
  const resolvedVariant = status ? statusVariants[status] || variant : variant;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[resolvedVariant] || variants.default,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
};

export default Badge;
