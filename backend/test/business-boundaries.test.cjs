const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test, after } = require('node:test');
process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:5432/never_connect_unit';
process.env.JWT_SECRET=crypto.randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET=crypto.randomBytes(48).toString('base64url');
process.env.REDIS_URL='';
const models=require('../dist/models');
const {sequelize}=require('../dist/database/connection');
const operations=require('../dist/services/operations.service');
const {recognizedRevenue}=require('../dist/services/recognizedRevenue.service');
const {createCase}=require('../dist/services/afterSales.service');
const {ShopsService}=require('../dist/modules/shops/shops.service');
const {OrdersService}=require('../dist/modules/orders/orders.service');
const {AuthService}=require('../dist/modules/auth/auth.service');
const id=()=>crypto.randomUUID();
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
after(()=>sequelize.close());

test('US01 registration rejects missing/short input and duplicate email without creating a user',async t=>{
  const create=t.mock.method(models.User,'create',async()=>assert.fail('No user should be created'));
  t.mock.method(models.User,'findOne',async()=>({id:id()}));
  for(const body of [{},{name:'Fixture',email:'fixture@example.test',password:'short'}]){const res=response();await new AuthService().register({body},res);assert.equal(res.statusCode,400);}
  const res=response();await new AuthService().register({body:{name:'Fixture',email:'fixture@example.test',password:'synthetic-long-pass'}},res);assert.equal(res.statusCode,409);assert.equal(create.mock.callCount(),0);
});
test('US11 public shop hides pending and absent shops; active shop is readable',async t=>{
  let fixture=null;t.mock.method(models.Shop,'findOne',async()=>fixture);
  for(const status of [null,'pending','suspended','active']){fixture=status?{id:id(),status}:null;const res=response();await new ShopsService().getShopBySlug({params:{slug:'synthetic'}},res);assert.equal(res.statusCode,status==='active'?200:404);}
});
test('US15 order lookup binds buyer identity and returns 404 for foreign order',async t=>{
  const buyerId=id(),orderId=id();
  t.mock.method(models.Order,'findOne',async options=>{assert.deepEqual(options.where,{id:orderId,buyerId});return null;});
  const res=response();await new OrdersService().getMyOrderById({user:{id:buyerId},params:{id:orderId}},res);assert.equal(res.statusCode,404);
});
test('US16 cancel releases inventory once and rejects paid or already cancelled orders',async t=>{
  const {cancelOrderWithRestock}=require('../dist/services/orderCancellation.service');
  const inventory=require('../dist/services/inventory.service');
  const buyerId=id(),orderId=id();const row={id:orderId,status:'pending',paymentStatus:'unpaid',trackingHistory:[],update:async values=>Object.assign(row,values)};
  t.mock.method(sequelize,'transaction',async fn=>fn({LOCK:{UPDATE:'UPDATE'},afterCommit:()=>{}}));
  t.mock.method(models.Order,'findOne',async options=>{assert.deepEqual(options.where,{id:orderId,buyerId});return row;});
  const release=t.mock.method(inventory,'orderMovements',async(_row,_transaction,kind)=>assert.equal(kind,'release'));
  const input={orderId,buyerId,allowedStatuses:['pending']};await cancelOrderWithRestock(input);assert.equal(row.status,'cancelled');
  await assert.rejects(cancelOrderWithRestock(input),{status:409});row.status='pending';row.paymentStatus='paid';
  await assert.rejects(cancelOrderWithRestock(input),{code:'PAYMENT_REFUND_REQUIRED'});assert.equal(release.mock.callCount(),1);
});
test('US17 reviews reject invalid stars, foreign orders and undelivered purchases',async t=>{
  const {ReviewsService}=require('../dist/modules/reviews/reviews.service');const service=new ReviewsService();
  for(const rating of [0,6,1.5,'5']) await assert.rejects(service.createReview(id(),id(),{productId:id(),rating}),error=>error.getStatus()===400);
  t.mock.method(sequelize,'transaction',async fn=>fn({LOCK:{UPDATE:'UPDATE'}}));
  let row=null;t.mock.method(models.Order,'findOne',async()=>row);
  await assert.rejects(service.createReview(id(),id(),{productId:id(),rating:5}),error=>error.getStatus()===404);
  row={status:'shipping'};await assert.rejects(service.createReview(id(),id(),{productId:id(),rating:5}),error=>error.getStatus()===409);
});
test('US18 registering shop ignores forged status and owner',async t=>{
  const owner=id();let created;
  t.mock.method(models.Shop,'findOne',async()=>null);
  t.mock.method(models.Shop,'create',async row=>{created=row;return row;});
  const res=response();await new ShopsService().registerShop({user:{id:owner,role:'seller'},body:{name:'Shop thử',status:'active',ownerId:id()}},res);
  assert.equal(res.statusCode,201);assert.equal(created.ownerId,owner);assert.equal(created.status,'pending');
});
test('US22 recognized revenue requires delivered full funding and subtracts refunds',async t=>{
  let funded=125000,refunded=20000;
  t.mock.method(models.PaymentAllocation,'sum',async()=>funded);t.mock.method(models.Refund,'sum',async()=>refunded);
  const order={id:id(),status:'delivered',paymentMethod:'bank_transfer',total:100000,shippingFee:25000};
  assert.equal(await recognizedRevenue(order),80000);
  funded=124999;assert.equal(await recognizedRevenue(order),0);
  funded=125001;assert.equal(await recognizedRevenue(order),0);
  funded=125000;refunded=200000;assert.equal(await recognizedRevenue(order),0);
  assert.equal(await recognizedRevenue({...order,status:'shipping'}),0);
});
test('US26 notifications constrain owner and never select encrypted payload',async t=>{
  const userId=id();t.mock.method(models.Notification,'findAndCountAll',async options=>{assert.deepEqual(options.where,{userId});assert.ok(!options.attributes.includes('payload'));return {rows:[],count:0};});
  assert.equal((await operations.listNotifications(userId,{})).total,0);
  t.mock.method(models.Notification,'update',async(_values,options)=>{assert.equal(options.where.userId,userId);return [0];});
  await assert.rejects(operations.readNotification(userId,id()),{status:404});
});
test('US27 support lookup cannot read another requester and rejects invalid filters',async t=>{
  const requesterId=id(),ticketId=id();
  t.mock.method(models.SupportTicket,'findOne',async options=>{assert.deepEqual(options.where,{id:ticketId,requesterId});return null;});
  await assert.rejects(operations.getTicket(requesterId,false,ticketId,{}),{status:404});
  assert.throws(()=>operations.listTickets(requesterId,false,{status:'forged'}),{status:400});
});
test('US28 returns reject duplicate order lines and invalid exchange amounts before transaction',async t=>{
  const transaction=t.mock.method(sequelize,'transaction',async()=>assert.fail('Invalid return must not reach transaction'));
  const line={orderItemId:id(),quantity:1};const body={kind:'exchange',requestKey:'synthetic-key',reason:'Yêu cầu đổi sản phẩm',evidence:['Bằng chứng thử'],lines:[line,line],requestedAmount:0};
  await assert.rejects(createCase(id(),body,{id:id(),role:'buyer'}),{status:400});
  await assert.rejects(createCase(id(),{...body,lines:[line],requestedAmount:100},{id:id(),role:'buyer'}),{status:400});
  await assert.rejects(createCase(id(),{...body,lines:[{...line,quantity:0}]},{id:id(),role:'buyer'}),{status:400});
  assert.equal(transaction.mock.callCount(),0);
});
test('US33 moderation rejects unknown target and missing evidence before writes',async()=>{
  await assert.rejects(operations.moderate(id(),'users',id(),{action:'hide',reason:'Valid reason'}),{status:400});
  await assert.rejects(operations.moderate(id(),'product',id(),{action:'hide',reason:''}),{status:400});
});
test('US23 shop approval records reason and promotes the owner only from buyer role',async t=>{
  const shopId=id(),ownerId=id();const row={id:shopId,ownerId,status:'pending',update:async values=>Object.assign(row,values)};
  t.mock.method(sequelize,'transaction',async fn=>fn({LOCK:{UPDATE:'UPDATE'}}));
  t.mock.method(models.Shop,'findByPk',async()=>row);
  t.mock.method(models.User,'update',async(values,options)=>{assert.equal(values.role,'seller');assert.deepEqual(options.where,{id:ownerId,role:'buyer'});});
  t.mock.method(models.ModerationAction,'create',async values=>{assert.equal(values.reason,'Verified fixture owner');return {id:id(),...values};});
  t.mock.method(models.AuditEvent,'create',async()=>({}));t.mock.method(models.Notification,'create',async()=>({}));
  await operations.moderate(id(),'shop',shopId,{action:'approve',reason:'Verified fixture owner'});assert.equal(row.status,'active');
});
test('US29 refund rejects unsupported source and fractional VND',async()=>{
  const {recordRefund}=require('../dist/services/afterSales.service');
  await assert.rejects(recordRefund({source:'forged'},id()),{status:400});
  await assert.rejects(recordRefund({source:'cod_order',reference:'REF-1',amount:0.5},id()),{status:400});
});
test('US30 bank receipt rejects coercions, fractional money and nonexistent calendar dates',async()=>{
  const {recordBankReceipt}=require('../dist/services/paymentReconciliation.service');
  for(const amount of [true,'1e3',[],0,-1,0.1]) await assert.rejects(recordBankReceipt({reference:'BANK-TEST',amount},id()),{status:400});
  await assert.rejects(recordBankReceipt({reference:'BANK-TEST',amount:100,receivedAt:'2026-02-30T12:00:00Z'},id()),{status:400});
});
test('US31 COD forbids collection fee and zero remittance without fee',async()=>{
  const {recordCodEntry}=require('../dist/services/codReconciliation.service');
  const fact={reference:'COD-TEST',amount:100,occurredAt:'2026-01-01T12:00:00Z',evidence:'Chứng từ giả',note:'Đối soát kiểm thử'};
  await assert.rejects(recordCodEntry(id(),{...fact,kind:'collection',fee:1},id()),{status:400});
  await assert.rejects(recordCodEntry(id(),{...fact,kind:'remittance',amount:0,fee:0},id()),{status:400});
});
test('US32 policy rejects invalid commission and unexplained changes',()=>{
  const {savePolicy}=require('../dist/services/settlement.service');
  for(const commissionBps of [-1,10001,1.5,'500']) assert.throws(()=>savePolicy(id(),{commissionBps,note:'Policy fixture'}, {id:id(),role:'admin'}),{status:400});
  assert.throws(()=>savePolicy(id(),{commissionBps:500,note:''},{id:id(),role:'admin'}),{status:400});
});
test('US34 session revocation is owner-scoped and idempotent for revoked sessions',async t=>{
  const {revokeSession}=require('../dist/services/accountSecurity.service');
  const userId=id(),sessionId=id();let exists=false;
  t.mock.method(sequelize,'transaction',async fn=>fn({LOCK:{UPDATE:'UPDATE'}}));
  t.mock.method(models.User,'findByPk',async()=>({id:userId}));
  t.mock.method(models.AuthSession,'findOne',async options=>{assert.deepEqual(options.where,{id:sessionId,userId});return exists?{revokedAt:new Date(),update:()=>assert.fail('Already revoked')}:null;});
  await assert.rejects(revokeSession(userId,sessionId),{status:404});exists=true;await revokeSession(userId,sessionId);
});
test('US04 US35 action lookup is purpose-scoped and rejects invalid or absent tokens',async t=>{
  const {consumeAction}=require('../dist/services/accountSecurity.service');
  t.mock.method(sequelize,'query',async()=>[[{count:1}]]);
  t.mock.method(models.AuthActionToken,'findOne',async options=>{assert.equal(options.where.purpose,'verify');return null;});
  await assert.rejects(consumeAction({ip:'127.0.0.1',body:{token:'A'.repeat(43)}},'verify'),{status:400});
  await assert.rejects(consumeAction({ip:'127.0.0.1',body:{token:'bad'}},'reset'),{status:400});
});
