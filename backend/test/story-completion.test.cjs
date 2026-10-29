const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {test,after}=require('node:test');
process.env.DATABASE_URL='postgresql://unit:unit@127.0.0.1:1/never_connect';
process.env.JWT_SECRET=crypto.randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET=crypto.randomBytes(48).toString('base64url');
process.env.REDIS_URL='';process.env.NODE_ENV='test';
const models=require('../dist/models'),{sequelize}=require('../dist/database/connection');
sequelize.connectionManager.connect=async()=>{throw new Error('Unit tests cannot connect to DB');};
const {UsersService}=require('../dist/modules/users/users.service');
const {ProductsService}=require('../dist/modules/products/products.service');
const {AuthService}=require('../dist/modules/auth/auth.service');
const {AdminService}=require('../dist/modules/admin/admin.service');
const {ReviewsService}=require('../dist/modules/reviews/reviews.service');
const response=()=>({statusCode:200,headers:{},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},setHeader(k,v){this.headers[k]=v;return this;}});
const id=()=>crypto.randomUUID();
const tx=t=>t.mock.method(sequelize,'transaction',async(...args)=>args.at(-1)({LOCK:{UPDATE:'UPDATE'},afterCommit:()=>{}}));
after(()=>sequelize.close());

test('US20 inventory change preserves stock on exact replay and rejects source reuse or underflow',async t=>{
 const {change}=require('../dist/services/inventory.service');
 const variant={id:id(),shopId:id(),stock:10,held:0,update:async v=>Object.assign(variant,v),reload:async()=>{}};
 let movement=null,writes=0;
 t.mock.method(models.ProductVariant,'findByPk',async(_id,o)=>{assert.equal(o.lock,'UPDATE');return variant;});
 t.mock.method(models.InventoryMovement,'findOne',async()=>movement);
 t.mock.method(models.InventoryMovement,'create',async v=>{writes++;movement=v;return v;});
 const input={variantId:variant.id,availableDelta:-3,heldDelta:3,kind:'reserve',sourceKey:'reserve-fixture',reason:'Synthetic reservation'};
 const transaction={LOCK:{UPDATE:'UPDATE'}};
 assert.equal((await change(input,transaction)).idempotentReplay,false);
 assert.equal(variant.stock,7);assert.equal(variant.held,3);
 assert.equal((await change(input,transaction)).idempotentReplay,true);assert.equal(writes,1);
 await assert.rejects(change({...input,availableDelta:-4},transaction),{status:409,code:'INVENTORY_SOURCE_REUSED'});
 movement=null;
 await assert.rejects(change({...input,sourceKey:'another-fixture',availableDelta:-8},transaction),{status:409,code:'INSUFFICIENT_STOCK'});
 assert.equal(variant.stock,7);assert.equal(writes,1);
});
test('US20 SKU stock rejects foreign products and stale versions before recording movements',async t=>{
 const {updateVariantStock}=require('../dist/services/inventory.service');tx(t);
 const userId=id(),productId=id(),shopId=id(),variantId=id();let product=null;
 t.mock.method(models.Shop,'findOne',async o=>{assert.deepEqual(o.where,{ownerId:userId});return {id:shopId};});
 t.mock.method(models.Product,'findOne',async o=>{assert.deepEqual(o.where,{id:productId,shopId});return product;});
 t.mock.method(models.ProductVariant,'findOne',async()=>({id:variantId,stockVersion:2}));
 t.mock.method(models.InventoryMovement,'findOne',async()=>null);
 const create=t.mock.method(models.InventoryMovement,'create',async()=>assert.fail('No write permitted'));
 const body={kind:'receipt',quantity:3,expectedVersion:1,reason:'Synthetic stock receipt',requestKey:'stock-fixture-01'};
 await assert.rejects(updateVariantStock(userId,productId,variantId,body),{status:404});
 product={id:productId,shopId};await assert.rejects(updateVariantStock(userId,productId,variantId,body),{status:409,code:'STOCK_VERSION_CONFLICT'});
 assert.equal(create.mock.callCount(),0);
});
test('US30 bank summary computes outstanding independently of client-paid claims',async t=>{
 const {orderPaymentSummary}=require('../dist/services/paymentReconciliation.service');
 const order={id:id(),total:'100000',shippingFee:'20000',paymentMethod:'bank_transfer',paymentStatus:'unpaid'};
 t.mock.method(models.PaymentAllocation,'sum',async()=>50000);t.mock.method(models.Refund,'sum',async()=>10000);
 const result=await orderPaymentSummary(order);assert.equal(result.expectedAmount,120000);assert.equal(result.outstandingAmount,70000);assert.equal(result.refundedAmount,10000);
});
test('US31 COD separates collection, remittance, fees and refundable money',async t=>{
 const {codSummary}=require('../dist/services/codReconciliation.service');
 const order={id:id(),total:100000,shippingFee:20000,paymentStatus:'paid'};
 let rows=[];t.mock.method(models.CodEntry,'findAll',async()=>rows);t.mock.method(models.Refund,'sum',async()=>10000);
 assert.equal((await codSummary(order)).legacyUnverified,true);
 rows=[{kind:'collection',amount:120000,fee:0},{kind:'remittance',amount:70000,fee:20000}];
 const partial=await codSummary(order);assert.equal(partial.pendingRemittance,30000);assert.equal(partial.refundableAmount,80000);assert.equal(partial.status,'partially_remitted');
 rows.push({kind:'remittance',amount:30000,fee:0});assert.equal((await codSummary(order)).status,'reconciled');
});
test('US32 commission uses exact integer rounding and policy writes are idempotent',async t=>{
 const {commission,savePolicy}=require('../dist/services/settlement.service');tx(t);
 assert.equal(commission(101,500),5);assert.equal(commission(110,500),6);assert.equal(commission(999999999999999,10000),999999999999999);
 const actor={id:id(),role:'admin'},shopId=id();let policy=null,writes=0;
 t.mock.method(models.Shop,'findOne',async()=>({id:shopId}));t.mock.method(models.Order,'findAll',async()=>[]);
 t.mock.method(models.SettlementPolicy,'findOne',async()=>policy);
 t.mock.method(models.SettlementPolicy,'create',async v=>{writes++;policy={id:id(),...v};return policy;});
 const body={commissionBps:500,note:'Synthetic policy'};
 assert.equal((await savePolicy(shopId,body,actor)).idempotentReplay,false);
 assert.equal((await savePolicy(shopId,body,actor)).idempotentReplay,true);assert.equal(writes,1);
});

test('US05 profile validates input, ignores forged authority and returns only public user fields',async()=>{
 const user={id:id(),name:'Old',email:'fixture@example.test',role:'buyer',authVersion:9,requireSession:true,password:'synthetic-hash',refreshToken:'synthetic-hash',update:async values=>Object.assign(user,values)};
 const svc=new UsersService();
 for(const body of [null,[],{}, {name:' '},{name:'a'.repeat(101)},{phone:12},{phone:'not-a-phone'}])await assert.rejects(svc.updateProfile({user,body},response()),e=>e.getStatus()===400);
 const res=response();await svc.updateProfile({user,body:{name:'  New  ',phone:'090 000 0000',role:'admin',id:id(),authVersion:0}},res);
 assert.equal(user.role,'buyer');assert.equal(user.authVersion,9);assert.equal(user.name,'New');assert.equal(user.phone,'0900000000');
 assert.deepEqual(Object.keys(res.body.user).sort(),['id','name','email','phone','avatar','role','emailVerifiedAt'].sort());
 await svc.updateProfile({user,body:{phone:''}},response());assert.equal(user.phone,null);
});
test('US09 US33 product details filter hidden reviews without removing an otherwise public product',async t=>{
 const productId=id(),hidden={id:id(),comment:'hidden',moderationHidden:true},visible={id:id(),comment:'visible',moderationHidden:false};
 let rows=[hidden,visible];
 t.mock.method(models.Product,'findOne',async options=>{
   const include=options.include.find(x=>x.as==='reviews');
   assert.equal(include.required,false);assert.equal(include.separate,true);
   const reviews=rows.filter(r=>!include.where||r.moderationHidden===include.where.moderationHidden);
   return {id:productId,name:'Fixture',price:100000,category:'Gốm sứ',reviews};
 });
 t.mock.method(models.Review,'findOne',async options=>{assert.equal(options.where.moderationHidden,false);return {total:rows.filter(r=>!r.moderationHidden).length,average:5};});
 const svc=new ProductsService();
 for(const [fixture,expected] of [[[hidden,visible],[visible.id]],[[hidden],[]],[[],[]]]){
  rows=fixture;const res=response();await svc.getProductById({params:{id:productId}},res);
  assert.equal(res.statusCode,200);assert.deepEqual(res.body.reviews.map(r=>r.id),expected);assert.equal(res.body.id,productId);
 }
});
test('US02 login rejects absent, inactive and wrong-password users, accepts valid credentials',async t=>{
 tx(t);const bcrypt=require('bcryptjs');let row=null;
 t.mock.method(models.User,'findOne',async()=>row);
 t.mock.method(bcrypt,'compare',async(value)=>value==='valid-local-password');
 t.mock.method(models.AuthSession,'create',async values=>({id:id(),...values}));
 const svc=new AuthService();const req={body:{email:'FIXTURE@example.test',password:'wrong'},headers:{'user-agent':'unit'},get:()=>''};
 for(const fixture of [null,{id:id(),isActive:false},{id:id(),isActive:true,password:'hash'}]){row=fixture;const res=response();await svc.login(req,res);assert.equal(res.statusCode,401);}
 row={id:id(),name:'Fixture',email:'fixture@example.test',isActive:true,role:'buyer',authVersion:0,update:async values=>Object.assign(row,values)};
 const res=response();await svc.login({...req,body:{...req.body,password:'valid-local-password'}},res);
 assert.ok(res.body.token);assert.equal(res.body.user.id,row.id);assert.ok(!('refreshToken' in res.body));assert.ok(res.headers['Set-Cookie'].includes('HttpOnly'));
});
test('US03 logout is idempotent with absent and malformed cookies and clears the scoped cookie',async()=>{
 for(const cookie of ['', 'souvenir_refresh=invalid']){const res=response();await new AuthService().logout({headers:{cookie}},res);assert.equal(res.statusCode,200);assert.match(res.headers['Set-Cookie'],/Max-Age=0/);assert.match(res.headers['Set-Cookie'],/Path=\/api\/auth/);}
});
test('US06 address create/update/default/delete stay inside the current user transaction',async t=>{
 tx(t);const userId=id(),addressId=id();let defaultReset=0,destroyed=0;
 t.mock.method(models.User,'findByPk',async(uid,options)=>{assert.equal(uid,userId);assert.equal(options.lock,'UPDATE');return {id:userId};});
 t.mock.method(models.Address,'count',async()=>0);
 t.mock.method(models.Address,'update',async(values,options)=>{assert.deepEqual(options.where,{userId});assert.equal(values.isDefault,false);defaultReset++;return [1];});
 const row={id:addressId,userId,isDefault:true,reload:async()=>{},update:async v=>Object.assign(row,v),destroy:async()=>destroyed++};
 t.mock.method(models.Address,'create',async values=>Object.assign(row,values));
 t.mock.method(models.Address,'findOne',async options=>{assert.equal(options.where.userId,userId);return row;});
 const body={name:'Fixture',phone:'0900000000',detail:'Synthetic address',city:'Hà Nội',userId:id()};
 const svc=new UsersService(),res=response();await svc.addAddress({user:{id:userId},body},res);assert.equal(res.statusCode,201);assert.equal(row.userId,userId);assert.equal(row.isDefault,true);
 await svc.updateAddress({user:{id:userId},params:{id:addressId},body:{...body,isDefault:false}},response());assert.equal(row.isDefault,true);
 await svc.deleteAddress({user:{id:userId},params:{id:addressId}},response());assert.equal(destroyed,1);assert.equal(defaultReset,2);
});
test('US06 foreign address cannot be updated or deleted',async t=>{
 tx(t);t.mock.method(models.User,'findByPk',async()=>({}));t.mock.method(models.Address,'findOne',async()=>null);
 const svc=new UsersService(),req={user:{id:id()},params:{id:id()},body:{name:'Fixture',phone:'0900000000',detail:'Synthetic address',city:'Hà Nội'}};
 await assert.rejects(svc.updateAddress(req,response()),e=>e.getStatus()===404);
 await assert.rejects(svc.deleteAddress(req,response()),e=>e.getStatus()===404);
});
test('US17 review creation binds buyer/order/product and rejects a duplicate review',async t=>{
 tx(t);const buyerId=id(),orderId=id(),productId=id();let exists=false;
 t.mock.method(models.Order,'findOne',async options=>{assert.deepEqual(options.where,{id:orderId,buyerId});return {id:orderId,status:'delivered',shopId:id()};});
 t.mock.method(models.OrderItem,'findOne',async options=>{assert.deepEqual(options.where,{orderId,productId});return {id:id()};});
 t.mock.method(models.Shop,'findByPk',async()=>({update:async()=>{}}));
 t.mock.method(models.Review,'findOne',async options=>options.raw?{average:5,count:1}:exists?{id:id()}:null);
 t.mock.method(models.Review,'create',async values=>{assert.equal(values.userId,buyerId);exists=true;return {id:id(),...values};});
 const svc=new ReviewsService();assert.equal((await svc.createReview(buyerId,orderId,{productId,rating:5,comment:' Good '})).comment,'Good');
 await assert.rejects(svc.createReview(buyerId,orderId,{productId,rating:5}),e=>e.getStatus()===409);
});
test('US24 admin cannot disable self; disabling another account returns updated state',async t=>{
 const actor=id(),other=id();let row={id:actor,update:async v=>Object.assign(row,v)};
 t.mock.method(models.User,'findByPk',async()=>row);
 const self=response();await new AdminService().updateUserStatus({user:{id:actor},params:{id:actor},body:{isActive:false}},self);assert.equal(self.statusCode,400);
 row={id:other,update:async v=>Object.assign(row,v)};const res=response();await new AdminService().updateUserStatus({user:{id:actor},params:{id:other},body:{isActive:false}},res);assert.equal(row.isActive,false);
});
test('US05 US24 HTTP logging omits query values, headers and body',t=>{
 const logger=require('../dist/common/middleware/requestLogger');let finish,entry;
 t.mock.method(console,'log',value=>{entry=JSON.parse(value);});
 logger({method:'GET',originalUrl:'/api/admin/users?search=private%40example.test',headers:{authorization:'synthetic'},body:{password:'synthetic'},socket:{remoteAddress:'127.0.0.1'}},{statusCode:200,on:(_event,fn)=>{finish=fn;}},()=>{});
 finish();assert.equal(entry.path,'/api/admin/users');assert.ok(!JSON.stringify(entry).includes('private'));assert.ok(!('headers' in entry));assert.ok(!('body' in entry));
});
