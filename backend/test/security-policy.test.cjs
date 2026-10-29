const assert = require('node:assert/strict');
const { test } = require('node:test');
const policy = require('../src/common/middleware/authRequestPolicy');
const { createCorsOptions, createAllowedOrigins } = require('../src/config/cors');
const { readRefreshToken, setRefreshCookie, publicUser } = require('../src/utils/authTokens');
const { formatErrorPayload } = require('../src/common/middleware/errorResponse');

test('Production CORS is explicit and rejects local/default/null origins', () => {
  const env = { NODE_ENV:'production', CLIENT_URL:'https://shop.example', CORS_ORIGINS:'https://admin.example' };
  assert.deepEqual([...createAllowedOrigins(env)], ['https://shop.example','https://admin.example']);
  for(const origin of ['http://localhost:5173','null','https://shop.example.attacker.test']) createCorsOptions(env).origin(origin, error => assert.equal(error.status,403));
});
test('Cookie mutation policy accepts trusted origin, rejects cross-site and disables caching', () => {
  const run = (headers, method='POST') => {
    const state = {};
    policy({NODE_ENV:'production', CLIENT_URL:'https://shop.example'})({headers,method}, {
      setHeader:(key,value)=>state[key]=value, status:code=>{state.status=code;return {json:()=>state};},
    },()=>state.next=true);
    return state;
  };
  assert.equal(run({origin:'https://shop.example'}) .next,true);
  assert.equal(run({origin:'https://evil.example'}).status,403);
  assert.equal(run({origin:'null'}).status,403);
  assert.equal(run({'sec-fetch-site':'cross-site'}).status,403);
  assert.equal(run({}).next,true);
  assert.equal(run({},'GET')['Cache-Control'],'no-store');
});
test('Malformed cookies do not throw or read prototype properties', () => {
  assert.equal(readRefreshToken({headers:{cookie:'unrelated=%ZZ; souvenir_refresh=%ZZ'}}),null);
  assert.equal(readRefreshToken({headers:{cookie:'__proto__=x; souvenir_refresh=synthetic'}}),'synthetic');
});
test('Production refresh cookies are HttpOnly Secure SameSite and scoped', () => {
  const previous=process.env.NODE_ENV; process.env.NODE_ENV='production';
  try {let cookie;setRefreshCookie({setHeader:(_key,value)=>cookie=value},'synthetic');
    for(const attribute of ['HttpOnly','Secure','SameSite=','Path=/api/auth']) assert.ok(cookie.includes(attribute));
  } finally {if(previous===undefined) delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
test('Public user projection and server errors omit private data', () => {
  assert.equal(publicUser({id:'fixture',password:'private',refreshToken:'private'}).password,undefined);
  const result=formatErrorPayload({req:{method:'GET',originalUrl:'/api/example?token=private'},statusCode:500,body:{message:'SQL private',code:'private',details:'private'}});
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.equal(result.error.path,'/api/example');
});
