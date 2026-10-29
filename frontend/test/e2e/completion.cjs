const assert = require('node:assert/strict');
const { randomUUID: uuid } = require('node:crypto');
const { validateResponse } = require('../../../backend/test/openapi-validator.cjs');

exports.verifyCompletion = async ({page,context,database,apiUrl,accounts,shopId,bearer,goto,screenshot,passed}) => {
  const read = async (route, pattern = route, expected = 200, headers = {}) => {
    const response = await context.request.get(apiUrl + route, {headers});
    assert.equal(response.status(), expected, pattern);
    const body = await response.json();
    validateResponse('GET', pattern, expected, body);
    return body;
  };
  const products = [uuid(),uuid(),uuid()];
  for (const [index,id] of products.entries()) await database.query(
    'INSERT INTO products (id,"shopId",name,price,category,stock,"dataSource") VALUES ($1,$2,$3,150000,$4,5,$5)',
    [id,shopId,`Completion ceramic ${index}`,'Gốm sứ','demo']);
  const hiddenIds = [], visibleIds = [], orders = [];
  for(let index=0;index<5;index++) {
    const orderId=uuid(),reviewId=uuid(); orders.push(orderId);
    await database.query('INSERT INTO orders (id,"buyerId","shopId",total,status) VALUES ($1,$2,$3,150000,$4)',[orderId,accounts.buyer.id,shopId,'delivered']);
    const hidden=index===0||index===4;
    await database.query('INSERT INTO reviews (id,"productId","userId","orderId",rating,comment,images,"moderationHidden","createdAt") VALUES ($1,$2,$3,$4,5,$5,$6,$7,$8)',
      [reviewId,products[index===4?1:0],accounts.buyer.id,orderId,hidden?'HIDDEN_REVIEW_SENTINEL':`Visible review ${index}`,hidden?['/HIDDEN_IMAGE_SENTINEL']:[],hidden,new Date(Date.UTC(2026,9,25,0,0,5-index))]);
    (hidden?hiddenIds:visibleIds).push(reviewId);
  }
  const mixed=await read(`/api/products/${products[0]}`,'/api/products/{id}');
  assert.deepEqual(mixed.reviews.map(r=>r.id),visibleIds);
  assert.equal(mixed.reviewSummary.total,3);
  assert.ok(!JSON.stringify(mixed).includes('HIDDEN_'));
  passed('US09/33 real PostgreSQL: three visible reviews returned in order; newer hidden text/images omitted');
  for(const id of products.slice(1)) {
    const body=await read(`/api/products/${id}`,'/api/products/{id}');
    assert.deepEqual(body.reviews,[]); assert.equal(body.reviewSummary.total,0); assert.equal(body.reviewSummary.averageRating,0);
  }
  const listing=await read(`/api/products/${products[0]}/reviews`,'/api/products/{productId}/reviews');
  assert.equal(listing.total,3); assert.ok(!JSON.stringify(listing).includes('HIDDEN_'));
  passed('US09/17/33 all-hidden and zero-review products remain public; separate review API agrees');
  const headers={Authorization:`Bearer ${await bearer(accounts.buyer)}`};
  const ownerReviews=await read(`/api/orders/${orders[0]}/reviews`,'/api/orders/{orderId}/reviews',200,headers);
  assert.equal(ownerReviews[0].id,hiddenIds[0]);
  const otherHeaders={Authorization:`Bearer ${await bearer(accounts.other)}`};
  await read(`/api/orders/${orders[0]}/reviews`,'/api/orders/{orderId}/reviews',404,otherHeaders);
  passed('US17 owner retains own hidden-review history; another buyer receives 404');
  const adminHeaders={Authorization:`Bearer ${await bearer(accounts.admin)}`};
  const moderationRoute=`/api/admin/operations/content/review/${hiddenIds[0]}/moderate`;
  for(const [action,total] of [['approve',4],['hide',3]]) {
    const response=await context.request.post(apiUrl+moderationRoute,{headers:adminHeaders,data:{action,reason:'Synthetic moderation regression'}});
    assert.equal(response.status(),201);
    validateResponse('POST','/api/admin/operations/content/{type}/{id}/moderate',201,await response.json());
    const body=await read(`/api/products/${products[0]}`,'/api/products/{id}');
    assert.equal(body.reviewSummary.total,total);
    assert.equal(body.reviews.some(r=>r.id===hiddenIds[0]),action==='approve');
  }
  const denied=await context.request.post(apiUrl+moderationRoute,{headers,data:{action:'approve',reason:'Synthetic unauthorized request'}});
  assert.equal(denied.status(),403);
  passed('US33 admin approve/hide affects public detail immediately; buyer cannot moderate');
  for(const [sql,value] of [['"isActive"',false],['"moderationHidden"',true]]) {
    await database.query(`UPDATE products SET ${sql}=$2 WHERE id=$1`,[products[0],value]);
    await read(`/api/products/${products[0]}`,'/api/products/{id}',404);
    await database.query(`UPDATE products SET ${sql}=$2 WHERE id=$1`,[products[0],!value]);
  }
  await database.query('UPDATE shops SET status=$2 WHERE id=$1',[shopId,'suspended']);
  await read(`/api/products/${products[0]}`,'/api/products/{id}',404);
  await database.query('UPDATE shops SET status=$2 WHERE id=$1',[shopId,'active']);
  passed('US09/33 inactive/hidden products and suspended shops stay unavailable');
  const profile=await context.request.put(apiUrl+'/api/users/profile',{headers,data:{name:'Updated fixture',phone:'090 000 0000',role:'admin',id:accounts.other.id}});
  assert.equal(profile.status(),200);
  const updated=await profile.json();validateResponse('PUT','/api/users/profile',200,updated);
  assert.deepEqual(Object.keys(updated.user).sort(),['id','name','email','phone','avatar','role','emailVerifiedAt'].sort());
  assert.equal(updated.user.id,accounts.buyer.id);assert.equal(updated.user.role,'buyer');
  const persisted=await database.query('SELECT name,role,phone FROM users WHERE id=$1',[accounts.buyer.id]);
  assert.deepEqual(persisted.rows[0],{name:'Updated fixture',role:'buyer',phone:'0900000000'});
  for(const data of [{name:' '},{phone:'invalid'},{}]) {
    const response=await context.request.put(apiUrl+'/api/users/profile',{headers,data});
    assert.equal(response.status(),400);validateResponse('PUT','/api/users/profile',400,await response.json());
  }
  await read('/api/users/profile','/api/users/profile',401);
  passed('US05 HTTP profile projection, validation and authority isolation match persisted PostgreSQL rows');
  await read('/api/products'); await read('/api/culture/regions');
  await goto('/');
  await page.locator('.booking-product-card').first().waitFor();
  await page.getByRole('button',{name:'Quà nhỏ',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Quà nhỏ',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByText('Chưa có gợi ý trong khoảng giá này.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Xem đầy đủ theo ngân sách',exact:true}).click();
  await page.waitForURL('**/products?maxPrice=100000');
  passed('Quick-plan budget selection reaches the filtered catalog in two clicks, with a clear empty state');
  await goto('/');
  const shopLink=page.locator('section').filter({has:page.locator('#home-shops')}).locator('.booking-category');
  // Use the actual route contract, not a guessed plural /shops path.
  assert.equal(await shopLink.getAttribute('href'),`/shop/e2e-${shopId}`);
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await screenshot(`home-completion-${width}.png`);
  }
  passed('Current homepage renders real API products without horizontal overflow at 1440/768/390/320px');
};
