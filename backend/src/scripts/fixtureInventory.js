const assert = require('node:assert/strict');
// Raw order fixtures already store available stock after purchase. Initialize
// their held quantity and ledger too, as the real checkout now does for SKUs.
module.exports = async (client, orderId) => {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const items = (await client.query(`SELECT i."variantId",sum(i.quantity)::int AS quantity FROM order_items i
    JOIN orders o ON o.id=i."orderId" WHERE o.id=$1 AND o.status IN ('pending','confirmed','packing') GROUP BY i."variantId"`, [orderId])).rows;
  for (const item of items) {
    const row = (await client.query('UPDATE product_variants SET held=held+$2 WHERE id=$1 RETURNING *', [item.variantId,item.quantity])).rows[0];
    await client.query(`INSERT INTO inventory_movements("variantId","shopId","orderId",kind,"sourceKey","availableDelta","heldDelta","availableAfter","heldAfter",reason)
      VALUES($1,$2,$3,'reserve',$4,0,$5,$6,$7,'Synthetic raw-order fixture held stock')`, [row.id,row.shopId,orderId,`fixture-reserve:${orderId}`,item.quantity,row.stock,row.held]);
  }
};
