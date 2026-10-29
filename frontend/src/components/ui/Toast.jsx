import { Button as BsButton } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from './toastStore';

const icons = {
  success: <CheckCircle size={18} className="text-success flex-shrink-0" />,
  error:   <XCircle     size={18} className="text-danger flex-shrink-0" />,
  warning: <AlertTriangle size={18} className="text-warning flex-shrink-0" />,
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
    <div className={["d-flex align-items-center gap-3 rounded-3 border px-3 py-2 shadow-lg toast-detail-1", visible ? "opacity-100 toast-detail-2" : "opacity-0 toast-detail-3"].join("")}>
      {icons[type]}
      <span className="booking-small text-secondary flex-grow-1">{message}</span>
      <BsButton variant="outline-primary" type="button" onClick={() => remove(id)} aria-label="Đóng thông báo"><X size={14} /></BsButton>
    </div>
  );
};

const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="booking-toast-stack d-flex flex-column gap-2" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => <ToastItem key={t.id} {...t} />)}
    </div>
  );
};

export default ToastContainer;
