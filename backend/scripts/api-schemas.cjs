// Offline contract definitions. Models are parsed as source; no .env or database is loaded.
const fs = require('node:fs'), path = require('node:path');
const ts = require('typescript');
const s = { type: 'string' }, n = { type: 'number' }, b = { type: 'boolean' };
const i = { type: 'integer', minimum: 0 }, id = { type: 'string', format: 'uuid' };
const date = { type: 'string', format: 'date-time' };
const text = (min = 1, max = 1000) => ({ ...s, minLength: min, maxLength: max });
const en = (...values) => ({ ...s, enum: values });
const obj = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const arr = items => ({ type: 'array', items });
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const money = { oneOf: [{ type: 'integer', minimum: 0 }, { type: 'string', pattern: '^\\d+(\\.\\d+)?$' }], description: 'VND; Sequelize DECIMAL có thể trả chuỗi. Request số tiền giao dịch phải là số nguyên.' };
const models = {};
const modelDir = path.resolve(__dirname, '../src/models');
for (const file of [...fs.readdirSync(modelDir).filter(f => f.endsWith('.js')), '../modules/products/product.entity.js']) {
  const ast = ts.createSourceFile(file, fs.readFileSync(path.join(modelDir, file), 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = node => {
    const init = ts.isCallExpression(node) && node.expression.getText(ast) === 'Product.init';
    if (ts.isCallExpression(node) && (init || (node.expression.getText(ast).endsWith('.define') && ts.isStringLiteral(node.arguments[0]))) && ts.isObjectLiteralExpression(node.arguments[init ? 0 : 1])) {
      const fields = {};
      for (const p of node.arguments[init ? 0 : 1].properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const name = p.name.getText(ast).replace(/['"]/g, '');
        if (/password|token|hash|authVersion|requireSession|payload|lastError/i.test(name)) continue;
        const raw = p.initializer.getText(ast).replace(/\bD\./g, 'DataTypes.').replace(/^id\(\)$/, 'DataTypes.UUID');
        let schema = /DataTypes\.(UUID)/.test(raw) ? id : /DataTypes\.(BOOLEAN)/.test(raw) ? b : /DataTypes\.(INTEGER|BIGINT)/.test(raw) ? { type: 'integer' } : /DataTypes\.(DECIMAL|FLOAT|DOUBLE)/.test(raw) ? money : /DataTypes\.(DATE)/.test(raw) ? date : /DataTypes\.(JSON)/.test(raw) ? { description: 'Document JSON métier; les formes spécialisées sont détaillées dans les schémas des opérations.', oneOf: [{ type: 'object' }, arr({})] } : s;
        const enumCall = raw.match(/DataTypes\.ENUM\(([^)]+)\)/);
        if (enumCall) schema = en(...[...enumCall[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]));
        if (/DataTypes\.ARRAY/.test(raw)) schema = arr(s);
        if (/DataTypes\.(DECIMAL|FLOAT|DOUBLE)/.test(raw)) schema = { oneOf: [n, { ...s, pattern: '^-?\\d+(\\.\\d+)?$' }] };
        fields[name] = { ...schema, ...(!/allowNull:\s*false|primaryKey:\s*true|^(req|required)\(/.test(raw) ? { nullable: true } : {}) };
      }
      models[init ? 'Product' : node.arguments[0].text] = obj({ ...fields, createdAt: date, updatedAt: date });
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}
const page = item => obj({ items: arr(item), total: i, page: { type: 'integer', minimum: 1 }, limit: i, totalPages: i }, ['items', 'total', 'page', 'totalPages']);
const message = obj({ message: s }, ['message']);
const user = obj({ id, name: s, email: { ...s, format: 'email' }, phone: { ...s, nullable: true }, avatar: { ...s, nullable: true }, role: en('buyer', 'seller', 'admin'), emailVerifiedAt: { ...date, nullable: true } }, ['id', 'name', 'email', 'role']);
const address = obj({ name: text(1, 100), phone: text(9, 25), detail: text(1, 300), city: text(1, 100), district: text(0, 100), isDefault: b }, ['name', 'phone', 'detail', 'city']);
const shippingAddress = obj({ name: text(1, 100), phone: text(9, 25), address: text(1, 300), city: text(1, 100), district: text(0, 100) }, ['name', 'phone', 'address', 'city']);
const cart = { ...arr(obj({ productId: id, variantId: id, quantity: { type: 'integer', minimum: 1 } }, ['productId', 'quantity'])), minItems: 1 };
const productInput = obj({ name: text(1, 200), price: money, category: text(), stock: { ...i, maximum: 1000000000 }, salePrice: { ...money, nullable: true }, description: s, images: arr(s), isActive: b, isFlashSale: b }, ['name', 'price', 'category']);
const key = { ...text(8, 120), pattern: '^[a-zA-Z0-9._:-]+$' };
const fact = { reference: { ...text(3, 120), pattern: '^[A-Za-z0-9][A-Za-z0-9._:/-]{2,119}$' }, amount: money, occurredAt: date, evidence: text(5), note: text(10) };
const factRequired = ['reference', 'amount', 'occurredAt', 'evidence', 'note'];
const stock = obj({ stock: { ...i, maximum: 1000000000 }, expectedVersion: { ...i, maximum: 2147483647 }, requestKey: key, reason: text(5) }, ['stock', 'expectedVersion', 'requestKey', 'reason']);
const variant = obj({ sku: text(1,100), name: text(1,200), price: money, salePrice: { ...money, nullable: true }, isActive: b, stock: i, lowStockThreshold: i, requestKey: key }, ['sku','name','price','isActive']);
const orderStatus = en('pending','confirmed','packing','shipping','delivered','cancelled','returned');
const claimStatus = en('requested','approved','rejected','received','resolved');
const ticketStatus = en('open','in_progress','resolved','closed');
const paymentSummary = obj({ expectedAmount: money, allocatedAmount: money, refundedAmount: money, outstandingAmount: money, legacyPayment: b, paid: b });
const schemas = { ...models, PublicUser: user, Message: message, ProductInput: productInput, AddressInput: address, ShippingAddress: shippingAddress,
  Session: obj({ user: ref('PublicUser'), token: { ...s, description: 'JWT access chỉ giữ trong bộ nhớ frontend; không ghi log.' } }, ['user','token']),
  AuthSessionPublic: obj({ id, label:s, createdAt:date, lastSeenAt:date, expiresAt:date, current:b }, ['id','current']),
  PaymentSummary: paymentSummary,
  Quote: obj({ provider:s, subtotal:money, fee:money, total:money, fingerprint:{...s,pattern:'^[a-f0-9]{64}$'}, note:s,
    shops:arr(obj({shopId:id,shopName:s,subtotal:money,fee:money,estimatedDays:s,items:arr(obj({productId:id,variantId:id,quantity:i,price:money,name:s}))})) }, ['subtotal','fee','total','fingerprint','shops']),
  CodSummary: obj({ expectedAmount:money,collectedAmount:money,remittedAmount:money,carrierFee:money,refundedAmount:money,pendingRemittance:money,collectionDifference:{...n,nullable:true},refundableAmount:money,legacyUnverified:b,status:en('awaiting_collection','reconciled','partially_remitted','awaiting_remittance') }),
  Receipt: obj({ ...(models.BankReceipt?.properties || {}), allocation:{...ref('PaymentAllocation'),nullable:true}, allocatedAmount:money,refundedAmount:money,refunds:arr(ref('Refund')),unappliedAmount:money }),
  Claim: obj({ ...(models.ReturnCase?.properties || {}), lines:arr(ref('ReturnLine')),order:ref('Order'),refundedAmount:money }),
  OrderView: obj({ ...(models.Order?.properties || {}), shippingAddress,items:arr(ref('OrderItem')),shop:ref('Shop'),buyer:obj({id,name:s,email:s}),payment:ref('PaymentTransaction'),paymentSummary:ref('PaymentSummary') }),
  ProductView: obj({ ...(models.Product?.properties || {}), variants:arr(ref('ProductVariant')),shop:ref('Shop'),region:ref('Region'),craftVillage:ref('CraftVillage'),reviewSummary:obj({total:i,averageRating:n}) }),
  TicketView: obj({ ...(models.SupportTicket?.properties || {}), messages:page(ref('SupportMessage')) }),
  ConversationView: obj({ ...(models.Conversation?.properties || {}), unreadCount:i,perspective:en('buyer','seller'),buyer:obj({id,name:s,avatar:s}),shop:obj({id,name:s,slug:s,logo:s,status:s}),product:obj({id,name:s,image:s,price:money,salePrice:money,isActive:b}) }),
  ChatMessageView: obj({ ...(models.ChatMessage?.properties || {}), isMine:b,sender:obj({id,name:s,avatar:s}) }),
  SettlementStatement: obj({shop:obj({id,name:s}),policy:ref('SettlementPolicy'),summary:obj({postedGross:money,refunds:money,commission:money,carrierFee:money,available:money,held:money,paid:money}),ledger:page(ref('SellerLedger')),periods:page(ref('SettlementPeriod')),payouts:arr(ref('SellerPayout'))}),
  SettlementDetail: obj({period:ref('SettlementPeriod'),payout:{...ref('SellerPayout'),nullable:true},...page(ref('SellerLedger')).properties}),
};
const definitions = {};
const add = (method, route, response, body, options={}) => { definitions[`${method} ${route}`] = {response,body,status:method==='POST'?201:200,...options}; };
const get = (route,response,query={}) => add('GET',route,response,undefined,{query});
const write = (method,route,response,body,options={}) => add(method,route,response,body,options);
const pag = {page:{type:'integer',minimum:1,default:1},limit:{type:'integer',minimum:1,maximum:100,default:20}};
const orderQuery = {...pag,status:orderStatus,search:text(0,120),from:{...s,format:'date'},to:{...s,format:'date'},sort:en('newest','oldest')};
const productQuery = {...pag,search:s,category:s,sort:en('newest','price_asc','price_desc','sold_desc'),minPrice:money,maxPrice:money};
const ok = {status:200};
write('POST','/api/auth/register',ref('Session'),obj({name:text(1,100),email:{...s,format:'email'},password:{...text(8,72),writeOnly:true,description:'Tối đa 72 byte UTF-8.'}},['name','email','password']));
write('POST','/api/auth/login',ref('Session'),obj({email:s,password:{...s,writeOnly:true}},['email','password']),ok);
write('POST','/api/auth/refresh',ref('Session'),null,ok);
write('POST','/api/auth/logout',message,null,ok);
get('/api/auth/me',user);
write('POST','/api/auth/forgot-password',message,obj({email:{...s,format:'email'}},['email']),ok);
write('POST','/api/auth/reset-password',message,obj({token:s,newPassword:{...text(8,72),writeOnly:true}},['token','newPassword']),ok);
write('POST','/api/auth/verify-email',message,obj({token:s},['token']),ok);
write('POST','/api/auth/request-verification',message,null,ok);
get('/api/auth/sessions',arr(ref('AuthSessionPublic')));
for(const suffix of ['', '/{id}'])write('DELETE',`/api/auth/sessions${suffix}`,message,null);
get('/api/users/profile',user);
write('PUT','/api/users/profile',obj({message:s,user}),obj({name:text(1,100),phone:{...s,nullable:true}},[]));
write('PUT','/api/users/password',message,obj({currentPassword:{...s,writeOnly:true},newPassword:{...text(8,72),writeOnly:true}},['currentPassword','newPassword']));
get('/api/users/addresses',arr(ref('Address')));
write('POST','/api/users/addresses',ref('Address'),address);
write('PUT','/api/users/addresses/{id}',ref('Address'),address);
write('DELETE','/api/users/addresses/{id}',message,null);
get('/api/products',page(ref('ProductView')),productQuery);
get('/api/products/search',page(ref('ProductView')),{...productQuery,q:s});
get('/api/products/recommendations',obj({items:arr(ref('ProductView')),total:i,source:s,strategy:s}),{limit:pag.limit,productId:id,categories:s});
get('/api/products/{id}',ref('ProductView'));
get('/api/seller/products',page(ref('ProductView')),{...pag,search:s,category:s,status:en('all','active','hidden')});
get('/api/seller/products/{id}',ref('ProductView'));
write('POST','/api/seller/products',ref('ProductView'),productInput);
write('PUT','/api/seller/products/{id}',ref('ProductView'),{...productInput,required:[]});
write('PUT','/api/seller/products/{id}/stock',obj({product:ref('ProductView'),change:ref('ProductStockUpdate'),idempotentReplay:b}),stock);
for(const [method,suffix] of [['DELETE',''],['DELETE','/permanent'],['PUT','/restore']])write(method,`/api/seller/products/{id}${suffix}`,method==='PUT'?ref('ProductView'):message,null);
get('/api/seller/products/inventory',obj({summary:obj({total:i,lowStock:i,outOfStock:i}),variants:page(ref('ProductVariant')),movements:page(ref('InventoryMovement'))}),{...pag,movementPage:pag.page,search:s,productId:id});
write('POST','/api/seller/products/{id}/variants',obj({variant:ref('ProductVariant'),idempotentReplay:b}),{...variant,required:[...variant.required,'requestKey']});
write('PUT','/api/seller/products/{id}/variants/{variantId}',obj({variant:ref('ProductVariant'),idempotentReplay:b}),variant);
write('PUT','/api/seller/products/{id}/variants/{variantId}/stock',obj({variant:ref('ProductVariant'),movement:ref('InventoryMovement'),idempotentReplay:b}),obj({kind:en('receipt','adjustment'),quantity:i,expectedVersion:i,reason:text(5),requestKey:key},['kind','quantity','expectedVersion','reason','requestKey']));
write('POST','/api/orders',obj({orders:arr(ref('OrderView')),idempotentReplay:b,checkoutKey:s}),obj({items:cart,shippingAddress,paymentMethod:en('cod','bank_transfer'),quoteFingerprint:{...s,pattern:'^[a-f0-9]{64}$'},note:s},['items','shippingAddress','quoteFingerprint']),{statuses:[200,201]});
get('/api/orders',page(ref('OrderView')),orderQuery);get('/api/orders/{id}',ref('OrderView'));
write('PUT','/api/orders/{id}/cancel',message,null);
get('/api/seller/orders',page(ref('OrderView')),orderQuery);
get('/api/seller/orders/stats',obj({totalOrders:i,pendingOrders:i,revenue:money,recognizedRevenue:money,ordersByStatus:obj(Object.fromEntries(orderStatus.enum.map(k=>[k,i])))}),{from:{...s,format:'date'},to:{...s,format:'date'}});
for(const action of ['confirm','pack','ship','tracking','deliver'])write('PUT',`/api/seller/orders/{id}/${action}`,ref('OrderView'),['confirm','pack'].includes(action)?null:obj({carrier:s,trackingCode:s,currentLocation:s,note:s,estimatedDeliveryAt:date},action==='ship'?['carrier','trackingCode']:action==='tracking'?['currentLocation']:[]));
const shopInput=obj({name:s,description:s,logo:s,banner:s,location:s},['name']);
write('POST','/api/shops/register',ref('Shop'),shopInput);
get('/api/shops/me',ref('Shop'));write('PUT','/api/shops/me',ref('Shop'),{...shopInput,required:[]});
get('/api/shops/{slug}',ref('Shop'));get('/api/shops/{slug}/products',page(ref('ProductView')),{...pag,search:s,category:s});
get('/api/admin/stats',obj({totalUsers:i,totalShops:i,totalProducts:i,totalOrders:i,revenue:money,recognizedRevenue:money}));
get('/api/admin/shops',page(ref('Shop')),{...pag,status:en('pending','active','suspended'),search:s});
for(const action of ['approve','suspend'])write('PUT',`/api/admin/shops/{id}/${action}`,ref('Shop'),obj({reason:text(5)},['reason']));
get('/api/admin/users',page(obj({...user.properties,isActive:b})),{...pag,role:user.properties.role,status:en('active','inactive'),search:s});
write('PUT','/api/admin/users/{id}/status',obj({...user.properties,isActive:b}),obj({isActive:b},['isActive']));
get('/api/admin/orders',page(ref('OrderView')),{...pag,status:orderStatus});
write('PUT','/api/admin/orders/{id}/status',ref('OrderView'),obj({status:orderStatus},['status']));
write('PUT','/api/admin/orders/{id}/payment',null,obj({status:en('paid','unpaid')},['status']),{statuses:[],note:'Endpoint cũ luôn trả 409 PAYMENT_RECEIPT_REQUIRED hoặc REFUND_LEDGER_REQUIRED; dùng sổ chứng từ.'});
write('POST','/api/assistant/chat',obj({intent:s,message:s,products:arr(ref('ProductView')),suggestions:arr(s)}),obj({message:text(1,300)},['message']),ok);
write('POST','/api/conversations',ref('ConversationView'),obj({shopId:id,productId:id},['shopId']),{statuses:[200,201]});
get('/api/conversations',arr(ref('ConversationView')));
get('/api/conversations/{id}/messages',arr(ref('ChatMessageView')));
write('POST','/api/conversations/{id}/messages',ref('ChatMessageView'),obj({body:text(1,2000)},['body']));
write('PUT','/api/conversations/{id}/read',obj({updated:i}),null);
get('/api/culture/regions',obj({items:arr(ref('Region')),total:i}));
get('/api/culture/regions/{slug}',obj({...models.Region?.properties,villages:arr(ref('CraftVillage')),products:arr(ref('ProductView'))}));
get('/api/culture/products',obj({items:arr(ref('ProductView')),total:i,villages:arr(ref('CraftVillage')),query:obj({craftVillageId:id,lat:n,lng:n,radius:n})}),{craftVillageId:id,villageId:id,lat:n,lng:n,radius:n,limit:pag.limit});
const qr=obj({orderId:id,shopName:s,paymentStatus:s,paymentExpiresAt:{...date,nullable:true},qrDataURL:s,qrCode:s,bankBin:s,accountNo:s,accountName:s,amount:money,addInfo:s,provider:s});
write('POST','/api/payment/vietqr',qr,obj({orderId:id},['orderId']),ok);
write('POST','/api/payment/vietqr/{orderId}',qr,null,ok);
get('/api/shipping/estimate',ref('Quote'),{city:s,items:{...s,description:'Chuỗi JSON mảng {productId, variantId?, quantity}.'}});
write('POST','/api/shipping/estimate',ref('Quote'),obj({city:s,items:cart},['city','items']),ok);
write('POST','/api/uploads/image',obj({url:s,filename:s,mimeType:s,size:i}),obj({image:{type:'string',format:'binary'}},['image']),{mediaType:'multipart/form-data',note:'Ảnh JPEG/PNG/WebP; server kiểm chữ ký tệp, MIME và giới hạn kích thước.'});
get('/health',obj({status:s,database:s,schema:s}));
get('/api/products/{productId}/reviews',page(ref('Review')),pag);
get('/api/orders/{orderId}/reviews',arr(ref('Review')));
write('POST','/api/orders/{orderId}/reviews',ref('Review'),obj({productId:id,rating:{type:'integer',minimum:1,maximum:5},comment:s},['productId','rating']));
get('/api/admin/payments/receipts',page(ref('Receipt')),{...pag,status:s,search:s});
get('/api/admin/payments/receipts/{id}',ref('Receipt'));
write('POST','/api/admin/payments/receipts',obj({receipt:ref('Receipt'),idempotentReplay:b}),obj({reference:fact.reference,amount:money,receivedAt:date,transferContent:text(0,500),evidence:text(5),orderId:id},['reference','amount','receivedAt','transferContent','evidence']),{statuses:[200,201]});
write('POST','/api/admin/payments/receipts/{id}/allocate',obj({receipt:ref('Receipt'),allocated:b,idempotentReplay:b,reason:s}),obj({orderId:id,note:text(10),verifyLegacy:b},['orderId','note']),ok);
get('/api/admin/payments/orders/{id}',obj({order:ref('OrderView'),summary:paymentSummary}));
write('POST','/api/admin/payments/expire',obj({expired:i}),null,ok);
const claimQuery={...pag,status:claimStatus,orderId:id};
get('/api/after-sales',page(ref('Claim')),claimQuery);
write('POST','/api/after-sales/orders/{id}',obj({claim:ref('Claim'),idempotentReplay:b}),obj({kind:en('return_refund','exchange','complaint'),requestKey:key,reason:text(10,2000),evidence:{...arr(text(5)),minItems:1,maxItems:5},lines:{...arr(obj({orderItemId:id,quantity:{type:'integer',minimum:1,maximum:100000}},['orderItemId','quantity'])),minItems:1,maxItems:100},requestedAmount:money},['kind','requestKey','reason','evidence','lines']),{statuses:[200,201]});
for(const role of ['seller','admin']){
  get(`/api/${role}/after-sales`,page(ref('Claim')),claimQuery);
  write('PUT',`/api/${role}/after-sales/{id}`,obj({claim:ref('Claim')}),obj({action:en('approve','reject','receive','resolve'),note:text(10),approvedAmount:money,lines:arr(obj({orderItemId:id,receivedQuantity:i,restockQuantity:i})),carrier:text(2,100),trackingCode:text(3,120)},['action','note']));
  get(`/api/${role}/after-sales/cod`,page(obj({id,deliveryStatus:orderStatus,carrier:s,trackingCode:s,deliveredAt:date,...schemas.CodSummary.properties})),{...pag,orderId:id});
}
write('POST','/api/admin/after-sales/cod/{id}',obj({entry:ref('CodEntry'),summary:ref('CodSummary'),idempotentReplay:b}),obj({...fact,kind:en('collection','remittance'),fee:money,carrier:s,trackingCode:s},[...factRequired,'kind']),{statuses:[200,201]});
get('/api/admin/after-sales/finance/{id}',obj({id,status:orderStatus,paymentStatus:s,paymentMethod:s,carrier:s,trackingCode:s,sources:arr(obj({receiptId:id,reference:s,allocatedAmount:money,refundableAmount:money})),refunds:arr(ref('Refund')),cod:{...ref('CodSummary'),nullable:true}}));
write('POST','/api/admin/after-sales/refunds',obj({refund:ref('Refund'),idempotentReplay:b}),obj({...fact,source:en('receipt_excess','bank_order','cod_order'),receiptId:id,orderId:id,caseId:id},[...factRequired,'source']),{statuses:[200,201],note:'receiptId bắt buộc trừ cod_order; orderId bắt buộc trừ receipt_excess. Không vượt số có thể hoàn.'});
get('/api/seller/settlements',ref('SettlementStatement'),{...pag,ledgerPage:pag.page,periodPage:pag.page});
get('/api/seller/settlements/periods/{id}',ref('SettlementDetail'),pag);
get('/api/admin/settlements/shops',page(obj({id,name:s,status:s})),{...pag,search:s});
get('/api/admin/settlements/shops/{id}',ref('SettlementStatement'),{...pag,ledgerPage:pag.page,periodPage:pag.page});
get('/api/admin/settlements/periods/{id}',ref('SettlementDetail'),pag);
write('POST','/api/admin/settlements/shops/{id}/policy',obj({policy:ref('SettlementPolicy'),idempotentReplay:b}),obj({commissionBps:{...i,maximum:10000},note:text(10)},['commissionBps','note']),{statuses:[200,201]});
write('POST','/api/admin/settlements/shops/{id}/sync',obj({skipped:obj({unverified:i,undelivered:i})}),null,ok);
write('POST','/api/admin/settlements/shops/{id}/periods',obj({period:ref('SettlementPeriod'),idempotentReplay:b}),obj({requestKey:key,cutoffAt:date,note:text(10)},['requestKey','cutoffAt','note']),{statuses:[200,201]});
write('POST','/api/admin/settlements/shops/{id}/adjustments',obj({entry:ref('SellerLedger'),idempotentReplay:b}),obj({...fact,direction:en('credit','debit'),orderId:id},[...factRequired,'direction','orderId']),{statuses:[200,201]});
write('POST','/api/admin/settlements/periods/{id}/cancel',obj({period:ref('SettlementPeriod'),idempotentReplay:b}),obj({note:text(10)},['note']),ok);
write('POST','/api/admin/settlements/periods/{id}/payout',obj({period:ref('SettlementPeriod'),payout:ref('SellerPayout'),idempotentReplay:b}),obj({...fact,beneficiary:text(5,200)},[...factRequired,'beneficiary']),{statuses:[200,201]});
for(const prefix of ['/api/support','/api/admin/operations/support']){
 get(prefix,page(ref('SupportTicket')),{...pag,status:ticketStatus,...(prefix.includes('admin')?{assignedTo:id}:{})});
 get(`${prefix}/{id}`,ref('TicketView'),pag);
 write('POST',`${prefix}/{id}/messages`,ref('SupportMessage'),obj({message:text(1,2000)},['message']));
}
write('POST','/api/support',ref('SupportTicket'),obj({subject:text(5,200),message:text(10,2000),orderId:id},['subject','message']));
write('PATCH','/api/admin/operations/support/{id}',ref('SupportTicket'),obj({status:ticketStatus,assignedTo:{...id,nullable:true},reason:text(5)},['reason']),{note:'Ít nhất status hoặc assignedTo; trạng thái đang xử lý/đã giải quyết phải có admin phụ trách.'});
get('/api/notifications',page(ref('Notification')),pag);
write('PATCH','/api/notifications/{id}/read',message,null);
get('/api/admin/operations/notifications',page(ref('Notification')),{...pag,state:en('pending','failed','sent','expired')});
write('POST','/api/admin/operations/notifications/{id}/retry',message,null);
get('/api/admin/operations/audit',page(ref('AuditEvent')),{...pag,resourceType:s,resourceId:id});
get('/api/admin/operations/moderation',page(ref('ModerationAction')),pag);
get('/api/admin/operations/content/{type}',page({oneOf:[ref('Shop'),ref('Product'),ref('Review')]}),pag);
write('POST','/api/admin/operations/content/{type}/{id}/moderate',ref('ModerationAction'),obj({action:en('approve','hide'),reason:text(5)},['action','reason']));
// Explicit serializer projections, checked against service return statements.
schemas.PaymentSummary.properties.transferReference=s;
schemas.PaymentSummary.properties.cod=ref('CodSummary');
delete schemas.PaymentSummary.properties.paid;
schemas.ProductView.properties.craftVillage={...ref('CraftVillage'),nullable:true};
schemas.ProductView.properties.region={...ref('Region'),nullable:true};
schemas.ProductView.properties.reviews=arr(obj({id,rating:n,comment:{...s,nullable:true},images:arr(s),createdAt:date,user:obj({id,name:s,avatar:{...s,nullable:true}})}));
schemas.Quote.properties.shops.items.properties.etaDays=i;
delete schemas.Quote.properties.shops.items.properties.estimatedDays;
schemas.SettlementStatement.properties.summary=obj(Object.fromEntries(['ledgerAmount','paidAmount','outstanding','available','carryDebt','heldAmount','reserved'].map(k=>[k,n])));
delete schemas.SettlementStatement.properties.payouts;
schemas.Notification.properties.lastError={...s,nullable:true,description:'Mã lỗi gửi đã giới hạn; không có nội dung exception hoặc payload email.'};
definitions['POST /api/orders'].response=obj({orders:arr(ref('OrderView')),idempotencyKey:s,idempotentReplay:b},['orders','idempotencyKey','idempotentReplay']);
definitions['PUT /api/seller/products/{id}/restore'].response=obj({message:s,product:ref('ProductView')},['message','product']);
Object.assign(variant.properties,{color:text(0,100),size:text(0,100),material:text(0,100),image:text(0,2000)});
definitions['GET /api/seller/products/inventory'].query={...pag,movementPage:pag.page,sku:s,lowStock:en('true','false'),variantId:id,from:{...s,format:'date'},to:{...s,format:'date'}};
definitions['GET /api/seller/products/inventory'].response.properties.summary=obj({skuCount:i,available:money,held:money,lowStock:i,mismatches:i});
definitions['GET /api/culture/products'].query={craftVillageId:id,villageId:id,lat:{...n,minimum:-90,maximum:90},lng:{...n,minimum:-180,maximum:180},radiusKm:{...n,exclusiveMinimum:true,minimum:0,maximum:500,default:80},limit:pag.limit};
definitions['GET /api/culture/products'].response.properties.query=obj({craftVillageId:id,lat:n,lng:n,radiusKm:n});
definitions['POST /api/assistant/chat'].response=obj({intent:s,reply:s,products:arr(ref('ProductView')),suggestions:arr(s),actions:arr(obj({label:s,href:s}))});
for(const role of ['seller','admin'])definitions[`PUT /api/${role}/after-sales/{id}`].body.properties.lines=arr(obj({orderItemId:id,restock:b},['orderItemId','restock']));
definitions['GET /api/admin/payments/receipts'].query={...pag,reviewOnly:en('true','false')};
definitions['GET /api/admin/payments/orders/{id}'].response=obj({id,status:orderStatus,paymentStatus:s,paymentMethod:s,paymentExpiresAt:date,expiredAt:date,...schemas.PaymentSummary.properties});
qr.properties.bank=obj({accountNo:s,accountName:s,acqId:s});
for(const name of ['bankBin','accountNo','accountName','provider'])delete qr.properties[name];
definitions['POST /api/uploads/image'].response=obj({provider:en('local','cloudinary'),url:s,filename:s,mimetype:en('image/jpeg','image/png','image/webp'),size:i,publicId:s,width:i,height:i},['provider','url','filename','mimetype','size']);
definitions['POST /api/uploads/image'].note+=' Tối đa 5 MiB.';
definitions['GET /health'].response=obj({status:{...s,enum:['ok']},database:{...s,enum:['connected']},schema:{...s,enum:['ready']},tables:i},['status','database','schema','tables']);
const revenue=obj(Object.fromEntries(['gross','unpostedGross','settledOrders','pipelineGross','awaitingPayment','postedGross','refunds','commission','carrierFee','adjustments','net','ledgerAmount','paidAmount','available','carryDebt','heldAmount','reserved','outstanding'].map(k=>[k,n])));
const productSummary=obj({total:i,active:i,hidden:i,lowStock:i});
const orderCounts=obj(Object.fromEntries(orderStatus.enum.map(k=>[k,i])));
definitions['GET /api/admin/stats'].response=obj({users:obj({total:i,active:i,inactive:i,byRole:obj({buyer:i,seller:i,admin:i})}),shops:obj({total:i,pending:i,byStatus:obj({active:i,pending:i,suspended:i})}),products:productSummary,orders:obj({total:i,byStatus:orderCounts}),revenue:obj({...revenue.properties,gmv:n,pipelineValue:n})});
definitions['GET /api/seller/orders/stats'].response=obj({shop:obj({id,name:s,slug:s,status:s}),orders:obj({total:i,...orderCounts.properties,byStatus:orderCounts}),products:obj({...productSummary.properties,topSelling:arr(ref('ProductView'))}),revenue,recentOrders:arr(ref('OrderView'))});
definitions['GET /api/seller/orders/stats'].query={};
definitions['GET /api/products/{productId}/reviews'].query={page:pag.page,limit:{type:'integer',minimum:1,maximum:20,default:5}};
definitions['GET /api/products/{productId}/reviews'].response.properties.averageRating=n;
definitions['POST /api/orders/{orderId}/reviews'].body.properties.comment=text(0,2000);
module.exports={schemas,definitions,obj,s,id,ref};
