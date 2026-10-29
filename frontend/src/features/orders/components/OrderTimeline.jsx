import { Check, Circle, MapPin } from 'lucide-react';
import { orderedOrderStatuses, orderStatusLabels } from '../../../utils/orderStatus';

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
    <ol className={compact ? "order-timeline-detail-1" : "order-timeline-detail-2"} aria-label="Hành trình đơn hàng">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isCompleted = event.status !== 'cancelled' && event.status !== 'returned';

        return (
          <li key={`${event.status}-${event.occurredAt || index}`} className="position-relative d-grid gap-3 order-timeline-detail-3">
            {!isLast && (
              <span className="position-absolute order-timeline-detail-4" aria-hidden />
            )}
            <span
              className={`position-relative d-flex align-items-center justify-content-center rounded-pill border order-timeline-detail-7 ${
                isCompleted
                  ? "border-primary bg-primary order-timeline-detail-5"
                  : "border-danger text-danger order-timeline-detail-6"
              }`}
              aria-hidden
            >
              {isCompleted ? <Check size={15} /> : <Circle size={12} />}
            </span>
            <div className={compact ? 'pb-1' : 'pb-2'}>
              <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2">
                <p className="booking-small fw-semibold text-dark">
                  {event.label || orderStatusLabels[event.status] || event.status}
                </p>
                {event.occurredAt && (
                  <time className="booking-caption text-secondary" dateTime={event.occurredAt}>
                    {formatDateTime(event.occurredAt)}
                  </time>
                )}
              </div>
              {event.location && (
                <p className="mt-1 d-flex align-items-center gap-2 booking-small text-primary">
                  <MapPin size={14} aria-hidden />
                  {event.location}
                </p>
              )}
              {event.note && !compact && (
                <p className="mt-1 booking-small text-secondary order-timeline-detail-8">{event.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default OrderTimeline;
