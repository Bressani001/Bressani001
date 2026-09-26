const fs=require('fs');
function ok(c,m){if(!c)throw new Error(m)}
const idx=fs.readFileSync('prisma-v11/index.html','utf8');
const core=fs.readFileSync('prisma-v11/prisma_v11_core.js','utf8');
const flow=fs.readFileSync('prisma-v11/prisma_v11_flow.js','utf8');
const data=fs.readFileSync('prisma-v11/prisma_v11_data.js','utf8');
['prisma_v10.js','prisma_v11_worker_factory.js','prisma_v11_db.js','prisma_v11_core.js','prisma_v11_flow.js','prisma_v11_data.js'].forEach(x=>ok(idx.includes(x),'index missing '+x));
ok(idx.indexOf('prisma_v10.js')<idx.indexOf('prisma_v11_core.js'),'V11 must load after V10');
['flowToday','flow360','flowRelations','flowUpdate','flowHealth','flowNewbieBtn'].forEach(x=>ok(core.includes(x),'core feature missing '+x));
['O que eu faço agora','Captura rápida','flowAddTaskPoint'].forEach(x=>ok(flow.includes(x),'flow feature missing '+x));
['SHA-256','overlay','80 MB','flowHealth'].forEach(x=>ok(data.includes(x),'data feature missing '+x));
ok(!core.includes('&&window.WA&&'),'invalid readiness check');
console.log('PRISMA V11 STATIC TEST OK');