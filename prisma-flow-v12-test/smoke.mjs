import fs from 'node:fs';

const root='prisma-flow-v12-test';
const js=['db.js','legacy.js','core.js','importer.js','map.js','routes.js','groups.js','router_noc.js','messages.js','flow.js','explore.js','access.js','app.js'];
const required=['index.html','styles.css',...js,'README_V12.md','LEIA-ME-V12.txt'];
for(const f of required){
  if(!fs.existsSync(root+'/'+f))throw new Error('Arquivo ausente: '+f);
}
const html=fs.readFileSync(root+'/index.html','utf8');
for(const f of js){
  if(!html.includes('./'+f))throw new Error('index.html não carrega '+f);
}
const pages=['home','search','explore','today','flow360','map','pointgroup','router','routes','groups','messages','relations','imports','corrections','health','operations','local','backup','sources'];
for(const id of pages){
  if(!html.includes('id="page-'+id+'"'))throw new Error('Página obrigatória ausente: '+id);
  if(!html.includes('data-page="'+id+'"'))throw new Error('Navegação obrigatória ausente: '+id);
}
for(const f of js){
  const src=fs.readFileSync(root+'/'+f,'utf8');
  try{new Function(src)}catch(e){throw new Error('Sintaxe inválida em '+f+': '+e.message)}
}
const db=fs.readFileSync(root+'/db.js','utf8');
if(!db.includes("prisma_flow_v12_test"))throw new Error('Banco V12 isolado não encontrado');
for(const store of ['corrections','imports','tasks','favorites','templates','destinations','contacts','ticketMap','notes','passwords']){
  if(!db.includes(store))throw new Error('Store V12 ausente: '+store);
}
const core=fs.readFileSync(root+'/core.js','utf8');
for(const p of ['__PACK_CATALOG__','__PACK_WHATSAPP__','__PACK_ROUTER__','__PACK_POINT_DETAILS__','__PACK_MACHINE_DETAILS__']){
  if(!core.includes(p))throw new Error('Loader ausente: '+p);
}
const importer=fs.readFileSync(root+'/importer.js','utf8');
for(const ext of ['xlsx','xls','csv','json'])if(!importer.includes(ext))throw new Error('Importador não suporta '+ext);
for(const fn of ['matrixToObjects','headerRowScore','infer'])if(!importer.includes(fn))throw new Error('Importador adaptativo incompleto: '+fn);
const map=fs.readFileSync(root+'/map.js','utf8');
if(!map.includes('Google Maps'))throw new Error('Google Maps ausente');
if(!map.includes('server.arcgisonline.com'))throw new Error('Tile provider sem chave não encontrado');
if(map.includes('basemaps.cartocdn.com'))throw new Error('CARTO com API key ainda ativo');
if(!map.includes('World_Street_Map')||!map.includes('World_Imagery')||!map.includes('World_Light_Gray_Base'))throw new Error('Camadas de mapa incompletas');
const routes=fs.readFileSync(root+'/routes.js','utf8');
for(const x of ['quote_cross_group','same_media','same_ticket','same_asset','same_machine_topic','same_point_topic','near_text'])if(!routes.includes(x))throw new Error('Sinal de rota ausente: '+x);
const router=fs.readFileSync(root+'/router_noc.js','utf8');
for(const x of ['routerData','profiles','assoc','rules','messageSupport'])if(!router.includes(x))throw new Error('Roteador NOC incompleto: '+x);
const messages=fs.readFileSync(root+'/messages.js','utf8');
for(const x of ['verificacao','sem_midia','offline','hardware','rede','retorno','normalizado','tecnico'])if(!messages.includes(x))throw new Error('Modelo PRISMA ausente: '+x);
const flow=fs.readFileSync(root+'/flow.js','utf8');
for(const x of ['Meu Turno','PONTO <b>360','SAÚDE DAS','exportBackup'])if(!flow.includes(x))throw new Error('FLOW restaurado incompleto: '+x);
console.log('PRISMA V12 static smoke: OK');
