import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Search } from 'lucide-react';
import { productCategories } from '../../../../../backend/src/shared/productCatalog.mjs';

export default function BookingSearch() {
  const navigate = useNavigate();
  const id = useId();
  const submit = event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['search', 'category', 'maxPrice']) {
      const value = String(values.get(key) || '').trim();
      if (value) params.set(key, value);
    }
    navigate(`/products${params.size ? `?${params}` : ''}`);
  };
  return <Form onSubmit={submit} role="search" aria-label="Tìm quà lưu niệm" className="booking-search">
    <Form.Group controlId={`${id}-query`}>
      <Form.Label>Bạn đang tìm món quà nào?</Form.Label>
      <Form.Control name="search" type="search" placeholder="Gốm, tranh, quà lưu niệm…" maxLength={200} />
    </Form.Group>
    <Form.Group controlId={`${id}-category`}>
      <Form.Label>Danh mục</Form.Label>
      <Form.Select name="category" defaultValue=""><option value="">Tất cả danh mục</option>{productCategories.map(c => <option key={c}>{c}</option>)}</Form.Select>
    </Form.Group>
    <Form.Group controlId={`${id}-price`}>
      <Form.Label>Ngân sách</Form.Label>
      <Form.Select name="maxPrice" defaultValue=""><option value="">Mọi mức giá</option><option value="100000">Đến 100.000 ₫</option><option value="300000">Đến 300.000 ₫</option><option value="500000">Đến 500.000 ₫</option></Form.Select>
    </Form.Group>
    <Button type="submit" className="booking-search-submit"><Search size={20} aria-hidden="true" /> Tìm kiếm</Button>
  </Form>;
}
