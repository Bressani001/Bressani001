(function(){
'use strict';

const S={
  connected:false,
  files:new Map(),mediaUrls:new Map(),autoMediaMap:new Map(),sourceMode:'manual',
  catalog:null, WA:null, routerData:null, pointDetails:null, machineDetails:null,
  points:[], machines:[], messages:[], groups:[], tickets:[], assets:[],
  corrections:new Map(),
  imported:[],
  pointByKey:new Map(),
  machineByKey:new Map(),
  pointCodeCounts:new Map(),
  machinePoint:new Map(),
  lastSearch:[],
  sourceFolderName:'',
  loadMeta:{}
};

function norm(v){
  return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
}
function compact(v){return norm(v).replace(/[^a-z0-9]+/g,'');}
function num(v){
  if(v==null||v==='') return null;
  const n=Number(String(v).replace(',','.'));
  return Number.isFinite(n)?n:null;
}
function text(v){return v==null?'':String(v).trim();}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function fmt(n){return Number(n||0).toLocaleString('pt-BR');}
function toast(msg){
  const el=document.getElementById('toast'); if(!el)return;
  el.textContent=String(msg||'');el.classList.add('show');
  clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),1900);
}

function b64ToBytes(b64){
  const raw=atob(b64),out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
async function gunzipBase64(b64){
  if(typeof DecompressionStream==='undefined') throw new Error('Seu navegador não oferece DecompressionStream. Use Chrome/Edge atualizado.');
  const ds=new DecompressionStream('gzip');
  const stream=new Blob([b64ToBytes(b64)]).stream().pipeThrough(ds);
  return new Response(stream).text();
}
function extractAssignment(src,varName){
  const marker='window.'+varName+'=';
  const pos=src.indexOf(marker);
  if(pos<0)throw new Error('Pacote '+varName+' não encontrado no arquivo.');
  let i=pos+marker.length;
  while(/\s/.test(src[i]||''))i++;
  const quote=src[i];
  if(quote!=='"'&&quote!=="'")throw new Error('Formato inesperado em '+varName+'.');
  i++;
  let out='';
  for(;i<src.length;i++){
    const c=src[i];
    if(c===quote&&src[i-1]!=='\\')break;
    out+=c;
  }
  if(!out)throw new Error('Conteúdo vazio em '+varName+'.');
  return out.replace(/\\(["'\\])/g,'$1');
}
async function unpackFile(file,varName){
  const src=await file.text();
  const packed=extractAssignment(src,varName);
  const raw=await gunzipBase64(packed);
  return JSON.parse(raw);
}
function basename(file){return String(file.webkitRelativePath||file.name||'').split('/').pop().toLowerCase();}
function chooseFile(files,names){
  const wanted=names.map(x=>x.toLowerCase());
  return files.find(f=>wanted.includes(basename(f)))||null;
}

async function unpackGlobal(varName){
  const packed=window[varName];
  if(typeof packed!=='string'||!packed)throw new Error('Pacote '+varName+' não foi carregado.');
  const raw=await gunzipBase64(packed);
  return JSON.parse(raw);
}
function loadScriptPath(path,varName,keepExisting){
  return new Promise((resolve,reject)=>{
    if(!path){resolve(false);return;}
    if(varName&&!keepExisting)try{delete window[varName]}catch(e){window[varName]=undefined}
    const s=document.createElement('script');
    s.src=String(path)+(String(path).includes('?')?'&':'?')+'v='+Date.now();
    s.async=false;
    s.onload=()=>{s.remove();resolve(true)};
    s.onerror=()=>{s.remove();reject(new Error('Não foi possível carregar '+path));};
    document.head.appendChild(s);
  });
}
async function loadPackedSource(single,parts,varName){
  if(single){
    await loadScriptPath(single,varName,false);
    return unpackGlobal(varName);
  }
  if(Array.isArray(parts)&&parts.length){
    try{delete window[varName]}catch(e){window[varName]=undefined}
    window[varName]='';
    for(const path of parts)await loadScriptPath(path,varName,true);
    return unpackGlobal(varName);
  }
  return null;
}
async function connectManifest(manifest){
  if(!manifest||!manifest.files)throw new Error('Manifesto automático da base inválido.');
  const f=manifest.files||{};
  if(!(f.catalog||f.catalogParts?.length)||!(f.whatsapp||f.whatsappParts?.length))throw new Error('BASE_PRISMA não contém um conjunto válido com catálogo + WhatsApp.');

  S.mediaUrls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(e){}});S.mediaUrls.clear();
  S.files=new Map();S.autoMediaMap=new Map(Object.entries(manifest.media||{}).map(([k,v])=>[String(k).toLowerCase(),String(v)]));
  S.sourceMode='auto';S.sourceFolderName=manifest.sourceRoot||'BASE_PRISMA automático';
  toast('Carregando BASE_PRISMA automaticamente…');

  const C=await loadPackedSource(f.catalog,f.catalogParts,'__PACK_CATALOG__');
  const WA=await loadPackedSource(f.whatsapp,f.whatsappParts,'__PACK_WHATSAPP__');

  const PD=await loadPackedSource(f.pointDetails,f.pointDetailsParts,'__PACK_POINT_DETAILS__');
  const MD=await loadPackedSource(f.machineDetails,f.machineDetailsParts,'__PACK_MACHINE_DETAILS__');
  const RD=await loadPackedSource(f.router,f.routerParts,'__PACK_ROUTER__');

  S.catalog=C;S.WA=WA;S.routerData=RD;S.pointDetails=PD;S.machineDetails=MD;S.connected=true;
  S.loadMeta={
    folder:S.sourceFolderName,mode:'auto',manifestGeneratedAt:manifest.generatedAt||null,
    catalog:f.catalog||f.catalogParts?.join(', '),whatsapp:f.whatsapp||f.whatsappParts?.join(', '),
    pointDetails:f.pointDetails||f.pointDetailsParts?.join(', '),machineDetails:f.machineDetails||f.machineDetailsParts?.join(', '),
    router:f.router||f.routerParts?.join(', '),
    mediaFiles:S.autoMediaMap.size,connectedAt:new Date().toISOString()
  };
  await refreshLocal();
  await PrismaDB.put('sources',{id:'v11_auto',kind:'auto-folder',name:S.sourceFolderName,meta:S.loadMeta,updatedAt:new Date().toISOString()});
  await PrismaDB.audit('fonte','BASE_PRISMA carregada automaticamente','',S.loadMeta);
  return stats();
}
function applyImportOverlay(type,obj){
  const candidates=S.imported.filter(r=>r.kind===type&&r.active!==false&&r.data);
  let best=null;
  for(const r of candidates){
    const d=r.data||{};let match=false;
    if(type==='point'){
      if(d.id&&obj.id)match=norm(d.id)===norm(obj.id);
      else if(d.code&&obj.code&&norm(d.code)===norm(obj.code)){
        if(d.square&&obj.square)match=norm(d.square)===norm(obj.square);
        else match=(S.pointCodeCounts.get(norm(d.code))||0)===1;
      }
      else if(!d.id&&!d.code&&d.name&&obj.name)match=false; // nome sozinho não sobrescreve cadastro existente
    }else if(type==='machine'){
      if(d.id&&obj.id)match=norm(d.id)===norm(obj.id);
      else if(!d.id&&d.name&&obj.name&&d.pointCode&&obj.pointCode){
        match=norm(d.name)===norm(obj.name)&&norm(d.pointCode)===norm(obj.pointCode);
      }
    }else{
      const keys=new Set([obj._key,obj.id,obj.code,obj.pointCode].filter(Boolean).map(x=>norm(x)));
      const rkeys=[r.entityKey,d.id,d.code,d.pointCode].filter(Boolean).map(x=>norm(x));
      match=rkeys.some(k=>keys.has(k));
    }
    if(!match)continue;
    if(!best||String(r.importedAt||'')>String(best.importedAt||''))best=r;
  }
  if(!best)return obj;
  const out=Object.assign({},obj);
  Object.keys(best.data||{}).forEach(k=>{
    const v=best.data[k];
    if(v!==''&&v!=null)out[k]=v;
  });
  out._overlayImportId=best.importId;
  out._overlayImportName=best.importName||best.importId;
  return out;
}

function pointFrom(i){
  const c=(S.catalog&&S.catalog.P&&S.catalog.P[i])||[];
  const d=(S.pointDetails&&S.pointDetails[i])||[];
  const key=text(d[0]||c[0]||c[1]||i);
  const p={
    _index:i,_key:key,_source:'base',
    id:text(d[0]||c[0]),code:text(d[1]||c[1]),
    name:text(d[3]||d[2]||c[2]),originalName:text(d[2]||c[2]),
    address:text(d[12]||d[4]||c[3]),addressCsv:text(d[4]||c[3]),
    neighborhood:text(d[13]),city:text(d[14]),state:text(d[15]||d[7]||c[5]),
    square:text(d[16]||d[6]||c[6]),cep:text(d[17]),
    lat:num(d[18]),lng:num(d[19]),area:text(d[20]||d[5]||c[10]),
    environment:text(d[21]),establishment:text(d[22]),equipmentType:text(d[23]),
    monitors:text(d[24]),status:text(d[25]||c[7]),commercialized:text(d[26]),
    cityVisible:text(d[27]),activationDate:text(d[28]),operationsUrl:text(d[29]),
    presentCurrent:d[8]===true||String(d[8]).toLowerCase()==='true'
  };
  return applyCorrections('point',p._key,applyImportOverlay('point',p));
}
function machineFrom(i){
  const c=(S.catalog&&S.catalog.M&&S.catalog.M[i])||[];
  const d=(S.machineDetails&&S.machineDetails[i])||[];
  const key=text(d[0]||c[0]||i);
  const m={
    _index:i,_key:key,_source:'base',
    id:text(d[0]||c[0]),pointCode:text(d[1]||c[1]),
    pointName:text(d[2]||c[3]),name:text(d[7]||c[2]),
    address:text(d[3]||c[4]),cep:text(d[4]),square:text(d[5]||c[5]),
    area:text(d[6]),systemName:text(d[9]),os:text(d[11]||c[6]),
    ip:text(d[13]||c[7]),provider:text(d[14]||c[8]),installationType:text(d[16]),
    systemVersion:text(d[17]),monitors:text(d[18]),location:text(d[19]),
    resolution:text(d[20]),processor:text(d[21]),memory:text(d[22]),
    manufacturer:text(d[23]),model:text(d[24]),diskStatus:text(d[25]),lastReboot:text(d[26])
  };
  return applyCorrections('machine',m._key,applyImportOverlay('machine',m));
}
function applyCorrections(type,key,obj){
  const out=Object.assign({},obj);
  const prefix=type+':'+key+':';
  S.corrections.forEach((c,id)=>{
    if(id.startsWith(prefix)&&c.active!==false) out[c.field]=c.newValue;
  });
  return out;
}

function rebuild(){
  S.points=[];S.machines=[];S.pointByKey.clear();S.machineByKey.clear();S.machinePoint.clear();
  const pc=(S.catalog&&S.catalog.P||[]).length;
  const mc=(S.catalog&&S.catalog.M||[]).length;
  S.pointCodeCounts=new Map();
  for(const raw of (S.catalog&&S.catalog.P||[])){const code=norm((raw||[])[1]||'');if(code)S.pointCodeCounts.set(code,(S.pointCodeCounts.get(code)||0)+1);}
  const codeCounts=new Map();
  for(let i=0;i<pc;i++){const p=pointFrom(i);p._search=norm(pointBlob(p));S.points.push(p);S.pointByKey.set(p._key,p);if(p.code){const k=norm(p.code);codeCounts.set(k,(codeCounts.get(k)||0)+1);}}
  S.points.forEach(p=>{if(p.code&&S.pointCodeCounts.get(norm(p.code))===1)S.pointByKey.set('code:'+norm(p.code),p);});
  for(let i=0;i<mc;i++){const m=machineFrom(i);m._search=norm(machineBlob(m));S.machines.push(m);S.machineByKey.set(m._key,m);if(m.id)S.machineByKey.set('id:'+norm(m.id),m);}
  const sqMap=new Map();
  S.points.forEach(p=>{if(p.code){const k=norm(p.code)+'|'+norm(p.square);if(!sqMap.has(k))sqMap.set(k,p);}});
  S.machines.forEach(m=>{
    let p=sqMap.get(norm(m.pointCode)+'|'+norm(m.square));
    if(!p&&m.pointCode&&S.pointCodeCounts.get(norm(m.pointCode))===1)p=S.pointByKey.get('code:'+norm(m.pointCode));
    if(p)S.machinePoint.set(m._key,p._key);
  });
  S.groups=(S.WA&&S.WA.groups)||[];
  S.messages=(S.WA&&S.WA.messages)||[];
  S.tickets=(S.WA&&S.WA.tickets)||[];
  S.assets=(S.WA&&S.WA.assets)||[];
}

async function refreshLocal(){
  if(!window.PrismaDB)return;
  const [corr,recs]=await Promise.all([PrismaDB.all('corrections'),PrismaDB.all('importRecords')]);
  S.corrections=new Map((corr||[]).map(x=>[x.id,x]));
  S.imported=(recs||[]).filter(x=>x.active!==false);
  if(S.connected)rebuild();
}

async function connectFolder(fileList){
  const files=Array.from(fileList||[]);
  if(!files.length)throw new Error('Nenhum arquivo foi selecionado.');
  const catalog=chooseFile(files,['catalog.js','catalog(1).js']);
  const whatsapp=chooseFile(files,['whatsapp.js','whatsapp(1).js']);
  const pd=chooseFile(files,['point_details.js','point_details(1).js']);
  const md=chooseFile(files,['machine_details.js','machine_details(1).js']);
  const router=chooseFile(files,['router.js','router(1).js','router_v7.js','router_v7(1).js']);
  if(!catalog)throw new Error('catalog.js não encontrado na pasta selecionada.');
  if(!whatsapp)throw new Error('whatsapp.js não encontrado na pasta selecionada.');

  S.mediaUrls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(e){}});S.mediaUrls.clear();
  S.autoMediaMap.clear();S.sourceMode='manual';
  S.files=new Map(files.map(f=>[basename(f),f]));
  S.sourceFolderName=(files[0].webkitRelativePath||'').split('/')[0]||'Pasta selecionada';
  toast('Lendo base. Pode levar alguns segundos…');

  const jobs=[
    unpackFile(catalog,'__PACK_CATALOG__'),
    unpackFile(whatsapp,'__PACK_WHATSAPP__'),
    pd?unpackFile(pd,'__PACK_POINT_DETAILS__'):Promise.resolve(null),
    md?unpackFile(md,'__PACK_MACHINE_DETAILS__'):Promise.resolve(null),
    router?unpackFile(router,'__PACK_ROUTER__'):Promise.resolve(null)
  ];
  const [C,WA,PD,MD,RD]=await Promise.all(jobs);
  S.catalog=C;S.WA=WA;S.routerData=RD;S.pointDetails=PD;S.machineDetails=MD;
  S.connected=true;
  S.loadMeta={
    folder:S.sourceFolderName,
    catalog:basename(catalog),whatsapp:basename(whatsapp),
    pointDetails:pd?basename(pd):null,machineDetails:md?basename(md):null,router:router?basename(router):null,
    connectedAt:new Date().toISOString()
  };
  await refreshLocal();
  await PrismaDB.put('sources',{id:'v11_folder',kind:'folder',name:S.sourceFolderName,meta:S.loadMeta,updatedAt:new Date().toISOString()});
  await PrismaDB.audit('fonte','Pasta V11 conectada','',S.loadMeta);
  return stats();
}

function stats(){
  return {
    points:S.points.length,machines:S.machines.length,messages:S.messages.length,
    groups:S.groups.length,tickets:S.tickets.length,assets:S.assets.length,
    imported:S.imported.length,corrections:S.corrections.size,
    withCoords:S.points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).length
  };
}

function words(q){return norm(q).split(/\s+/).filter(Boolean);}
function scoreBlob(blob,q,tokens,boost,alreadyNorm){
  const n=alreadyNorm?String(blob||''):norm(blob);if(!n)return -1;
  const nq=norm(q);
  let s=0;
  if(n===nq)s+=10000;
  if(n.startsWith(nq))s+=1800;
  if(n.includes(nq))s+=900;
  for(const t of tokens){if(!n.includes(t))return -1;s+=t.length*3;}
  return s+(boost||0);
}
function pointBlob(p){return [p.id,p.code,p.name,p.originalName,p.address,p.neighborhood,p.city,p.state,p.square,p.cep,p.area,p.status,p.establishment,p.equipmentType].join(' ');}
function machineBlob(m){return [m.id,m.name,m.pointCode,m.pointName,m.address,m.square,m.area,m.os,m.ip,m.provider,m.location,m.model].join(' ');}
function importedBlob(r){return [r.entityKey,r.kind,r.label,JSON.stringify(r.data||{}),JSON.stringify(r.raw||{})].join(' ');}

async function search(q,limit,type){
  q=text(q);limit=limit||80;type=type||'all';
  if(!q)return [];
  const t=words(q),rows=[];
  if(type==='all'||type==='point'){
    for(const p of S.points){const s=scoreBlob(p._search||pointBlob(p),q,t,p.code===q?5000:0,!!p._search);if(s>=0)rows.push({type:'point',score:s,key:p._key,title:(p.code?p.code+' • ':'')+(p.name||'Ponto'),sub:[p.address,p.city,p.square].filter(Boolean).join(' • '),entity:p});}
  }
  if(type==='all'||type==='machine'){
    for(const m of S.machines){const s=scoreBlob(m._search||machineBlob(m),q,t,m.id===q?5000:0,!!m._search);if(s>=0)rows.push({type:'machine',score:s,key:m._key,title:'['+(m.id||'')+'] '+(m.name||'Máquina'),sub:[m.pointCode,m.pointName,m.square,m.ip].filter(Boolean).join(' • '),entity:m});}
  }
  if(type==='all'||type==='group'){
    for(let i=0;i<S.groups.length;i++){
      const g=S.groups[i]||{},blob=[g.name,g.category,(g.regionHints||[]).join(' ')].join(' ');
      const s=scoreBlob(blob,q,t,0);if(s>=0)rows.push({type:'group',score:s,key:String(i),title:g.name||('Grupo '+i),sub:[g.category,(g.regionHints||[]).join(', '),((g.messagesObserved||0)+' mensagens')].filter(Boolean).join(' • '),entity:{index:i,row:g}});
    }
  }
  if((type==='all'||type==='message')&&S.messages.length){
    for(let i=0;i<S.messages.length;i++){
      const m=S.messages[i]||[],g=S.groups[m[4]]||{},blob=[g.name,m[5],m[2],m[3],m[6],m[10]].join(' ');
      const s=scoreBlob(blob,q,t,0);if(s>=0)rows.push({type:'message',score:s,key:String(m[0]||i),title:g.name||'Mensagem',sub:[m[2],m[3],m[5],String(m[6]||m[10]||'').slice(0,130)].filter(Boolean).join(' • '),entity:{index:i,row:m,group:g}});
    }
  }
  if((type==='all'||type==='ticket')&&S.tickets.length){
    for(let i=0;i<S.tickets.length;i++){
      const r=S.tickets[i]||[],id=String(r[0]||''),blob=[id,JSON.stringify(r.slice(1,5))].join(' ');
      const s=scoreBlob(blob,q,t,id===q?4000:0);if(s>=0)rows.push({type:'ticket',score:s,key:id||String(i),title:'Chamado '+(id||i),sub:((r[1]||[]).length||0)+' ocorrência(s)',entity:{index:i,row:r}});
    }
  }
  if((type==='all'||type==='asset')&&S.assets.length){
    for(let i=0;i<S.assets.length;i++){
      const r=S.assets[i]||[],id=String(r[0]||''),blob=[id,JSON.stringify(r.slice(1,5))].join(' ');
      const s=scoreBlob(blob,q,t,id===q?4000:0);if(s>=0)rows.push({type:'asset',score:s,key:id||String(i),title:'Ativo '+(id||i),sub:((r[1]||[]).length||0)+' ocorrência(s)',entity:{index:i,row:r}});
    }
  }
  for(const r of S.imported){
    const s=scoreBlob(importedBlob(r),q,t,150);if(s>=0)rows.push({type:r.kind||'imported',score:s,key:r.entityKey||r.id,title:(r.label||r.entityKey||'Importado')+' • importado',sub:'Fonte: '+(r.importName||r.importId||'importação'),entity:r,imported:true});
  }
  rows.sort((a,b)=>b.score-a.score||String(a.title).localeCompare(String(b.title),'pt-BR'));
  S.lastSearch=rows.slice(0,limit);
  try{await PrismaDB.audit('busca','Busca: '+q,'',{query:q,count:S.lastSearch.length});}catch(e){}
  return S.lastSearch;
}

async function saveCorrection(type,key,field,newValue,reason){
  if(!type||!key||!field)throw new Error('Correção incompleta.');
  let current=null;
  if(type==='point')current=S.pointByKey.get(key);
  if(type==='machine')current=S.machineByKey.get(key);
  const oldValue=current?current[field]:null;
  const id=type+':'+key+':'+field;
  const row={id,entityType:type,entityKey:key,field,oldValue:oldValue,newValue:newValue,reason:text(reason),active:true,updatedAt:new Date().toISOString()};
  await PrismaDB.put('corrections',row);
  await PrismaDB.audit('correcao','Corrigiu '+type+' '+key+' • '+field,key,row);
  await refreshLocal();
  return row;
}
async function removeCorrection(id){
  const c=await PrismaDB.get('corrections',id);
  if(c)await PrismaDB.audit('correcao_removida','Removeu correção '+id,c.entityKey||'',c);
  await PrismaDB.delete('corrections',id);
  await refreshLocal();
}
function pointForMachine(m){const k=S.machinePoint.get(m._key);return k?S.pointByKey.get(k)||null:null;}
function machinesForPoint(p){
  const out=[];S.machines.forEach(m=>{if(S.machinePoint.get(m._key)===p._key)out.push(m);});return out;
}
function messagesForPoint(p){
  if(!p)return [];const pi=Number(p._index),out=[];
  for(let i=0;i<S.messages.length;i++){const m=S.messages[i]||[];for(const x of (m[17]||[])){if(Number(x&&x[0])===pi){out.push({index:i,confidence:Number(x[1]||0),reasons:x[2]||[],message:m,group:S.groups[m[4]]||{}});break;}}}
  return out;
}
function messagesForMachine(mach){
  if(!mach)return [];const mi=Number(mach._index),out=[];
  for(let i=0;i<S.messages.length;i++){const m=S.messages[i]||[];for(const x of (m[18]||[])){if(Number(x&&x[0])===mi){out.push({index:i,confidence:Number(x[1]||0),reasons:x[2]||[],message:m,group:S.groups[m[4]]||{}});break;}}}
  return out;
}
function groupStatsForPoint(p){
  const map=new Map();messagesForPoint(p).forEach(r=>{const gi=Number(r.message[4]);let s=map.get(gi);if(!s){s={group:gi,count:0,strong:0,medium:0,maxConfidence:0,lastTs:0};map.set(gi,s)}s.count++;s.maxConfidence=Math.max(s.maxConfidence,r.confidence);if(r.confidence>=.9)s.strong++;else if(r.confidence>=.7)s.medium++;s.lastTs=Math.max(s.lastTs,Number(r.message[1]||0));});
  return [...map.values()].sort((a,b)=>b.strong-a.strong||b.count-a.count||b.maxConfidence-a.maxConfidence||b.lastTs-a.lastTs);
}
function groupStatsForMachine(mach){
  const map=new Map();messagesForMachine(mach).forEach(r=>{const gi=Number(r.message[4]);let s=map.get(gi);if(!s){s={group:gi,count:0,strong:0,medium:0,maxConfidence:0,lastTs:0};map.set(gi,s)}s.count++;s.maxConfidence=Math.max(s.maxConfidence,r.confidence);if(r.confidence>=.9)s.strong++;else if(r.confidence>=.7)s.medium++;s.lastTs=Math.max(s.lastTs,Number(r.message[1]||0));});
  return [...map.values()].sort((a,b)=>b.strong-a.strong||b.count-a.count||b.maxConfidence-a.maxConfidence||b.lastTs-a.lastTs);
}
function ticketsForPoint(p){
  if(!p)return [];const pi=Number(p._index),out=[];(S.tickets||[]).forEach((r,i)=>{if((r[2]||[]).some(x=>Number(x&&x[0])===pi))out.push({index:i,row:r,id:String(r[0]||'')})});return out;
}
function assetsForPoint(p){
  if(!p)return [];const pi=Number(p._index),out=[];(S.assets||[]).forEach((r,i)=>{if((r[2]||[]).some(x=>Number(x&&x[0])===pi))out.push({index:i,row:r,id:String(r[0]||'')})});return out;
}
function operationsPointUrl(p){return p&&p.id?'https://operacoes.eletromidia.com.br/places/'+encodeURIComponent(p.id):'https://operacoes.eletromidia.com.br/places';}
function operationsMachineUrl(m){return m&&m.id?'https://operacoes.eletromidia.com.br/legacy/machines/'+encodeURIComponent(m.id)+'/edit':'https://operacoes.eletromidia.com.br/legacy/machines';}
function sourceFileUrl(name){
  const k=String(name||'').split('/').pop().toLowerCase();if(!k)return '';
  if(S.mediaUrls.has(k))return S.mediaUrls.get(k);
  const f=S.files.get(k);
  if(f){try{const u=URL.createObjectURL(f);S.mediaUrls.set(k,u);return u}catch(e){}}
  const rel=S.autoMediaMap.get(k);
  if(rel){try{return new URL(rel,location.href).href}catch(e){return rel}}
  return '';
}
function mapsUrl(p){
  if(Number.isFinite(p.lat)&&Number.isFinite(p.lng))return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.lat+','+p.lng);
  const q=[p.address,p.city,p.state,p.cep].filter(Boolean).join(', ');
  return q?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q):'';
}

window.PrismaCore={
  S,norm,compact,num,text,esc,fmt,toast,connectFolder,connectManifest,refreshLocal,rebuild,stats,search,
  pointForMachine,machinesForPoint,messagesForPoint,messagesForMachine,groupStatsForPoint,groupStatsForMachine,ticketsForPoint,assetsForPoint,operationsPointUrl,operationsMachineUrl,sourceFileUrl,mapsUrl,saveCorrection,removeCorrection,
  getPoint:key=>S.pointByKey.get(key)||S.pointByKey.get('code:'+norm(key))||null,
  getMachine:key=>S.machineByKey.get(key)||S.machineByKey.get('id:'+norm(key))||null
};

})();