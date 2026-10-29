const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { sequelize } = require('../database/connection');
const { Notification, User } = require('../models');
const { dispatchNotifications } = require('../services/notification.service');
async function run() {
  const [database] = await sequelize.query('SELECT current_database() AS name');
  assert.match(database[0].name, /^souvenirshop_verify_[a-z0-9_]+$/);
  const user = await User.create({ name:'Synthetic dispatch fixture',email:`${crypto.randomUUID()}@example.test`,password:'not-a-login-hash' });
  const create=(values={})=>Notification.create({ userId:user.id,title:'Dispatch fixture',body:'Synthetic notification',href:'/profile',nextAttemptAt:new Date('2000-01-01'),...values });
  const rows=await Promise.all([create(),create()]);
  const delivered=[];
  const deliver=async mail=>{ delivered.push(mail.messageId); await new Promise(resolve=>setTimeout(resolve,25)); return { accepted:true }; };
  await Promise.all([1,2].map(()=>dispatchNotifications({configured:true,deliver,batchSize:1})));
  assert.equal(delivered.length,2); assert.equal(new Set(delivered).size,2);
  for(const row of rows) { await row.reload(); assert.equal(row.state,'sent'); assert.equal(row.attempts,1); }
  const failed=await create({nextAttemptAt:new Date('1990-01-01')});
  await dispatchNotifications({configured:true,deliver:async()=>{throw new Error('synthetic-private-error-do-not-persist');},batchSize:1});
  await failed.reload(); assert.equal(failed.state,'pending'); assert.equal(failed.attempts,1); assert.equal(failed.lastError,'DELIVERY_FAILED');
  assert.ok(failed.nextAttemptAt > new Date());
  await failed.update({attempts:4,nextAttemptAt:new Date('1990-01-01')});
  await dispatchNotifications({configured:true,deliver:async()=>{throw new Error('synthetic');},batchSize:1});
  await failed.reload(); assert.equal(failed.state,'failed'); assert.equal(failed.attempts,5);
  const pending=await create();
  assert.equal(await dispatchNotifications({configured:false,batchSize:1}),0);
  await pending.reload(); assert.equal(pending.attempts,0); assert.equal(pending.state,'pending');
  console.log('PASS Concurrent outbox workers skip locked messages, retry with backoff, stop after five failures and retain mail without SMTP');
}
run().catch(()=>{console.error('Notification dispatch verification failed');process.exitCode=1;}).finally(()=>sequelize.close());
