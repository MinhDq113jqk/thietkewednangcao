import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Container, Form, InputGroup, Nav } from 'react-bootstrap';
import { Eye, EyeOff } from 'lucide-react';
import { useLoginForm } from '../hooks/useLoginForm';
import Spinner from '../../../components/ui/Spinner';

export default function LoginPage() {
  const { error, form, handleChange, handleSubmit, isLogin, loading, setIsLogin } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);
  return <Container as="main" className="bs-ui booking-auth">
    <h1 className="h3 fw-bold">{isLogin ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản mới'}</h1>
    <p className="text-secondary">Một tài khoản để mua quà, theo dõi đơn và liên hệ gian hàng.</p>
    <Nav variant="tabs" className="mb-4" role="tablist" aria-label="Tài khoản">
      <Nav.Item><Nav.Link as="button" type="button" role="tab" active={isLogin} aria-selected={isLogin} onClick={() => { setIsLogin(true); setShowPassword(false); }}>Đăng nhập</Nav.Link></Nav.Item>
      <Nav.Item><Nav.Link as="button" type="button" role="tab" active={!isLogin} aria-selected={!isLogin} onClick={() => { setIsLogin(false); setShowPassword(false); }}>Đăng ký</Nav.Link></Nav.Item>
    </Nav>
    <Form onSubmit={handleSubmit}>
      {!isLogin && <Form.Group controlId="auth-name" className="mb-3"><Form.Label>Họ và tên</Form.Label><Form.Control name="name" autoComplete="name" value={form.name} onChange={handleChange} placeholder="Nguyễn Minh Anh" /></Form.Group>}
      <Form.Group controlId="auth-email" className="mb-3"><Form.Label>Email</Form.Label><Form.Control name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} placeholder="ban@example.com" /></Form.Group>
      <Form.Group controlId="auth-password" className="mb-3"><Form.Label>Mật khẩu</Form.Label><InputGroup><Form.Control name="password" type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} value={form.password} onChange={handleChange} placeholder={isLogin ? 'Mật khẩu của bạn' : 'Tối thiểu 8 ký tự'} /><Button type="button" variant="outline-secondary" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</Button></InputGroup></Form.Group>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button type="submit" className="w-100" disabled={loading} aria-busy={loading}>{loading && <Spinner size="sm" label="Đang xử lý đăng nhập..." />}{loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập an toàn' : 'Tạo tài khoản'}</Button>
    </Form>
    {isLogin ? <Link to="/forgot-password" className="d-block mt-3">Quên mật khẩu?</Link> : <p className="small mt-3">Khi đăng ký, bạn đồng ý với <Link to="/policy">chính sách bảo mật và điều khoản</Link>.</p>}
  </Container>;
}
