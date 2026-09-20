import { forwardRef } from 'react';

const Input = forwardRef(({
  label, error, icon: Icon, iconPosition = 'left', className = '', id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label htmlFor={inputId} className="text-sm font-semibold text-[#405049]">{label}</label>}
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon size={16} /></span>
        )}
        <input
          ref={ref} id={inputId}
          className={['w-full rounded-md border bg-white px-3 py-2 text-sm text-[#17201D] outline-none placeholder:text-[#91A09A] transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20', error ? 'border-[#C93F2C]' : 'border-[#CAD5D0]', Icon && iconPosition === 'left' ? 'pl-9' : '', className].join(' ')}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon size={16} /></span>
        )}
      </div>
      {error && <p className="text-xs text-[#B33625]">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';
export default Input;
