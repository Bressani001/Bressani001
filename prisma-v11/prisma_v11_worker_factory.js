function prismaV11WorkerMain(){\n'use strict';
var CORE=[],OVERLAY=[],COREMAP={point:new Map(),machine:new Map(),ticket:new Map(),group:new Map(),message:new Map()};
function norm(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').trim()}
function compact(v){return norm(v).replace(/[^a-z0-9]+/g,'')}
function escKey(v){return String(v==null?'':v).trim()}
function sigObj(o){
 var keys=Object.keys(o||{}).sort(),s='';
 for(var i=0;i<keys.length;i++){var k=keys[i];s+=k+'='+norm(o[k])+'|'}
 return s;
}
function addCoreMap(r){
 var map=COREMAP[r.t];if(!map)return;
 if(r.k&&!map.has(String(r.k)))map.set(String(r.k),r.sig||r.s||'');
 if(Array.isArray(r.keys))for(var i=0;i<r.keys.length;i++){var k=String(r.keys[i]||'');if(k&&!map.has(k))map.set(k,r.sig||r.s||'')}
}
function search(q,limit){
 q=norm(q);var toks=q.split(/\s+/).filter(Boolean);if(!q)return [];
 var out=[],all=CORE.concat(OVERLAY),max=Math.max(10,Math.min(Number(limit)||40,100));
 for(var i=0;i<all.length;i++){
  var r=all[i],s=r.s||'',ok=true;
  for(var j=0;j<toks.length;j++){if(s.indexOf(toks[j])<0){ok=false;break}}
  if(!ok)continue;
  var score=0;
  if(r.k&&norm(r.k)===q)score+=10000;
  if(r.primary&&norm(r.primary)===q)score+=8500;
  if(r.primary&&norm(r.primary).indexOf(q)===0)score+=3500;
  if(s.indexOf(q)>=0)score+=1200;
  for(j=0;j<toks.length;j++){
   if(r.primary&&norm(r.primary).indexOf(toks[j])>=0)score+=400;
   else score+=60;
  }
  if(r.t==='point')score+=120;
  if(r.t==='machine')score+=100;
  if(r.overlay)score+=25;
  out.push({score:score,t:r.t,i:r.i,k:r.k,primary:r.primary||'',secondary:r.secondary||'',overlay:!!r.overlay,importId:r.importId||null,overlayIndex:r.overlayIndex});
 }
 out.sort(function(a,b){return b.score-a.score||(a.t>b.t?1:-1)});
 return out.slice(0,max);
}
function detectDelimiter(line){
 var choices=[';',',','\t'],best=';',bestN=-1;
 for(var c=0;c<choices.length;c++){var d=choices[c],n=0,q=false;for(var i=0;i<line.length;i++){var ch=line[i];if(ch==='"'){if(line[i+1]==='"')i++;else q=!q}else if(!q&&ch===d)n++}if(n>bestN){best=d;bestN=n}}
 return best;
}
function parseCSV(text){
 var first=(text.split(/\r?\n/).find(function(x){return x.trim()})||''),delim=detectDelimiter(first),rows=[],row=[],cell='',q=false;
 for(var i=0;i<text.length;i++){
  var ch=text[i];
  if(ch==='"'){if(q&&text[i+1]==='"'){cell+='"';i++}else q=!q}
  else if(!q&&ch===delim){row.push(cell);cell=''}
  else if(!q&&(ch==='\n'||ch==='\r')){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);cell='';if(row.some(function(x){return String(x).trim()!==''}))rows.push(row);row=[];
  }else cell+=ch;
 }
 if(cell!==''||row.length){row.push(cell);if(row.some(function(x){return String(x).trim()!==''}))rows.push(row)}
 if(!rows.length)return {headers:[],rows:[],delimiter:delim};
 var headers=rows.shift().map(function(h,idx){var v=String(h||'').replace(/^\uFEFF/,'').trim();return v||('COL_'+(idx+1))});
 var objs=rows.map(function(r){var o={};for(var j=0;j<headers.length;j++)o[headers[j]]=r[j]==null?'':r[j];return o});
 return {headers:headers,rows:objs,delimiter:delim};
}
function flatJSON(x){
 if(Array.isArray(x))return x;
 if(x&&typeof x==='object'){
  var keys=Object.keys(x);
  for(var i=0;i<keys.length;i++){if(Array.isArray(x[keys[i]])&&x[keys[i]].length&&typeof x[keys[i]][0]==='object')return x[keys[i]]}
  return [x];
 }
 return [];
}
function headMap(obj){
 var m={};Object.keys(obj||{}).forEach(function(k){m[compact(k)]=k});return m;
}
function val(o,m,names){
 for(var i=0;i<names.length;i++){var k=m[compact(names[i])];if(k!=null&&o[k]!=null&&String(o[k]).trim()!=='')return String(o[k]).trim()}
 return '';
}
function classify(rows){
 if(!rows.length)return 'unknown';
 var m=headMap(rows[0]),keys=Object.keys(m);
 function has(x){return keys.indexOf(compact(x))>=0}
 if((has('PONTO')||has('NOME DO PONTO')||has('COD PONTO'))&&has('ENDERECO')&&(has('ID')||has('COD PONTO')))return 'point';
 if(has('NOME MAQUINA')||has('MAQUINA')||has('SENHA ACESSO')||(has('COD PONTO')&&(has('IP')||has('SISTEMA OPERACIONAL'))))return 'machine';
 if(has('MESSAGEID')||has('MESSAGE ID')||has('ID MENSAGEM')||(has('TEXTO')&&has('GRUPO')))return 'message';
 if(has('CHAMADO')||has('TICKET')||has('SYNC ID'))return 'ticket';
 return 'generic';
}
function rowKey(kind,o){
 var m=headMap(o);
 if(kind==='point'){
  var id=val(o,m,['ID','ID DB','PLACE ID']),cod=val(o,m,['COD PONTO','CODIGO PONTO','CODIGO','PONTO']);
  if(/^\[?([A-Za-z0-9]+)\]?/.test(cod)){var mm=cod.match(/^\[?([A-Za-z0-9]+)\]?/);if(mm)cod=mm[1]}
  return id||cod;
 }
 if(kind==='machine')return val(o,m,['ID','ID MAQUINA','COD MAQUINA','MAQUINA']);
 if(kind==='message')return val(o,m,['MESSAGEID','MESSAGE ID','ID MENSAGEM','ID']);
 if(kind==='ticket')return val(o,m,['CHAMADO','TICKET','SYNC ID','ELT','ID']);
 return val(o,m,['ID','CODIGO','COD','NOME'])||compact(sigObj(o)).slice(0,80);
}
function rowLabel(kind,o){
 var m=headMap(o);
 if(kind==='point')return val(o,m,['PONTO','NOME DO PONTO','NOME','COD PONTO'])||rowKey(kind,o);
 if(kind==='machine')return val(o,m,['NOME MAQUINA','MAQUINA','NOME'])||rowKey(kind,o);
 if(kind==='message')return val(o,m,['TEXTO','MENSAGEM','TEXT'])||rowKey(kind,o);
 if(kind==='ticket')return 'Chamado '+rowKey(kind,o);
 return rowKey(kind,o);
}
function canonical(kind,o){
 var m=headMap(o),x={};
 if(kind==='point'){
  x.id=val(o,m,['ID','ID DB','PLACE ID']);
  x.code=val(o,m,['COD PONTO','CODIGO PONTO','CODIGO']);
  var ponto=val(o,m,['PONTO','NOME DO PONTO','NOME']);
  var mt=ponto.match(/^\[([^\]]+)\]\s*-\s*(.*)$/);if(mt){if(!x.code)x.code=mt[1];x.name=mt[2]}else x.name=ponto;
  x.address=val(o,m,['ENDERECO','ENDEREÇO']);x.area=val(o,m,['AREA DE TRABALHO','ÁREA DE TRABALHO','AREA']);x.square=val(o,m,['PRACA','PRAÇA']);x.state=val(o,m,['ESTADO','UF']);
 }else if(kind==='machine'){
  x.id=val(o,m,['ID','ID MAQUINA','COD MAQUINA']);
  var nm=val(o,m,['NOME MAQUINA','MAQUINA','NOME']);var mm=nm.match(/^\[([^\]]+)\]\s*-\s*(.*)$/);if(mm){if(!x.id)x.id=mm[1];x.name=mm[2]}else x.name=nm;
  x.pointCode=val(o,m,['COD PONTO','CODIGO PONTO']);x.point=val(o,m,['PONTO','NOME PONTO']);x.address=val(o,m,['ENDERECO','ENDEREÇO']);x.square=val(o,m,['PRACA','PRAÇA']);x.os=val(o,m,['SISTEMA OPERACIONAL','SO','OS']);x.ip=val(o,m,['IP']);x.password=val(o,m,['SENHA ACESSO','SENHA']);
 }else if(kind==='message'){
  x.id=val(o,m,['MESSAGEID','MESSAGE ID','ID MENSAGEM','ID']);x.group=val(o,m,['GRUPO','GROUP']);x.author=val(o,m,['AUTOR','AUTHOR']);x.text=val(o,m,['TEXTO','MENSAGEM','TEXT']);x.date=val(o,m,['DATA','DATE']);x.time=val(o,m,['HORA','TIME']);
 }else if(kind==='ticket'){
  x.id=rowKey(kind,o);x.title=val(o,m,['TITULO','TÍTULO','NOME']);x.pointCode=val(o,m,['COD PONTO','CODIGO PONTO']);x.status=val(o,m,['STATUS']);
 }else x=o;
 return x;
}
function diffImport(kind,rows,complete){
 var map=COREMAP[kind]||new Map(),seen=new Map(),records=[],invalid=0,dups=0,added=0,changed=0,same=0;
 for(var i=0;i<rows.length;i++){
  var raw=rows[i];if(!raw||typeof raw!=='object'){invalid++;continue}
  var can=canonical(kind,raw),k=rowKey(kind,raw);if(!k){invalid++;continue}
  k=String(k);var sg=sigObj(can);
  if(seen.has(k)){dups++;continue}
  seen.set(k,sg);
  var old=map.get(k);
  if(old==null)added++;else if(norm(old)===norm(sg)||norm(old)===norm(sigObj(raw)))same++;else changed++;
  records.push({key:k,label:rowLabel(kind,raw),data:can,signature:sg,raw:raw});
 }
 var removed=0;if(complete&&map&&map.size){map.forEach(function(v,k){if(!seen.has(k))removed++})}
 return {records:records,summary:{kind:kind,totalRows:rows.length,valid:records.length,invalid:invalid,duplicates:dups,added:added,changed:changed,same:same,removed:removed,complete:!!complete}};
}
function overlayRecords(importId,kind,records){
 var out=[],type=kind==='point'?'point':kind==='machine'?'machine':kind==='ticket'?'ticket':kind==='message'?'message':'generic';
 for(var i=0;i<records.length;i++){
  var r=records[i],d=r.data||{},primary=r.label||r.key,secondary='';
  if(kind==='point')secondary=[d.address,d.area,d.square].filter(Boolean).join(' • ');
  if(kind==='machine')secondary=[d.pointCode,d.square,d.ip].filter(Boolean).join(' • ');
  if(kind==='message')secondary=[d.group,d.author,d.date].filter(Boolean).join(' • ');
  out.push({t:type,i:-1,k:r.key,primary:primary,secondary:secondary,s:norm([r.key,primary,secondary,JSON.stringify(d)].join(' ')),overlay:true,importId:importId,overlayIndex:i,sig:r.signature});
 }
 return out;
}
self.onmessage=function(ev){
 var d=ev.data||{},id=d.id;
 try{
  if(d.type==='INIT'){
   CORE=Array.isArray(d.records)?d.records:[];COREMAP={point:new Map(),machine:new Map(),ticket:new Map(),group:new Map(),message:new Map()};
   for(var i=0;i<CORE.length;i++)addCoreMap(CORE[i]);
   self.postMessage({id:id,ok:true,type:'INIT',count:CORE.length});return;
  }
  if(d.type==='SEARCH'){self.postMessage({id:id,ok:true,type:'SEARCH',results:search(d.query,d.limit)});return}
  if(d.type==='OVERLAY_SET'){
   var imports=Array.isArray(d.imports)?d.imports:[];OVERLAY=[];
   for(var a=0;a<imports.length;a++){var im=imports[a];OVERLAY=OVERLAY.concat(overlayRecords(im.id,im.kind,im.records||[]))}
   self.postMessage({id:id,ok:true,type:'OVERLAY_SET',count:OVERLAY.length});return;
  }
  if(d.type==='PARSE_IMPORT'){
   var name=String(d.name||''),text=String(d.text||''),rows=[],headers=[],delimiter='',kind='unknown';
   if(/\.json$/i.test(name)||/^\s*[\[{]/.test(text)){
    var parsed=JSON.parse(text);rows=flatJSON(parsed);headers=rows[0]&&typeof rows[0]==='object'?Object.keys(rows[0]):[];
   }else{
    var csv=parseCSV(text);rows=csv.rows;headers=csv.headers;delimiter=csv.delimiter;
   }
   kind=classify(rows);
   var df=diffImport(kind,rows,!!d.complete);
   self.postMessage({id:id,ok:true,type:'PARSE_IMPORT',name:name,headers:headers,delimiter:delimiter,kind:kind,summary:df.summary,records:df.records,sample:df.records.slice(0,8)});return;
  }
  throw new Error('Comando desconhecido do worker.');
 }catch(e){self.postMessage({id:id,ok:false,error:String(e&&e.message||e)})}
};
}\nif(typeof document==='undefined'){prismaV11WorkerMain();}else{window.PRISMA_V11_WORKER_MAIN=prismaV11WorkerMain;}