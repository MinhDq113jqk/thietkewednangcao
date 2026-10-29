const assert = require('node:assert/strict');
const { test } = require('node:test');
const nodemailer = require('nodemailer');

test('The patched Nodemailer supports the existing welcome-email contract without sending mail', async () => {
  const originalCreate = nodemailer.createTransport;
  const keys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const originalEnv = new Map(keys.map((key) => [key, process.env[key]]));
  nodemailer.createTransport = () => originalCreate({ jsonTransport: true });
  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_USER = 'sender@example.test';
  process.env.SMTP_PASS = 'synthetic-test-password';
  process.env.SMTP_FROM = 'sender@example.test';
  try {
    const { sendWelcomeEmail } = require('../src/services/email.service');
    const info = await sendWelcomeEmail({
      name: 'Synthetic Buyer',
      email: 'buyer@example.test',
    });
    const message = JSON.parse(info.message);
    assert.equal(message.to[0].address, 'buyer@example.test');
    assert.ok(message.subject);
    assert.ok(message.text.includes('Synthetic Buyer'));
    assert.ok(message.html.includes('Synthetic Buyer'));
  } finally {
    nodemailer.createTransport = originalCreate;
    for (const key of keys) {
      if (originalEnv.get(key) === undefined) delete process.env[key];
      else process.env[key] = originalEnv.get(key);
    }
  }
});
