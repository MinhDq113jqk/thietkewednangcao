const assert=require('node:assert/strict');const {test}=require('node:test');
test('OpenAPI includes every contract route with matching security, roles and path parameters',()=>{
  const spec=require('../../docs/api/openapi.json'),contract=require('./api-contract.json');
  assert.equal(spec.openapi,'3.0.3');assert.equal(Object.values(spec.paths).reduce((n,p)=>n+Object.keys(p).length,0),contract.length);
  for(const row of contract){const url='/'+row.path.replace(/:(\w+)/g,'{$1}');const op=spec.paths[url][row.method.toLowerCase()];assert.ok(op);assert.deepEqual(op['x-roles'],row.roles);
    if(row.auth)assert.deepEqual(op.security,[{bearerAuth:[]}]);
    for(const [,name] of url.matchAll(/\{(\w+)\}/g))assert.ok(op.parameters.some(p=>p.name===name&&p.required&&p.in==='path'));
  }
});
test('Every documented request/response example validates against its OpenAPI schema',()=>{
  const {validate,spec}=require('./openapi-validator.cjs');
  for(const [path,methods] of Object.entries(spec.paths))for(const [method,op] of Object.entries(methods)){
    for(const media of Object.values(op.requestBody?.content||{}))validate(media.schema,media.example,`${method} ${path} request`);
    for(const [status,response] of Object.entries(op.responses))for(const media of Object.values(response.content||{}))validate(media.schema,media.example,`${method} ${path} ${status}`);
  }
});
