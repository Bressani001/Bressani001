import fs from 'node:fs';

const root='prisma-flow-v12-test';
const required=['index.html','styles.css','db.js','core.js','importer.js','map.js','app.js','LEIA-ME-V12.txt'];
for(const f of required){
  if(!fs.existsSync(root+'/'+f))throw new Error('Arquivo ausente: '+f);
}
const html=fs.readFileSync(root+'/index.html','utf8');
for(const f of ['db.js','core.js','importer.js','map.js','app.js']){
  if(!html.includes('./'+f))throw new Error('index.html não carrega '+f);
}
for(const id of ['folderInput','connectBtn','page-search','page-map','page-imports','page-corrections']){
  if(!html.includes('id="'+id+'"'))throw new Error('Elemento obrigatório ausente: '+id);
}
const core=fs.readFileSync(root+'/core.js','utf8');
if(!core.includes("prisma_flow_v12_test") && !fs.readFileSync(root+'/db.js','utf8').includes("prisma_flow_v12_test")){
  throw new Error('Banco V12 isolado não encontrado');
}
if(!core.includes('__PACK_CATALOG__')||!core.includes('__PACK_WHATSAPP__'))throw new Error('Loader de base V11 incompleto');
const importer=fs.readFileSync(root+'/importer.js','utf8');
for(const ext of ['xlsx','xls','csv','json'])if(!importer.includes(ext))throw new Error('Importador não menciona '+ext);
const map=fs.readFileSync(root+'/map.js','utf8');
if(!map.includes('Google Maps')||!map.includes('OpenStreetMap'))throw new Error('Integração de mapa incompleta');
console.log('PRISMA V12 static smoke: OK');
