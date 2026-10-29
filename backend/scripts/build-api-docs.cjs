const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript');
const {schemas,definitions,obj,s,id,ref}=require('./api-schemas.cjs');
const root=path.resolve(__dirname,'../src/modules'),out=path.resolve(__dirname,'../../docs/api');
const contract=require('../test/api-contract.json');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const sources=new Map();
for(const file of walk(root).filter(f=>f.endsWith('.controller.ts'))){
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const decorators=node=>ts.canHaveDecorators(node)?(ts.getDecorators(node)||[]).filter(d=>ts.isCallExpression(d.expression)).map(d=>({name:d.expression.expression.getText(ast),value:d.expression.arguments[0]?.text||''})):[];
 for(const klass of ast.statements.filter(ts.isClassDeclaration)){
  const prefix=decorators(klass).find(d=>d.name==='Controller')?.value;if(!prefix)continue;
  for(const member of klass.members.filter(ts.isMethodDeclaration)){
   const d=decorators(member).find(v=>['Get','Post','Put','Patch','Delete'].includes(v.name));if(!d)continue;
   const url='/'+[prefix,d.value].filter(Boolean).join('/').replace(/:(\w+)/g,'{$1}');
   sources.set(d.name.toUpperCase()+' '+url,{file:path.relative(path.resolve(__dirname,'../..'),file).replaceAll('\\','/'),handler:member.name.getText(ast),line:ast.getLineAndCharacterOfPosition(member.getStart(ast)).line+1});
  }
 }
}
schemas.Error=obj({message:s,error:obj({code:s,status:{type:'integer'},method:s,path:s,requestId:s,timestamp:{...s,format:'date-time'},details:{description:'Lỗi theo trường hoặc lý do nghiệp vụ; không chứa stack/SQL/secret.',oneOf:[obj({}),{type:'array',items:s},s]}},['code','status','path','timestamp'])},['message','error']);
const spec={openapi:'3.0.3',info:{title:'SouvenirShop API',version:'1.1.0',description:'122 endpoint NestJS/PostgreSQL. Request/query và response theo controller/service; ví dụ tổng hợp là dữ liệu giả, không phải response ghi từ người dùng. Thuộc tính tùy chọn thể hiện projection/association; schema không thay kiểm tra trạng thái/quyền sở hữu tại server.'},servers:[{url:'http://127.0.0.1:3000',description:'Local development'}],paths:{},components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'},refreshCookie:{type:'apiKey',in:'cookie',name:'souvenir_refresh'}},schemas}};
const example=(schema,depth=0)=>{
 if(depth>12)throw new Error('Recursive example schema');
 if(schema.$ref){const target=schemas[schema.$ref.split('/').pop()];assert.ok(target,'Unknown ref '+schema.$ref);return example(target,depth+1);}
 if(schema.example!==undefined)return schema.example;
 if(schema.enum)return schema.enum[0];
 if(schema.oneOf)return example(schema.oneOf[0],depth);
 if(schema.type==='array')return schema.minItems?[example(schema.items,depth+1)]:[];
 if(schema.type==='object')return Object.fromEntries(Object.entries(schema.properties||{}).map(([name,value])=>[name,/password/i.test(name)?'<PASSWORD_CHOSEN_LOCALLY>':/token/i.test(name)?'<TOKEN_FROM_LOCAL_SESSION>':name==='email'?'student@example.test':name==='phone'?'0900000000':name==='requestKey'?'demo-request-0001':name==='reference'?'DEMO-20261025':name==='sku'?'DEMO-SKU':name==='category'?'Gốm sứ':name==='price'||name==='amount'?150000:name==='city'?'Hà Nội':name==='quoteFingerprint'||name==='fingerprint'?'0'.repeat(64):example(value,depth+1)]));
 if(schema.type==='boolean')return false;
 if(schema.type==='number'||schema.type==='integer')return schema.minimum??0;
 if(schema.format==='uuid')return '00000000-0000-4000-8000-000000000001';
 if(schema.format==='date-time')return '2026-10-25T00:00:00+07:00';
 if(schema.format==='date')return '2026-10-25';
 if(schema.format==='binary')return '<FILE_CHOSEN_LOCALLY>';
 return 'Dữ liệu minh họa';
};
const errorDescriptions={400:'Dữ liệu/định dạng không hợp lệ.',401:'Thiếu hoặc hết hạn phiên.',403:'Sai quyền hoặc Origin bị từ chối.',404:'Không tồn tại hoặc không thuộc người gọi.',409:'Xung đột trạng thái, phiên bản, idempotency hoặc số dư.',413:'Vượt giới hạn payload/tệp.',429:'Vượt giới hạn tần suất.',500:'Lỗi server đã che chi tiết.',503:'Dịch vụ/database chưa sẵn sàng.'};
const errors=Object.fromEntries(Object.entries(errorDescriptions).map(([code,description])=>[code,{description,content:{'application/json':{schema:ref('Error'),example:{message:description,error:{code:'HTTP_'+code,status:Number(code),method:'GET',path:'/api/example',requestId:'demo-request',timestamp:'2026-10-25T00:00:00+07:00'}}}}}]));
for(const row of contract){
 const url='/'+row.path.replace(/:(\w+)/g,'{$1}'),key=row.method+' '+url,source=sources.get(key),d=definitions[key];
 assert.ok(source,'Missing controller '+key);assert.ok(d,'Missing specification '+key);
 const cookie=['/api/auth/refresh','/api/auth/logout'].includes(url);
 const responses={};
 for(const code of d.statuses||[d.status])responses[code]={description:code===201?'Tạo tài nguyên thành công.':'Thành công; idempotentReplay=true nếu trả kết quả đã ghi.',content:{'application/json':{schema:d.response,example:example(d.response)}}};
 Object.assign(responses,errors);
 const op={tags:[row.path.split('/')[1]||'health'],operationId:row.method.toLowerCase()+'_'+row.path.replace(/[^\w]+/g,'_'),summary:source.handler,
 description:'Vai trò: '+(row.roles.length?row.roles.join(', '):row.auth?'người dùng đã đăng nhập':'công khai')+'. '+(row.auth?'Server kiểm quyền sở hữu tài nguyên. ':'')+(cookie?'Cookie HttpOnly; Origin phải thuộc allowlist. ':'')+(row.optionalAuth?'Bearer tùy chọn để cá nhân hóa. ':'')+(d.note||'')+' Nguồn: '+source.file+':'+source.line+'.',
 security:cookie?(url.endsWith('/logout')?[{},{refreshCookie:[]}]:[{refreshCookie:[]}]):row.auth?[{bearerAuth:[]}]:row.optionalAuth?[{},{bearerAuth:[]}]:[],
 parameters:[...url.matchAll(/\{(\w+)\}/g)].map(([,name])=>({name,in:'path',required:true,schema:name==='type'?{...s,enum:['shop','product','review']}:name==='slug'?s:id})),responses,'x-source':source,'x-roles':row.roles,'x-schema-status':'documented'};
 for(const [name,schema] of Object.entries(d.query||{}))op.parameters.push({name,in:'query',required:false,schema});
 if(d.body)op.requestBody={required:true,content:{[d.mediaType||'application/json']:{schema:d.body,example:example(d.body)}}};
 if(url==='/api/orders'&&row.method==='POST')op.parameters.push({name:'Idempotency-Key',in:'header',required:true,schema:{...s,minLength:16,maxLength:128,pattern:'^[A-Za-z0-9:_-]{16,128}$'},description:'Giữ nguyên khi thử lại cùng nội dung. Khóa trùng khác nội dung trả 409.'});
 if(cookie)op.parameters.push({name:'Origin',in:'header',required:true,schema:s,example:'http://127.0.0.1:5173'});
 if(['/api/auth/register','/api/auth/login','/api/auth/refresh','/api/auth/logout'].includes(url))for(const [code,response] of Object.entries(responses))if(Number(code)<300)response.headers={'Set-Cookie':{description:'souvenir_refresh; HttpOnly; Path=/api/auth; SameSite=Lax mặc định; Secure trong production. Logout đặt Max-Age=0.',schema:s}};
 (spec.paths[url]??={})[row.method.toLowerCase()]=op;
}
assert.equal(Object.keys(definitions).length,contract.length,'Unused endpoint definition');
const check=node=>{if(!node||typeof node!=='object')return;if(node.$ref)assert.ok(schemas[node.$ref.split('/').pop()],node.$ref);Object.values(node).forEach(check);};check(spec);
// OpenAPI 3.0 ignores siblings of a Reference Object. Use an explicit null branch.
const nullableRefs=node=>{if(!node||typeof node!=='object')return;if(node.$ref&&node.nullable){const target=node.$ref;delete node.$ref;delete node.nullable;node.oneOf=[{$ref:target},{type:'object',nullable:true,enum:[null]}];}Object.values(node).forEach(nullableRefs);};nullableRefs(spec);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'openapi.json'),JSON.stringify(spec,null,2)+'\n');
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const cards=Object.entries(spec.paths).flatMap(([url,ops])=>Object.entries(ops).map(([method,op])=>'<details class="endpoint"><summary><code>'+method.toUpperCase()+' '+esc(url)+'</code> — '+esc(op.summary)+'</summary><div><p>'+esc(op.description)+'</p><a href="../../'+esc(op['x-source'].file)+'">Controller</a><pre>'+esc(JSON.stringify({security:op.security,parameters:op.parameters,requestBody:op.requestBody,responses:op.responses},null,2))+'</pre></div></details>')).join('');
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SouvenirShop API</title><style>body{font:16px/1.6 system-ui;max-width:1100px;margin:40px auto;padding:0 20px;color:#17243b}input{width:95%;padding:12px}summary{cursor:pointer;padding:12px;background:#eef4ff}details{margin:12px 0;border:1px solid #ccd5df}details>div{padding:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere}code{color:#004a9f}a:focus,summary:focus,input:focus{outline:3px solid #0071c2}</style><h1>SouvenirShop API</h1><p>122 endpoint · OpenAPI 3.0.3 · Mở offline, không gửi request hoặc nhập token.</p><p>'+esc(spec.info.description)+'</p><p><a href="openapi.json">OpenAPI JSON (Swagger/Postman)</a> · <a href="README.md">Hướng dẫn</a> · <a href="#schemas">Schema dùng chung</a></p><label for="filter">Tìm endpoint</label><input id="filter" placeholder="products, orders, auth…">'+cards+'<h2 id="schemas">Schema dùng chung</h2>'+Object.entries(schemas).map(([name,value])=>'<details id="schema-'+esc(name)+'"><summary>'+esc(name)+'</summary><div><pre>'+esc(JSON.stringify(value,null,2))+'</pre></div></details>').join('')+'<script>document.querySelector("input").addEventListener("input",e=>document.querySelectorAll(".endpoint").forEach(d=>d.hidden=!d.textContent.toLowerCase().includes(e.target.value.toLowerCase())))</script></html>');
console.log(JSON.stringify({endpoints:contract.length,bodySchemas:Object.values(definitions).filter(d=>d.body).length,componentSchemas:Object.keys(schemas).length,unresolvedReferences:0}));
