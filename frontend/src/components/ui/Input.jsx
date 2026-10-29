import { forwardRef, useId } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
const Input = forwardRef(({ label, error, icon: Icon, iconPosition = 'left', className = '', id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  return <Form.Group controlId={inputId} className="w-100">
    {label && <Form.Label>{label}</Form.Label>}
    <InputGroup hasValidation>
      {Icon && iconPosition === 'left' && <InputGroup.Text><Icon size={16} aria-hidden="true" /></InputGroup.Text>}
      <Form.Control ref={ref} id={inputId} isInvalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} className={className} {...props} />
      {Icon && iconPosition === 'right' && <InputGroup.Text><Icon size={16} aria-hidden="true" /></InputGroup.Text>}
      {error && <Form.Control.Feedback type="invalid" id={`${inputId}-error`}>{error}</Form.Control.Feedback>}
    </InputGroup>
  </Form.Group>;
});
Input.displayName = 'Input';
export default Input;
