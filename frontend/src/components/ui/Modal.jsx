import { useId } from 'react';
import BootstrapModal from 'react-bootstrap/Modal';
export default function Modal({ open, onClose, title, children, className = '' }) {
  const titleId = useId();
  return <BootstrapModal show={open} onHide={onClose} centered scrollable className={`bs-ui ${className}`} backdropClassName="bs-ui" aria-labelledby={title ? titleId : undefined}>
    <BootstrapModal.Header closeButton closeLabel="Đóng">{title && <BootstrapModal.Title id={titleId}>{title}</BootstrapModal.Title>}</BootstrapModal.Header>
    <BootstrapModal.Body>{children}</BootstrapModal.Body>
  </BootstrapModal>;
}
