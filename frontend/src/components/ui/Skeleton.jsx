import BsGrid from '../../features/home/components/ResponsiveGrid';
const Skeleton = ({ as: Component = 'div', className = '' }) => (
  <Component aria-hidden="true" className={["skeleton rounded-2", className].join("")} />
);

export const ProductCardSkeleton = () => (
  <article aria-hidden="true" className="d-flex h-100 flex-column overflow-hidden rounded-3 border skeleton-detail-1">
    <Skeleton className="w-100 rounded-0 skeleton-detail-2" />
    <div className="d-flex flex-grow-1 flex-column p-2 p-sm-3">
      <Skeleton className="skeleton-detail-3" />
      <Skeleton className="mt-2 skeleton-detail-4" />
      <Skeleton className="mt-2 skeleton-detail-5" />
      <div className="mt-2 d-flex align-items-center justify-content-between gap-3">
        <Skeleton className="skeleton-detail-6" />
        <Skeleton className="skeleton-detail-7" />
      </div>
      <div className="mt-auto d-flex align-items-end justify-content-between gap-3 pt-3">
        <Skeleton className="skeleton-detail-8" />
        <Skeleton className="rounded-2 skeleton-detail-9" />
      </div>
    </div>
  </article>
);

export const OrderCardSkeleton = () => (
  <article aria-hidden="true" className="overflow-hidden rounded-3 border skeleton-detail-10">
    <div className="d-flex align-items-center justify-content-between gap-4 border-bottom px-3 py-2 skeleton-detail-11">
      <Skeleton className="skeleton-detail-12" />
      <Skeleton className="skeleton-detail-13" />
    </div>
    <div className="d-grid gap-4 p-3 align-items-sm-center skeleton-detail-14">
      <Skeleton className="rounded-3 skeleton-detail-15" />
      <div className="skeleton-detail-16">
        <Skeleton className="skeleton-detail-17" />
        <Skeleton className="skeleton-detail-18" />
        <Skeleton className="skeleton-detail-19" />
      </div>
      <Skeleton className="skeleton-detail-20" />
    </div>
    <div className="d-flex justify-content-end border-top px-3 py-2 skeleton-detail-21">
      <Skeleton className="skeleton-detail-22" />
    </div>
  </article>
);

export const TableSkeleton = ({ columns = 5, rows = 5, className = '' }) => {
  const template = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  return (
    <div aria-hidden="true" className={className}>
      <div className="d-grid gap-5 bg-secondary-subtle px-4 py-2" style={template}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="skeleton-detail-23" />
        ))}
      </div>
      <div className="skeleton-detail-24">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="d-grid gap-5 px-4 py-3" style={template}>
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={columnIndex === 0 ? "skeleton-detail-25" : "skeleton-detail-26"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const FormSkeleton = ({ fields = 6 }) => (
  <div aria-hidden="true" className="rounded-3 border border-secondary p-4 shadow-sm skeleton-detail-27">
    <Skeleton className="mb-4 skeleton-detail-28" />
    <BsGrid as="div" columns={{"xs":1,"md":2}} className="">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className={index === fields - 1 ? "layout-span-md-2 skeleton-detail-29" : ''}>
          <Skeleton className="mb-2 skeleton-detail-30" />
          <Skeleton className={index === fields - 1 ? "w-100 skeleton-detail-31" : "w-100 skeleton-detail-32"} />
        </div>
      ))}
    </BsGrid>
    <div className="mt-4 d-flex justify-content-end gap-3">
      <Skeleton className="skeleton-detail-33" />
      <Skeleton className="skeleton-detail-34" />
    </div>
  </div>
);

export default Skeleton;
