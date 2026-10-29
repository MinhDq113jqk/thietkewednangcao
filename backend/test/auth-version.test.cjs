const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
require('reflect-metadata');
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/auth_contract_test';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url');
process.env.JWT_REFRESH_SECRET = crypto.randomBytes(48).toString('base64url');
const { signAccessToken, signRefreshToken } = require('../dist/utils/authTokens');
const { AuthGuard, OptionalAuthGuard } = require('../dist/common/guards/auth.guard');
after(async () => require('../dist/database/connection').sequelize.close());

test('both access guards reject revoked, legacy-revoked and malformed versions', async () => {
  const user = { id: crypto.randomUUID(), isActive: true, authVersion: 1 };
  const models = { User: { findByPk: async () => user } };
  const required = new AuthGuard(models);
  const optional = new OptionalAuthGuard(models);
  const check = async (claims, accepted) => {
    const token = jwt.sign({ id: user.id, ...claims }, process.env.JWT_SECRET);
    const request = { headers: { authorization: `Bearer ${token}` } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) };
    if (accepted) assert.equal(await required.canActivate(context), true);
    else await assert.rejects(required.canActivate(context), { status: 401 });
    delete request.user;
    assert.equal(await optional.canActivate(context), true);
    assert.equal(Boolean(request.user), accepted);
  };
  for (const claims of [{}, { authVersion: 0 }, { authVersion: '1' }, { authVersion: null },
    { authVersion: -1 }, { authVersion: 1.5 }, { authVersion: [] }]) await check(claims, false);
  await check({ authVersion: 1 }, true);
  user.authVersion = 0;
  await check({}, true);
  await check({ authVersion: 0 }, true);
});

test('new tokens carry the version and each refresh rotation is unique', () => {
  const id = crypto.randomUUID();
  const access = jwt.verify(signAccessToken(id, 3), process.env.JWT_SECRET);
  const first = signRefreshToken(id, 3);
  const second = signRefreshToken(id, 3);
  const refresh = jwt.verify(first, process.env.JWT_REFRESH_SECRET);
  assert.equal(access.authVersion, 3);
  assert.equal(refresh.authVersion, 3);
  assert.equal(refresh.type, 'refresh');
  assert.ok(refresh.jti);
  assert.ok(first !== second, 'rotation must invalidate same-second refresh tokens');
});
