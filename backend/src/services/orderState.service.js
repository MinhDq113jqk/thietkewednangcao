const ADMIN_ORDER_TRANSITIONS = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['packing', 'cancelled']),
  packing: new Set(['cancelled']),
  shipping: new Set([]),
  delivered: new Set([]),
  cancelled: new Set([]),
  returned: new Set([]),
};

const canAdminTransitionOrder = (currentStatus, nextStatus) => (
  currentStatus === nextStatus
  || Boolean(ADMIN_ORDER_TRANSITIONS[currentStatus]?.has(nextStatus))
);

const getAdminOrderTransitions = (currentStatus) => (
  [...(ADMIN_ORDER_TRANSITIONS[currentStatus] || [])]
);

module.exports = {
  canAdminTransitionOrder,
  getAdminOrderTransitions,
};
