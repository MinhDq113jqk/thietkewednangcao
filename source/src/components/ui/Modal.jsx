import { useEffect, useId } from 'react';
import { X } from 'lucide-react';

function Modal({ open, onClose, title, children, className = '' }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#17201D]/55"
        onClick={onClose}
        aria-label="Đóng hộp thoại"
      />
      <div
        className={`relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-2xl ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && <h2 id={titleId} className="font-display text-xl font-semibold text-[#17201D]">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-[#68756F] hover:bg-[#EEF4F1] hover:text-[#17201D]"
            aria-label="Đóng"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
