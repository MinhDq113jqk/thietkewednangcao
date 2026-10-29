const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function verifyOperations({ client, baseUrl, jwtSecret, refreshSecret, passed, dispatch }) {
  assert.match((await client.query('SELECT current_database() AS name')).rows[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const ids = Object.fromEntries(['buyer','other','seller','admin','shop','product'].map(k => [k, crypto.randomUUID()]));
  const password = crypto.randomBytes(20).toString('base64url');
  const hash = await bcrypt.hash(password, 10);
  for (const role of ['buyer','other','seller','admin']) await client.query('INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)',
    [ids[role], `Operations ${role}`, `${ids[role]}@example.test`, hash, role === 'other' ? 'buyer' : role]);
  await client.query('INSERT INTO shops(id,"ownerId",name,slug,status) VALUES($1,$2,$3,$4,$5)', [ids.shop,ids.seller,'Operations shop',`ops-${ids.shop}`,'active']);
  await client.query('INSERT INTO products(id,"shopId",name,price,stock) VALUES($1,$2,$3,100000,100)', [ids.product,ids.shop,'Operations product']);
  const sessions = {};
  const request = async (route, { role = 'buyer', token, cookie, body, method = 'GET', status = 200 } = {}) => {
    const bearer = token || (role ? sessions[role]?.data.token || jwt.sign({ id: ids[role] }, jwtSecret, { expiresIn: '10m' }) : null);
    const response = await fetch(`${baseUrl}/api/${route}`, { method, headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    assert.ok([status].flat().includes(response.status), `${method} ${route.split('?')[0]}: HTTP ${response.status}, expected ${status}`);
    return { data, cookie: response.headers.get('set-cookie')?.split(';')[0], status: response.status };
  };
  const login = (role, pwd = password) => request('auth/login', { role: null, method: 'POST', body: { email: `${ids[role]}@example.test`, password: pwd } });
  const post = async (route, body, options = {}) => (await request(route, { method: 'POST', body, status: 201, ...options })).data;
  const get = async (route, options) => (await request(route, options)).data;
  const actionToken = async (purpose) => {
    const result = await client.query('SELECT payload FROM notification_outbox WHERE "userId"=$1 AND payload IS NOT NULL ORDER BY "createdAt" DESC LIMIT 1', [ids.buyer]);
    const data = Buffer.from(result.rows[0].payload, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(refreshSecret).digest(), data.subarray(0,12));
    decipher.setAuthTag(data.subarray(12,28));
    const value = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString());
    const token = new URL(value.href).hash.slice(1);
    const stored = await client.query('SELECT "tokenHash" FROM auth_action_tokens WHERE id=$1 AND purpose=$2', [value.actionTokenId,purpose]);
    assert.ok(stored.rows[0].tokenHash === crypto.createHash('sha256').update(token).digest('hex'));
    assert.ok(!result.rows[0].payload.includes(token));
    return token;
  };

  sessions.buyer = await login('buyer');
  const second = await login('buyer');
  const list = await get('auth/sessions');
  assert.equal(list.length,2); assert.equal(list.filter(row=>row.current).length,1);
  assert.ok(list.every(row => !row.tokenHash && !row.userId));
  const secondId = jwt.decode(second.data.token).sid;
  await request(`auth/sessions/${secondId}`, { method: 'DELETE', role: 'other', status:404 });
  await request(`auth/sessions/${secondId}`, { method: 'DELETE' });
  await request('auth/me', { token: second.data.token, status:401 });
  await request('auth/refresh', { role:null, cookie:second.cookie, method:'POST', status:401 });
  await request('auth/me', { token: jwt.sign({ id:ids.buyer,authVersion:0 },jwtSecret), status:401 });
  await request('auth/me');
  passed('Sessions support multiple devices; revocation blocks access and refresh without crossing accounts');

  await post('auth/request-verification', {}, { status:200 });
  const verify = await actionToken('verify');
  await post('auth/verify-email', { token:verify }, { role:null,status:200 });
  await post('auth/verify-email', { token:verify }, { role:null,status:400 });
  assert.ok((await get('auth/me')).emailVerifiedAt);
  const missing = await post('auth/forgot-password', { email:`${crypto.randomUUID()}@example.test` }, { role:null,status:200 });
  const existing = await post('auth/forgot-password', { email:`${ids.buyer}@example.test` }, { role:null,status:200 });
  assert.deepEqual(missing,existing);
  const reset = await actionToken('reset');
  const publicNotices = await get('notifications');
  assert.ok(publicNotices.items.every(row => !row.payload && !JSON.stringify(row).includes(reset)));
  const nextPassword = crypto.randomBytes(20).toString('base64url');
  const resets = await Promise.all([1,2].map(() => post('auth/reset-password', { token:reset,newPassword:nextPassword }, { role:null,status:[200,400] })));
  assert.equal(resets.filter(r=>r.message.startsWith('Đã đặt')).length,1);
  await request('auth/me',{status:401});
  await request('auth/refresh',{role:null,cookie:sessions.buyer.cookie,method:'POST',status:401});
  sessions.buyer = await login('buyer',nextPassword);
  await post('auth/forgot-password',{email:`${ids.buyer}@example.test`},{role:null,status:200});
  const expired = await actionToken('reset');
  await client.query('UPDATE auth_action_tokens SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1 AND purpose=\'reset\' AND "usedAt" IS NULL',[ids.buyer]);
  await post('auth/reset-password',{token:expired,newPassword:password},{role:null,status:400});
  for(let i=0;i<4;i++) await post('auth/forgot-password',{email:`${ids.buyer}@example.test`},{role:null,status:200});
  assert.equal(Number((await client.query('SELECT count(*) FROM auth_action_tokens WHERE "userId"=$1 AND purpose=\'reset\'',[ids.buyer])).rows[0].count),3);
  await request('auth/sessions',{method:'DELETE'});
  await request('auth/me',{status:401});
  sessions.buyer=await login('buyer',nextPassword);
  passed('Recovery and verification tokens are encrypted/hashed, expire, consume once under concurrency and revoke every previous session');

  const orderIds = [];
  for(let i=0;i<26;i++) {
    const id=crypto.randomUUID(); orderIds.push(id);
    await client.query(`INSERT INTO orders(id,"buyerId","shopId",total,status,"createdAt","shippingAddress") VALUES($1,$2,$3,100000,$4,'2026-10-20T17:30:00Z','{"name":"Operations recipient","phone":"0900000000"}')`,[id,ids.buyer,ids.shop,i%2?'confirmed':'pending']);
    for(let j=0;j<2;j++) await client.query('INSERT INTO order_items("orderId","productId",name,price,quantity) VALUES($1,$2,$3,50000,1)',[id,ids.product,`Operations item ${j}`]);
  }
  const foreign=crypto.randomUUID();
  await client.query('INSERT INTO orders(id,"buyerId","shopId",total) VALUES($1,$2,$3,100)',[foreign,ids.other,ids.shop]);
  const first=await get('orders?limit=10'), secondPage=await get('orders?limit=10&page=2'), third=await get('orders?limit=10&page=3');
  assert.equal(first.total,26); assert.equal(first.totalPages,3); assert.equal(third.items.length,6);
  assert.equal(new Set([...first.items,...secondPage.items,...third.items].map(row=>row.id)).size,26);
  assert.deepEqual(first.items.map(r=>r.id),orderIds.slice().sort().reverse().slice(0,10));
  assert.equal((await get('orders?from=2026-10-21&to=2026-10-21&status=pending')).total,13);
  assert.equal((await get('orders?to=2026-10-20')).total,0);
  assert.equal((await get(`orders?search=${foreign}`)).total,0);
  assert.equal((await get('orders?search=Operations%20item')).total,26);
  assert.equal((await get('orders?page=999')).items.length,0);
  for(const query of ['page=1x','limit=101','status=other','from=2026-02-30','from=2026-10-22&to=2026-10-20','sort=invalid']) await request(`orders?${query}`,{status:400});
  assert.equal((await get(`seller/orders?search=${orderIds[0]}`,{role:'seller'})).total,1);
  await request('seller/orders',{role:'buyer',status:403});
  passed('Buyer/seller order pagination counts distinct orders, sorts equal timestamps, filters Vietnam dates and preserves ownership');

  for(const role of ['buyer','seller','other']) await request('admin/operations/audit',{role,status:403});
  await request('admin/operations/support',{role:null,status:401});
  await post('support',{subject:'Unauthorized fixture',message:'A forbidden order reference',orderId:foreign},{status:404});
  const ticket=await post('support',{subject:'Operations support fixture',message:'Please investigate this synthetic order',orderId:orderIds[0]});
  await request(`support/${ticket.id}`,{role:'other',status:404});
  await post(`support/${ticket.id}/messages`,{message:'Foreign reply'},{role:'other',status:404});
  const update=(body,status=200)=>request(`admin/operations/support/${ticket.id}`,{role:'admin',method:'PATCH',body,status});
  await update({assignedTo:ids.seller,reason:'Invalid assignee'},400);
  await update({status:'resolved',reason:'Invalid transition'},409);
  await update({assignedTo:ids.admin,status:'in_progress',reason:'Assigned synthetic investigation'});
  await post(`admin/operations/support/${ticket.id}/messages`,{message:'Synthetic investigation response'},{role:'admin'});
  await update({status:'resolved',reason:'Synthetic investigation resolved'});
  await post(`support/${ticket.id}/messages`,{message:'Synthetic follow-up reopens the ticket'});
  assert.equal((await get(`support/${ticket.id}`)).status,'open');
  await update({status:'closed',reason:'Synthetic investigation closed'});
  await post(`support/${ticket.id}/messages`,{message:'Closed fixture message'},{status:409});
  const detail=await get(`support/${ticket.id}`); assert.equal(detail.messages.total,3);
  const ownNotices=await get('notifications'); const notice=ownNotices.items[0];
  await request(`notifications/${notice.id}/read`,{role:'other',method:'PATCH',status:404});
  await request(`notifications/${notice.id}/read`,{method:'PATCH'});
  passed('Support tickets enforce order ownership, admin assignment, lifecycle, private replies and notification ownership');

  const moderate=(type,id,action,reason='Synthetic moderation reason')=>post(`admin/operations/content/${type}/${id}/moderate`,{action,reason},{role:'admin'});
  await moderate('product',ids.product,'hide','x').then(()=>assert.fail('Missing reason'), error=>assert.match(error.message,/400/));
  const village=(await client.query('SELECT v.id,r.slug FROM craft_villages v JOIN regions r ON r.id=v."regionId" LIMIT 1')).rows[0];
  await client.query('UPDATE products SET "craftVillageId"=$2 WHERE id=$1',[ids.product,village.id]);
  await moderate('product',ids.product,'hide');
  await request(`products/${ids.product}`,{role:null,status:404});
  assert.equal((await get('products?search=Operations%20product',{role:null})).total,0);
  assert.ok((await get('products/recommendations?limit=24',{role:null})).items.every(p=>p.id!==ids.product));
  assert.ok((await get(`shops/ops-${ids.shop}/products`,{role:null})).items.every(p=>p.id!==ids.product));
  assert.ok((await post('assistant/chat',{message:'Giá Operations product'},{role:null,status:200})).products.every(p=>p.id!==ids.product));
  assert.ok((await get(`culture/products?craftVillageId=${village.id}`,{role:null})).items.every(p=>p.id!==ids.product));
  assert.ok((await get(`culture/regions/${village.slug}`,{role:null})).products.every(p=>p.id!==ids.product));
  await request(`seller/products/${ids.product}/restore`,{role:'seller',method:'PUT'});
  await request(`products/${ids.product}`,{role:null,status:404});
  await request('shipping/estimate',{method:'POST',body:{items:[{productId:ids.product,quantity:1}],city:'Hà Nội'},status:409});
  await moderate('product',ids.product,'approve');
  await request(`products/${ids.product}`,{role:null});
  await client.query('UPDATE orders SET status=\'delivered\' WHERE id=$1',[orderIds[0]]);
  const review=await post(`orders/${orderIds[0]}/reviews`,{productId:ids.product,rating:5,comment:'Synthetic review content'});
  const reviewId=review.id || review.review?.id;
  await moderate('review',reviewId,'hide');
  assert.equal((await get(`products/${ids.product}/reviews`,{role:null})).total,0);
  assert.equal((await get(`products/${ids.product}`,{role:null})).reviewSummary.total,0);
  await moderate('review',reviewId,'approve');
  assert.equal((await get(`products/${ids.product}/reviews`,{role:null})).total,1);
  await moderate('shop',ids.shop,'hide');
  await request(`products/${ids.product}`,{role:null,status:404});
  await moderate('shop',ids.shop,'approve');
  const history=await get('admin/operations/moderation',{role:'admin'}); assert.ok(history.total>=6);
  const audit=await get(`admin/operations/audit?resourceType=moderation_actions`,{role:'admin'});
  assert.ok(audit.items.some(row=>row.actorId===ids.admin && row.details.reason==='Synthetic moderation reason'));
  for(const [table,id] of [['audit_events',audit.items[0].id],['moderation_actions',history.items[0].id],['support_messages',detail.messages.items[0].id]]) {
    await assert.rejects(client.query(`UPDATE ${table} SET "createdAt"=now() WHERE id=$1`,[id]), error=>error.code==='23514');
  }
  for(const table of ['bank_receipts','payment_allocations','refunds','cod_entries','seller_payouts']) {
    const missing=await client.query(`SELECT count(*) FROM ${table} f LEFT JOIN audit_events a ON a."resourceId"=f.id AND a."resourceType"=$1 WHERE a.id IS NULL`,[table]);
    assert.equal(Number(missing.rows[0].count),0,`${table} operations are transactionally audited`);
  }
  await client.query('BEGIN');
  await client.query('UPDATE orders SET status=\'cancelled\' WHERE id=$1',[orderIds[1]]);
  await client.query('ROLLBACK');
  assert.equal((await get(`orders/${orderIds[1]}`)).status,'confirmed');
  passed('Moderation requires reasons, cannot be bypassed by seller restore, hides reviews and records immutable operational/financial history');
  if(dispatch) dispatch();
}
module.exports={verifyOperations};
