import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve('.');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

function single(file,varName){
  const src=read(file);
  const pre='window.'+varName+'="';
  const s=src.indexOf(pre);
  if(s<0) throw new Error('Missing '+varName+' in '+file);
  const a=s+pre.length, e=src.indexOf('";',a);
  if(e<0) throw new Error('Invalid packed file '+file);
  return src.slice(a,e);
}
function parts(prefix,count,varName){
  let payload='';
  for(let i=1;i<=count;i++){
    const file=prefix+'.part'+String(i).padStart(2,'0')+'.js';
    const src=read(file);
    const marker='+"', s=src.indexOf(marker);
    const e=src.lastIndexOf('";');
    if(s<0||e<s) throw new Error('Invalid part '+file);
    payload+=src.slice(s+2,e);
  }
  return payload;
}
function unpack(payload,label){
  const raw=zlib.gunzipSync(Buffer.from(payload,'base64')).toString('utf8');
  const obj=JSON.parse(raw);
  console.log(label, 'packed='+payload.length, 'json='+raw.length);
  return obj;
}

const catalog=unpack(parts('BASE_PRISMA/ATUAL/catalog',7,'__PACK_CATALOG__'),'catalog');
const whatsapp=unpack(single('BASE_PRISMA/ATUAL/whatsapp.js','__PACK_WHATSAPP__'),'whatsapp');
const pointDetails=unpack(parts('BASE_PRISMA/ATUAL/point_details',4,'__PACK_POINT_DETAILS__'),'point_details');
const machineDetails=unpack(parts('BASE_PRISMA/ATUAL/machine_details',4,'__PACK_MACHINE_DETAILS__'),'machine_details');
const router=unpack(single('BASE_PRISMA/ATUAL/router.js','__PACK_ROUTER__'),'router');

if(!Array.isArray(catalog.P)||catalog.P.length!==95520) throw new Error('Expected 95,520 points, got '+catalog.P?.length);
if(!Array.isArray(catalog.M)||catalog.M.length!==42431) throw new Error('Expected 42,431 machines, got '+catalog.M?.length);
if(!Array.isArray(whatsapp.groups)||whatsapp.groups.length!==102) throw new Error('Expected 102 WhatsApp groups, got '+whatsapp.groups?.length);
if(!Array.isArray(whatsapp.messages)||whatsapp.messages.length!==22754) throw new Error('Expected 22,754 WhatsApp messages, got '+whatsapp.messages?.length);
if(pointDetails==null) throw new Error('point_details parsed null');
if(machineDetails==null) throw new Error('machine_details parsed null');
if(!Array.isArray(router.profiles)||router.profiles.length<50) throw new Error('Router profiles missing or unexpectedly small');

const index=read('index.html');
if(index.includes('unpkg.com/leaflet')||index.includes('cdn.jsdelivr.net/npm/xlsx')) throw new Error('Runtime CDN dependency still present');
for(const f of ['vendor/leaflet.js','vendor/leaflet.css','vendor/xlsx.full.min.js','base_manifest.js','ABRIR_PRISMA.bat']){
  if(!fs.existsSync(path.join(root,f))) throw new Error('Missing definitive file '+f);
}
if(!index.includes('12.4.0-FINAL-DIRETO-20261007')) throw new Error('Wrong build id');

console.log('COUNTS',JSON.stringify({
  points:catalog.P.length,
  machines:catalog.M.length,
  groups:whatsapp.groups.length,
  messages:whatsapp.messages.length,
  routerProfiles:router.profiles.length
}));
for(const f of ['MONTAR_PRISMA_DEFINITIVO.bat','MONTAR_PRISMA_DEFINITIVO.ps1','PREPARAR_BASE.ps1']){
  if(fs.existsSync(path.join(root,f))) throw new Error('Final package must not contain montador dependency: '+f);
}
console.log('PRISMA V12 FINAL DIRECT-OPEN VALIDATION: OK');
