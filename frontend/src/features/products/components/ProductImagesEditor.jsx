import { Button as BsButton, Form as BsForm } from 'react-bootstrap';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Trash2, Upload } from 'lucide-react';
import ProductImage from './ProductImage';

export default function ProductImagesEditor({ images, onChange, onUpload, uploading, error }) {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const add = () => {
    const value = url.trim();
    if (!value || (!/^https?:\/\//i.test(value) && !value.startsWith('/uploads/'))) {
      setUrlError('Nhập URL http/https hoặc đường dẫn /uploads/');
      return;
    }
    if (images.includes(value)) { setUrlError('Ảnh này đã có trong danh sách'); return; }
    onChange([...images, value]);
    setUrl('');
    setUrlError('');
  };
  const move = (index, direction) => {
    const next = [...images];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };
  const buttonClass = "d-flex align-items-center justify-content-center rounded-2 border border-secondary px-2 product-images-editor-detail-1";
  return (
    <fieldset className="layout-span-md-2 product-images-editor-detail-2" disabled={uploading}>
      <legend className="booking-small fw-medium text-secondary">Ảnh sản phẩm ({images.length}/8)</legend>
      <p className="booking-caption text-secondary">Ảnh đầu tiên là ảnh đại diện. Dùng nút di chuyển để đổi thứ tự.</p>
      <ol className="d-grid gap-3 product-images-editor-detail-3">
        {images.map((image, index) => (
          <li key={`${image}-${index}`} className="d-flex align-items-center gap-3 rounded-3 border border-secondary p-2">
            <div className="flex-shrink-0 overflow-hidden rounded-2 product-images-editor-detail-4"><ProductImage src={image} alt={`Ảnh sản phẩm ${index + 1}`} compact /></div>
            <span className="visually-hidden">Ảnh {index + 1}</span>
            <BsButton variant="outline-primary" type="button" className={buttonClass} onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Chuyển ảnh ${index + 1} sang trước`}><ArrowLeft size={16} /></BsButton>
            <BsButton variant="outline-primary" type="button" className={buttonClass} onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label={`Chuyển ảnh ${index + 1} sang sau`}><ArrowRight size={16} /></BsButton>
            <BsButton variant="outline-primary" type="button" className={buttonClass} onClick={() => onChange(images.filter((_, i) => i !== index))} aria-label={`Xóa ảnh ${index + 1}`}><Trash2 size={16} /></BsButton>
          </li>
        ))}
      </ol>
      <BsForm.Label htmlFor="product-image-url" className="d-block booking-small text-secondary">URL ảnh mới</BsForm.Label>
      <div className="d-flex flex-wrap gap-2">
        <BsForm.Control id="product-image-url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (images.length < 8) add(); } }} disabled={images.length >= 8} aria-invalid={Boolean(urlError)} aria-describedby="product-images-error" className="flex-grow-1 rounded-3 border border-secondary px-2 product-images-editor-detail-5" />
        <BsButton variant="outline-primary" type="button" onClick={add} disabled={images.length >= 8} className={buttonClass}>Thêm ảnh</BsButton>
        <BsForm.Label className={`${buttonClass} gap-2 product-images-editor-detail-6`}><Upload size={16} />{uploading ? 'Đang tải...' : 'Tải ảnh'}<BsForm.Control aria-label="Tải ảnh sản phẩm" type="file" accept="image/*" onChange={onUpload} disabled={images.length >= 8 || uploading} className="visually-hidden" /></BsForm.Label>
      </div>
      <p id="product-images-error" role={urlError || error ? 'alert' : undefined} className="booking-small text-danger">{urlError || error}</p>
    </fieldset>
  );
}
