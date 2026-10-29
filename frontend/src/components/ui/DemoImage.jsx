import ProductImage from '../../features/products/components/ProductImage';
import credits from '../../data/demoImageCredits.json';

export default function DemoImage({ imageId }) {
  const image = credits.find(item => item.id === imageId);
  if (!image) return null;
  return <figure className="booking-demo-figure mb-0">
    <div className="booking-demo-image"><ProductImage src={image.src} alt={image.alt} loading="lazy" /></div>
    <figcaption className="small text-secondary px-3 py-2">
      Ảnh minh họa · {image.author} · {image.license}
    </figcaption>
  </figure>;
}
