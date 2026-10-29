const { PaymentAllocation, Refund } = require('../models');
const { codSummary } = require('./codReconciliation.service');

// Only fully reconciled funding counts. A historical paid flag is not evidence.
const recognizedRevenue = async (order, transaction) => {
  if (!['delivered', 'returned'].includes(order.status)) return 0;
  let funded;
  let refunded;
  if (order.paymentMethod === 'cod') {
    const summary = await codSummary(order, transaction);
    if (summary.status !== 'reconciled' || summary.collectionDifference !== 0) return 0;
    funded = summary.remittedAmount + summary.carrierFee;
    refunded = summary.refundedAmount;
  } else if (order.paymentMethod === 'bank_transfer') {
    const allocated = Number(await PaymentAllocation.sum('amount', { where: { orderId: order.id }, transaction }) || 0);
    funded = allocated;
    refunded = Number(await Refund.sum('amount', { where: { orderId: order.id }, transaction }) || 0);
  } else return 0;
  if (funded !== Number(order.total) + Number(order.shippingFee || 0)) return 0;
  return Math.max(0, Math.min(Number(order.total), funded - Number(order.shippingFee || 0)) - refunded);
};

const revenueReport = async (orders, transaction) => {
  const { statementFigures } = require('./settlement.service');
  const figures = await Promise.all([...new Set(orders.map(order => order.shopId))].map(shopId => statementFigures(shopId, transaction)));
  const total = key => figures.reduce((value, row) => value + (row.totals[key] ?? row.summary[key] ?? 0), 0);
  const postedIds = new Set(figures.flatMap(row => row.entries.filter(entry => entry.kind === 'sale').map(entry => entry.orderId)));
  const amounts = await Promise.all(orders.map(order => recognizedRevenue(order, transaction)));
  const pipeline = orders.filter(order => ['pending', 'confirmed', 'packing', 'shipping'].includes(order.status));
  return {
    gross: amounts.reduce((value, amount) => value + amount, 0),
    unpostedGross: amounts.reduce((value, amount, index) => value + (postedIds.has(orders[index].id) ? 0 : amount), 0),
    settledOrders: amounts.filter(amount => amount > 0).length,
    pipelineGross: pipeline.reduce((value, order) => value + Number(order.total), 0),
    awaitingPayment: pipeline.filter(order => order.paymentStatus === 'unpaid').length,
    ...Object.fromEntries(['postedGross', 'refunds', 'commission', 'carrierFee', 'adjustments', 'net',
      'ledgerAmount', 'paidAmount', 'outstanding', 'available', 'carryDebt', 'heldAmount', 'reserved'].map(key => [key, total(key)])),
  };
};
module.exports = { recognizedRevenue, revenueReport };
