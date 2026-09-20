import { Check, Circle, MapPin } from 'lucide-react';
import { orderedOrderStatuses, orderStatusLabels } from '../utils/orderStatus';

const fallbackEvents = (status, createdAt) => {
  const currentIndex = orderedOrderStatuses.indexOf(status);
  if (currentIndex < 0) {
    return [{
      status,
      label: orderStatusLabels[status] || status,
      occurredAt: createdAt,
    }];
  }

  return orderedOrderStatuses.slice(0, currentIndex + 1).map((item, index) => ({
    status: item,
    label: orderStatusLabels[item],
    occurredAt: index === 0 ? createdAt : null,
  }));
};

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '';

function OrderTimeline({ order, compact = false }) {
  const events = Array.isArray(order.trackingHistory) && order.trackingHistory.length
    ? order.trackingHistory
    : fallbackEvents(order.status, order.createdAt);

  return (
    <ol className={compact ? 'space-y-3' : 'space-y-5'} aria-label="Hành trình đơn hàng">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isCompleted = event.status !== 'cancelled' && event.status !== 'returned';

        return (
          <li key={`${event.status}-${event.occurredAt || index}`} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3">
            {!isLast && (
              <span className="absolute left-[13px] top-7 h-[calc(100%+4px)] w-px bg-[#DCE4E0]" aria-hidden />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border ${
                isCompleted
                  ? 'border-[#0F766E] bg-[#0F766E] text-white'
                  : 'border-[#D94832] bg-white text-[#D94832]'
              }`}
              aria-hidden
            >
              {isCompleted ? <Check size={15} /> : <Circle size={12} />}
            </span>
            <div className={compact ? 'pb-1' : 'pb-2'}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-[#17201D]">
                  {event.label || orderStatusLabels[event.status] || event.status}
                </p>
                {event.occurredAt && (
                  <time className="text-xs text-[#7A8580]" dateTime={event.occurredAt}>
                    {formatDateTime(event.occurredAt)}
                  </time>
                )}
              </div>
              {event.location && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#2563EB]">
                  <MapPin size={14} aria-hidden />
                  {event.location}
                </p>
              )}
              {event.note && !compact && (
                <p className="mt-1 text-sm leading-6 text-[#5E6B66]">{event.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default OrderTimeline;
