const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const frontend={1:['loginFormHook'],2:['loginFormHook'],3:['accountCache'],4:[],5:['profileHook'],6:['addressValidation'],7:['productListHook'],8:['productListHook'],9:['productCatalog'],10:['cultureMapService'],11:[],12:['cartStore'],13:['checkoutQuote','checkoutIdempotency','checkoutHook'],14:['paymentState'],15:[],16:[],17:[],18:['sellerRegisterHook'],19:['sellerProductFormHook','sellerProductsHook'],20:[],21:['orderState'],22:[],23:[],24:[],25:['chatService'],26:[],27:[],28:[],29:[],30:[],31:[],32:[],33:[],34:[],35:[],36:['assistantService','recommendation','recommendationPreferences'],37:['shopSettingsHook'],38:['informationContent'],39:['uploadService']};
const browser={4:'operations',10:'routes',20:'commercialFixes',22:'commercialFixes',25:'routes',26:'operations',27:'operations',28:'afterSales',29:'afterSales',30:'commerce',31:'afterSales',32:'settlements',33:'completion',34:'operations',35:'operations',36:'routes',37:'routes',38:'routes',39:'fullStack'};
const cases=[];
for(const dir of ['frontend/test','backend/test'])for(const name of fs.readdirSync(path.join(root,dir)).filter(n=>/\.test\.(js|cjs)$/.test(n))){
 const file=`${dir}/${name}`,source=fs.readFileSync(path.join(root,file),'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 const visit=node=>{if(ts.isCallExpression(node)&&['test','it'].includes(node.expression.getText(ast))&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))cases.push({file,title:node.arguments[0].text,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1});ts.forEachChild(node,visit);};visit(ast);
}
const stories=fs.readFileSync(path.join(root,'docs/requirements/USER_STORIES.md'),'utf8').split('\n').filter(l=>/^\| US\d+ \|/.test(l)).map(line=>{const parts=line.split('|').map(s=>s.trim());return {id:parts[1],story:parts[2],acceptance:parts[3]};});
assert.equal(stories.length,39);
const rows=stories.map(story=>{
 const n=Number(story.id.slice(2)),files=frontend[n].map(name=>`frontend/test/${name}.test.js`);
 const selected=cases.filter(c=>files.includes(c.file)||new RegExp(`\\b${story.id}\\b`).test(c.title)||(n===19&&c.file.endsWith('/nest-api.test.cjs')));
 assert.ok(selected.length,`No unit scenario for ${story.id}`);
 const e2e=`frontend/test/e2e/${browser[n]||'fullStack'}.cjs`;assert.ok(fs.existsSync(path.join(root,e2e)));
 return {...story,unitCases:selected,integration:e2e};
});
const link=file=>`[${file}](../../${file})`;
const text=['# User Stories → kiểm thử thực tế','',
 'Sinh từ mã test bằng `node backend/scripts/build-story-matrix.cjs`. Mỗi tiêu đề bên dưới là một test có thật, không suy ra từ tên file. 39/39 story có ít nhất một unit scenario liên quan; con số này KHÔNG đồng nghĩa bao phủ 100% acceptance criteria, nhánh lệnh hoặc mọi chức năng trong story. Chạy lại các lệnh kiểm thử trong README để lấy kết quả của phiên bản hiện tại.',
 '', 'Frontend unit trong `frontend/test`, backend unit trong `backend/test`. Test helper có mock không chứng minh transaction thật; E2E dùng PostgreSQL tạm. `routes` chủ yếu kiểm layout/điều hướng, không thay kiểm nghiệp vụ. Những ca email/QR/vận chuyển sử dụng tích hợp offline; không chứng minh nhà cung cấp thật.', '',
 '| Story | Unit scenario (tiêu đề rút gọn) | Kiểm tra bổ sung |','| --- | --- | --- |',
 ...rows.map(r=>`| ${r.id} | ${r.unitCases.slice(0,2).map(c=>c.title.replace(/\|/g,'/')).join('; ')}${r.unitCases.length>2?`; +${r.unitCases.length-2} ca`:''} | ${link(r.integration)} |`),
 '', '## Chi tiết chấp nhận và vị trí test','',...rows.flatMap(r=>[`### ${r.id}`, '',r.story,'',`AC cần đối chiếu: ${r.acceptance}`,'',...r.unitCases.map(c=>`- ${link(c.file)} dòng ${c.line}: ${c.title}`),'']),
 '## Các giới hạn cần trình bày khi bảo vệ','',
 '- Đây là ma trận truy vết scenario, không phải báo cáo line/branch coverage. Không lấy 39/39 làm tỷ lệ điểm.',
 '- Chưa có bằng chứng mọi tổ hợp lỗi của 122 endpoint; các ca lớp yêu cầu đặc biệt cần bổ sung khi có mẫu.',
 '- US28–32: unit kiểm validation/tính toán/khóa riêng; luồng thành công, retry và tác động DB được chứng minh bằng E2E/DB, không gọi các test đó là unit.',
 '- US37 unit kiểm payload; US38 unit kiểm nội dung/link/fallback. Route screenshots chỉ chứng minh giao diện tại trạng thái fixture.', ''];
fs.writeFileSync(path.join(root,'docs/requirements/STORY_TEST_MATRIX.md'),text.join('\n'));
console.log(JSON.stringify({stories:rows.length,storiesWithUnitScenario:rows.length,parsedUnitCases:cases.length}));
