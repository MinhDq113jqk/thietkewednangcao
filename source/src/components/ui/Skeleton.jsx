const Skeleton = ({ as: Component = 'div', className = '' }) => (
  <Component aria-hidden="true" className={['skeleton rounded-md', className].join(' ')} />
);

export const ProductCardSkeleton = () => (
  <article aria-hidden="true" className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#DFE5E1] bg-white">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="flex flex-1 flex-col p-3 sm:p-4">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="mt-2 h-4 w-3/5" />
      <Skeleton className="mt-3 h-3 w-2/5" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-11 w-11 rounded-md" />
      </div>
    </div>
  </article>
);

export const OrderCardSkeleton = () => (
  <article aria-hidden="true" className="overflow-hidden rounded-lg border border-[#DDE4E0] bg-white">
    <div className="flex items-center justify-between gap-4 border-b border-[#EDF1EF] px-4 py-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="grid gap-4 p-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
      <Skeleton className="h-[72px] w-[72px] rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="flex justify-end border-t border-[#EDF1EF] px-4 py-3">
      <Skeleton className="h-9 w-28" />
    </div>
  </article>
);

export const TableSkeleton = ({ columns = 5, rows = 5, className = '' }) => {
  const template = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  return (
    <div aria-hidden="true" className={className}>
      <div className="grid gap-5 bg-stone-50 px-5 py-3" style={template}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-3/4" />
        ))}
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-5 px-5 py-4" style={template}>
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={columnIndex === 0 ? 'h-8 w-4/5' : 'h-4 w-3/4'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const FormSkeleton = ({ fields = 6 }) => (
  <div aria-hidden="true" className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
    <Skeleton className="mb-6 h-7 w-48" />
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className={index === fields - 1 ? 'md:col-span-2' : ''}>
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className={index === fields - 1 ? 'h-28 w-full' : 'h-11 w-full'} />
        </div>
      ))}
    </div>
    <div className="mt-5 flex justify-end gap-3">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
);

export default Skeleton;
