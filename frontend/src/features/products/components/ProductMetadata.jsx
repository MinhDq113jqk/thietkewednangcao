import {
  getProductImageLabel,
  getProductImages,
  getProductSourceLabel,
} from '../../../../../backend/src/shared/productCatalog.mjs';

function ProductMetadata({ product, image = getProductImages(product)[0], className = '' }) {
  const imageLabel = getProductImageLabel(image);
  const sourceStyle = product.dataSource === 'demo'
    ? "product-metadata-detail-1"
    : "text-body product-metadata-detail-2";

  return (
    <span className={`d-flex flex-wrap align-items-center gap-2 booking-caption ${className}`}>
      <span className={`text-nowrap rounded-2 px-2 py-1 fw-semibold ${sourceStyle}`}>
        {getProductSourceLabel(product.dataSource)}
      </span>
      {imageLabel && (
        <span className="text-nowrap rounded-2 px-2 py-1 text-body product-metadata-detail-3">
          {imageLabel}
        </span>
      )}
    </span>
  );
}

export default ProductMetadata;
