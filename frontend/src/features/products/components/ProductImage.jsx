import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { getProductImageLabel } from '../../../../../backend/src/shared/productCatalog.mjs';

function ProductImage({ src, alt, loading, imageClassName = '', compact = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const imageLabel = getProductImageLabel(src);

  if (!src || failedUrl === src) {
    return (
      <span className={`d-flex h-100 w-100 flex-column align-items-center justify-content-center gap-2 text-secondary ${compact ? 'p-1' : 'p-3'}`}>
        <PackageOpen size={compact ? 24 : 42} strokeWidth={1.5} aria-hidden />
        {!compact && <span className="text-center booking-caption">{src ? 'Ảnh không tải được' : 'Chưa có ảnh'}</span>}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={imageLabel ? `${alt} (${imageLabel.toLowerCase()})` : alt}
      loading={loading}
      onError={() => setFailedUrl(src)}
      className={`h-100 w-100 object-fit-cover ${imageClassName}`}
    />
  );
}

export default ProductImage;
