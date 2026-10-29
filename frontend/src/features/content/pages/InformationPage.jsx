import { Container as BsContainer } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { resolveInformationContent } from '../../../utils/informationContent';

function InformationPage({ type = 'about' }) {
  const page = resolveInformationContent(type);
  const PageIcon = page.icon;

  return (
    <main>
      <section className="border-bottom information-page-detail-1">
        <BsContainer as="div" className="py-5 py-sm-5 booking-narrow">
          <span className={`d-flex align-items-center justify-content-center rounded-3 information-page-detail-2 ${page.tone}`}>
            <PageIcon size={24} aria-hidden />
          </span>
          <p className="mt-4 booking-caption fw-bold text-uppercase text-primary">{page.eyebrow}</p>
          <h1 className="mt-2 booking-title fs-2 fw-semibold lh-sm text-dark information-page-detail-3">
            {page.title}
          </h1>
          <p className="mt-4 fs-6 text-secondary information-page-detail-4">{page.intro}</p>
        </BsContainer>
      </section>

      <BsContainer as="section" className="py-5 booking-narrow">
        <div className="border-top border-bottom information-page-detail-5">
          {page.sections.map(({ action, body, icon: Icon, title }) => (
            <article key={title} className="d-grid gap-4 py-5 information-page-detail-6">
              <span className="d-flex align-items-center justify-content-center rounded-3 text-primary information-page-detail-7">
                <Icon size={20} aria-hidden />
              </span>
              <div>
                <h2 className="fs-6 fw-bold text-dark">{title}</h2>
                <p className="mt-2 booking-small text-secondary information-page-detail-8">{body}</p>
                {action && (
                  <Link to={action.href} className="mt-2 d-inline-block booking-small fw-bold text-primary information-page-detail-9">
                    {action.label}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 d-flex flex-wrap gap-3">
          <Link to="/products" className="d-inline-flex align-items-center justify-content-center rounded-3 bg-primary px-4 booking-small fw-bold information-page-detail-10">
            Khám phá sản phẩm
          </Link>
          <Link to="/seller/register" className="d-inline-flex align-items-center justify-content-center rounded-3 border px-4 booking-small fw-bold text-body information-page-detail-11">
            Mở gian hàng
          </Link>
        </div>
      </BsContainer>
    </main>
  );
}

export default InformationPage;
