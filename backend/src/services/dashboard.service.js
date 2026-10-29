const { QueryTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const select = (sql, shopId, transaction) => sequelize.query(sql, {
  replacements: { shopId: shopId || null }, type: QueryTypes.SELECT, transaction,
});
const scope = alias => `(:shopId::uuid IS NULL OR ${alias}."shopId" = :shopId::uuid)`;
const counts = async (table, field, shopId, transaction) => {
  const rows = await select(`SELECT "${field}" AS key, count(*)::int AS count FROM ${table} t
    WHERE ${['orders', 'products'].includes(table) ? scope('t') : 'true'} GROUP BY "${field}"`, shopId, transaction);
  return Object.fromEntries(rows.map(row => [String(row.key), row.count]));
};

// Every source is aggregated before joining: multiple receipts/refunds must never
// multiply order or ledger amounts. Query count is independent of order count.
const dashboardRevenue = async (shopId, transaction) => {
  const [row] = await select(`WITH scoped AS (SELECT * FROM orders o WHERE ${scope('o')}),
    allocations AS (SELECT "orderId", sum(amount) amount FROM payment_allocations GROUP BY "orderId"),
    returns AS (SELECT "orderId", sum(amount) amount,
      sum(amount) FILTER (WHERE source = 'cod_order') cod FROM refunds GROUP BY "orderId"),
    cod AS (SELECT "orderId", max(amount) FILTER (WHERE kind='collection') collected,
      coalesce(sum(amount) FILTER (WHERE kind='remittance'),0) remitted, sum(fee) fee FROM cod_entries GROUP BY "orderId"),
    recognized AS (SELECT o.*, CASE WHEN status IN ('delivered','returned') AND
      (("paymentMethod"='bank_transfer' AND a.amount=o.total+coalesce(o."shippingFee",0)) OR
       ("paymentMethod"='cod' AND c.collected=o.total+coalesce(o."shippingFee",0)
        AND c.remitted+c.fee=c.collected))
      THEN greatest(0,o.total-coalesce(CASE WHEN "paymentMethod"='cod' THEN r.cod ELSE r.amount END,0)) ELSE 0 END amount
      FROM scoped o LEFT JOIN allocations a ON a."orderId"=o.id LEFT JOIN returns r ON r."orderId"=o.id LEFT JOIN cod c ON c."orderId"=o.id)
    SELECT coalesce(sum(amount),0) gross,
      coalesce(sum(amount) FILTER (WHERE NOT EXISTS(SELECT 1 FROM seller_ledger l WHERE l."orderId"=recognized.id AND l.kind='sale')),0) "unpostedGross",
      count(*) FILTER (WHERE amount>0)::int "settledOrders",
      coalesce(sum(total) FILTER (WHERE status IN ('pending','confirmed','packing','shipping')),0) "pipelineGross",
      count(*) FILTER (WHERE status IN ('pending','confirmed','packing','shipping') AND "paymentStatus"='unpaid')::int "awaitingPayment" FROM recognized`, shopId, transaction);
  const [ledger] = await select(`WITH entries AS (SELECT * FROM seller_ledger l WHERE ${scope('l')}),
    unreserved AS (SELECT l.* FROM entries l WHERE NOT EXISTS(SELECT 1 FROM settlement_items i
      JOIN settlement_periods p ON p.id=i."periodId" WHERE i."entryId"=l.id AND p.status<>'cancelled')),
    grouped AS (SELECT l."shopId", l."orderId", sum(l.amount) amount,
      bool_and(l."availableAt"<=now() AND l."effectiveAt"<=now()) due FROM unreserved l GROUP BY l."shopId", l."orderId"),
    eligible AS (SELECT g.*, amount<=0 OR (due AND o.status IN ('delivered','returned') AND NOT EXISTS(
      SELECT 1 FROM return_cases c WHERE c."orderId"=g."orderId" AND c.status IN ('requested','approved','received'))) ok
      FROM grouped g LEFT JOIN orders o ON o.id=g."orderId"),
    balances AS (SELECT "shopId", sum(amount) FILTER (WHERE ok) available,
      sum(amount) FILTER (WHERE NOT ok) held FROM eligible GROUP BY "shopId")
    SELECT coalesce(sum(amount) FILTER (WHERE kind IN ('sale','refund')),0) "postedGross",
      -coalesce(sum(amount) FILTER (WHERE kind='refund'),0) refunds,
      -coalesce(sum(amount) FILTER (WHERE kind IN ('commission','commission_refund')),0) commission,
      -coalesce(sum(amount) FILTER (WHERE kind='carrier_fee'),0) "carrierFee",
      coalesce(sum(amount) FILTER (WHERE kind='adjustment'),0) adjustments,
      coalesce(sum(amount),0) net, coalesce(sum(amount),0) "ledgerAmount",
      (SELECT coalesce(sum(amount),0) FROM seller_payouts p WHERE ${scope('p')}) "paidAmount",
      (SELECT coalesce(sum(greatest(0,available)),0) FROM balances) available,
      (SELECT coalesce(sum(greatest(0,-available)),0) FROM balances) "carryDebt",
      (SELECT coalesce(sum(held),0) FROM balances) "heldAmount",
      (SELECT coalesce(sum(amount),0) FROM settlement_periods p WHERE ${scope('p')} AND status='draft') reserved FROM entries`, shopId, transaction);
  const result = Object.fromEntries(Object.entries({ ...row, ...ledger }).map(([key, value]) => [key, Number(value)]));
  result.outstanding = result.ledgerAmount - result.paidAmount;
  return result;
};
module.exports = { counts, dashboardRevenue };
