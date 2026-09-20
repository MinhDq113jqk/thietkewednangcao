import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from './toastStore';

const icons = {
  success: <CheckCircle size={18} className="text-green-500 shrink-0" />,
  error:   <XCircle     size={18} className="text-red-500   shrink-0" />,
  warning: <AlertTriangle size={18} className="text-yellow-500 shrink-0" />,
};

const ToastItem = ({ id, type, message }) => {
  const remove = useToastStore((s) => s.remove);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => remove(id), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [id, remove]);

  return (
    <div className={['flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg transition-all duration-300', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'].join(' ')}>
      {icons[type]}
      <span className="text-sm text-gray-800 flex-1">{message}</span>
      <button onClick={() => remove(id)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
    </div>
  );
};

const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => <ToastItem key={t.id} {...t} />)}
    </div>
  );
};

export default ToastContainer;
