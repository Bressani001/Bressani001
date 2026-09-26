(function(){
'use strict';
var V={
 version:'11.0.0',
 name:'PRISMA FLOW',
 ready:false,
 worker:null,
 workerReady:false,
 workerSeq:0,
 workerWait:new Map(),
 pages:new Map(),
 settings:{},
 overlays:[],
 lastSearch:'',
 currentPoint:null,
 currentOverlayPoint:null,
 packageDate:'2026-09-21',
 sourceLabel:'PRISMA V10 + V11 FLOW',
 keys:{newbie:'prisma_flow_newbie',activeOverlay:'prisma_flow_active_overlay'}
};
window.PRISMA_V11=V;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function norm(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').trim()}
function fmt(n){return Number(n||0).toLocaleString('pt-BR')}
function nowISO(){return new Date().toISOString()}
function dt(v){try{return new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return String(v||'—')}}
function toast(t){try{if(typeof window.toast==='function'){window.toast(t);return}}catch(e){}var x=document.getElementById('toast');if(x){x.textContent=t;x.classList.add('show');setTimeout(function(){x.classList.remove('show')},1600)}}
function safeOpen(url){if(!url)return;window.open(url,'_blank','noopener,noreferrer')}
function copy(t,msg){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(String(t||'')).then(function(){toast(msg||'Copiado')}).catch(function(){window.prompt('Copie:',t)})}else window.prompt('Copie:',t)}
function idle(){return new Promise(function(resolve){(window.requestIdleCallback||function(cb){setTimeout(cb,0)})(function(){resolve()},{timeout:80})})}
function pointCode(pi){var p=P[pi]||[];return String(p[1]||'')}
function pointName(pi){var p=P[pi]||[];return String(p[2]||'')}
function pointAddress(pi){var p=P[pi]||[];return String(p[3]||'')}
function pointLabel(pi){return '['+pointCode(pi)+'] - '+pointName(pi)}
function pointOps(pi){var p=P[pi]||[];return p[0]?'https://operacoes.eletromidia.com.br/places/'+encodeURIComponent(p[0]):'https://operacoes.eletromidia.com.br/places'}
function machineOps(mi){var m=M[mi]||[];return m[0]?'https://operacoes.eletromidia.com.br/legacy/machines/'+encodeURIComponent(m[0])+'/edit':'https://operacoes.eletromidia.com.br/legacy/machines'}
function machinePoint(mi){var m=M[mi];if(!m)return null;try{var pi=pointMap.get(pkey(m[1],m[5]));return Number.isInteger(pi)?pi:null}catch(e){return null}}
function refsHas(arr,idx){
 if(!Array.isArray(arr))return false;
 for(var i=0;i<arr.length;i++){var v=arr[i];if(Number(v)===idx)return true;if(Array.isArray(v)&&Number(v[0])===idx)return true;if(v&&typeof v==='object'&&Number(v.index!=null?v.index:v.id)===idx)return true}
 return false;
}
function machinesForPoint(pi){
 try{return (machinesByPoint.get(pkey(P[pi][1],P[pi][6]))||[]).slice()}catch(e){
  var code=pointCode(pi),out=[];for(var i=0;i<M.length;i++)if(String(M[i][1]||'')===code)out.push(i);return out;
 }
}
function messagesForPoint(pi){
 var refs=pointMsgMap&&pointMsgMap.get?pointMsgMap.get(pi):[];return (refs||[]).map(function(x){return {i:Number(x[0]),confidence:Number(x[1])||0}}).filter(function(x){return WA.messages[x.i]});
}
function ticketsForPoint(pi){
 var out=[];for(var i=0;i<(WA.tickets||[]).length;i++){var t=WA.tickets[i]||[];if(refsHas(t[2],pi))out.push(i)}return out;
}
function assetsForPoint(pi){
 var out=[];for(var i=0;i<(WA.assets||[]).length;i++){var a=WA.assets[i]||[];if(refsHas(a[2],pi))out.push(i)}return out;
}
function groupStats(pi){
 var refs=messagesForPoint(pi),m=new Map();
 refs.forEach(function(r){var msg=WA.messages[r.i],gi=Number(msg[4]);if(!Number.isInteger(gi))return;var s=m.get(gi)||{group:gi,count:0,strong:0,medium:0,latest:0,score:0};s.count++;if(r.confidence>=.9)s.strong++;else if(r.confidence>=.7)s.medium++;s.latest=Math.max(s.latest,Number(msg[1])||0);s.score+=(r.confidence>=.9?8:r.confidence>=.7?4:1);m.set(gi,s)});
 return Array.from(m.values()).sort(function(a,b){return b.score-a.score||b.count-a.count||b.latest-a.latest});
}
function evidenceLevel(count,strong,medium){
 if(strong>=2||(strong>=1&&count>=3))return {code:'confirmed',label:'CONFIRMADO',className:'ok'};
 if(strong>=1||medium>=2||count>=4)return {code:'probable',label:'PROVÁVEL',className:'warn'};
 if(count>0)return {code:'history',label:'HISTÓRICO',className:'blue'};
 return {code:'none',label:'SEM EVIDÊNCIA',className:'bad'};
}
function log(type,label,meta){if(window.PRISMA_DB)return PRISMA_DB.activity(type,label,meta||{}).catch(function(){})}
V.esc=esc;V.norm=norm;V.fmt=fmt;V.dt=dt;V.toast=toast;V.copy=copy;V.safeOpen=safeOpen;V.pointCode=pointCode;V.pointName=pointName;V.pointAddress=pointAddress;V.pointLabel=pointLabel;V.pointOps=pointOps;V.machineOps=machineOps;V.machinePoint=machinePoint;V.machinesForPoint=machinesForPoint;V.messagesForPoint=messagesForPoint;V.ticketsForPoint=ticketsForPoint;V.assetsForPoint=assetsForPoint;V.groupStats=groupStats;V.evidenceLevel=evidenceLevel;V.log=log;V.refsHas=refsHas;

function styles(){
 if(document.getElementById('prismaV11Styles'))return;
 var st=document.createElement('style');st.id='prismaV11Styles';st.textContent=
 '.flow-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid #3a4048;border-radius:999px;padding:3px 7px;font-size:8px;color:#c6ccd3}.flow-chip.ok{border-color:#286747;color:#75e6af}.flow-chip.warn{border-color:#68531f;color:#ffd16f}.flow-chip.bad{border-color:#703036;color:#ff9298}.flow-chip.blue{border-color:#315d7a;color:#9bd4ff}'+
 '.flow-help{display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;border-radius:50%;border:1px solid #424850;background:#111419;color:#aeb5be;font-size:9px;padding:0;margin-left:4px;vertical-align:middle}.flow-help:hover{border-color:var(--orange);color:#fff}'+
 '.flow-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.flow-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.flow-grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}'+
 '.flow-hero{border:1px solid #5e301d;background:radial-gradient(circle at 90% 0,rgba(255,90,19,.1),transparent 35%),#0d1014;border-radius:13px;padding:15px}.flow-hero h3{margin:0;font-size:20px}.flow-hero h3 b{color:var(--orange)}.flow-hero p{margin:5px 0 0;color:#959da7;font-size:10px;line-height:1.5}'+
 '.flow-command{position:relative;margin-top:12px}.flow-command input{width:100%;height:52px;font-size:16px;padding:0 72px 0 13px}.flow-command span{position:absolute;right:10px;top:14px;border:1px solid #353b43;color:#7f8791;border-radius:5px;padding:4px 6px;font:9px Consolas}'+
 '.flow-actioncard{border:1px solid #30343b;background:#0d1014;border-radius:10px;padding:11px}.flow-actioncard h4{margin:0 0 5px;font-size:11px}.flow-actioncard p{margin:0;color:#9199a3;font-size:9px;line-height:1.45}.flow-actioncard.click{cursor:pointer}.flow-actioncard.click:hover{border-color:var(--orange)}'+
 '.flow-statusgrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}.flow-status{border:1px solid #30343b;background:#0d1014;border-radius:9px;padding:9px;cursor:pointer}.flow-status b{display:block;font-size:18px}.flow-status span{display:block;color:#8d959f;font-size:8px;margin-top:2px}.flow-status.active{border-color:var(--orange)}'+
 '.flow-list{display:flex;flex-direction:column;gap:7px}.flow-row{border:1px solid #2d3239;background:#0d1014;border-radius:9px;padding:9px 10px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.flow-row strong{display:block;font-size:10.5px}.flow-row small{display:block;color:#8c949e;font-size:8.5px;margin-top:3px;line-height:1.4}.flow-row .actions{justify-content:flex-end}'+
 '.flow-360head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start}.flow-360code{font:10px Consolas;color:#ff9a6d}.flow-360head h2{margin:3px 0 0;font-size:23px}.flow-360head p{margin:5px 0 0;color:#9199a3;font-size:9.5px}.flow-recommend{border:1px solid #315d7a;background:#0d151b;border-radius:11px;padding:12px}.flow-recommend.warn{border-color:#68531f;background:#17140d}.flow-recommend.bad{border-color:#703036;background:#180e10}.flow-recommend h4{margin:0 0 5px;font-size:12px}.flow-recommend p{margin:4px 0;color:#cbd0d6;font-size:10px;line-height:1.5}'+
 '.flow-rel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.flow-relbox{border:1px solid #2d3239;background:#0d1014;border-radius:10px;padding:10px}.flow-relbox h4{margin:0 0 7px;font-size:10px}.flow-relbox .count{color:var(--orange);font-weight:800}.flow-relitem{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #24292f;border-radius:0;background:transparent;padding:6px 0;font-size:9px}.flow-relitem:last-child{border-bottom:0}.flow-relitem small{display:block;color:#838b95;font-size:8px;margin-top:2px}'+
 '.flow-paletteback{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:420;display:none;align-items:flex-start;justify-content:center;padding-top:8vh}.flow-paletteback.open{display:flex}.flow-palette{width:min(900px,94vw);max-height:82vh;overflow:auto;background:#0c0f12;border:1px solid #454c55;border-radius:14px;box-shadow:0 30px 90px #000}.flow-pal-search{padding:12px;position:sticky;top:0;background:#0c0f12;z-index:2;border-bottom:1px solid #282d34}.flow-pal-search input{width:100%;height:52px;font-size:17px}.flow-palbody{padding:10px}.flow-palrow{display:grid;grid-template-columns:90px minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border-bottom:1px solid #24292f}.flow-palrow:last-child{border-bottom:0}.flow-palrow .type{font-size:8px;text-transform:uppercase;color:#777f89}.flow-palrow strong{display:block;font-size:10.5px}.flow-palrow small{display:block;color:#89919b;font-size:8.5px;margin-top:2px}'+
 '.flow-tip{border:1px dashed #3a4048;background:#0c0f12;border-radius:9px;padding:8px 10px;color:#8f97a1;font-size:9px;line-height:1.45}.newbie .flow-tip{border-color:#6b351e;color:#d5d9df;background:#14100e}.newbie [data-newbie-only]{display:block!important}[data-newbie-only]{display:none}'+
 '.flow-health{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.flow-healthcard{border:1px solid #30343b;background:#0d1014;border-radius:10px;padding:10px}.flow-healthcard b{font-size:17px;display:block}.flow-healthcard span{display:block;color:#8f97a1;font-size:8.5px;margin-top:3px;line-height:1.4}'+
 '.flow-drop{border:1px dashed #4b515a;border-radius:12px;padding:24px;text-align:center;background:#0c0f12}.flow-drop.drag{border-color:var(--orange);background:#15100d}.flow-import-sample{overflow:auto;max-height:280px}.flow-import-sample table{min-width:700px}'+
 '.flow-modalback{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:430;display:none;align-items:center;justify-content:center;padding:16px}.flow-modalback.open{display:flex}.flow-modal{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#0d1014;border:1px solid #444b54;border-radius:13px;padding:14px;box-shadow:0 24px 80px #000}.flow-modal h3{margin:0 0 8px}.flow-formgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.flow-formgrid .full{grid-column:1/-1}.flow-formgrid input,.flow-formgrid select,.flow-formgrid textarea{width:100%}.flow-formgrid textarea{min-height:100px}'+
 '@media(max-width:1100px){.flow-statusgrid{grid-template-columns:repeat(3,1fr)}.flow-grid4,.flow-health{grid-template-columns:repeat(2,1fr)}.flow-rel{grid-template-columns:1fr 1fr}}@media(max-width:760px){.flow-grid2,.flow-grid3,.flow-grid4,.flow-health,.flow-rel,.flow-formgrid,.flow-360head{grid-template-columns:1fr}.flow-statusgrid{grid-template-columns:repeat(2,1fr)}.flow-formgrid .full{grid-column:auto}.flow-palrow{grid-template-columns:1fr}.flow-palrow .type{margin-bottom:-3px}}';
 document.head.appendChild(st);
}
function help(title,text){return '<button class="flow-help" type="button" data-flow-help="'+esc(text)+'" data-flow-help-title="'+esc(title)+'">?</button>'}
V.help=help;

function pages(){
 var main=document.querySelector('.main')||document.querySelector('main');if(!main)return;
 ['flowToday','flow360','flowRelations','flowUpdate','flowHealth'].forEach(function(id){if(!document.getElementById(id)){var s=document.createElement('section');s.id=id;s.className='page';main.appendChild(s)}});
 if(!document.getElementById('flowPaletteBack')){var p=document.createElement('div');p.id='flowPaletteBack';p.className='flow-paletteback';p.innerHTML='<div class="flow-palette"><div class="flow-pal-search"><input id="flowPaletteInput" autocomplete="off" placeholder="Buscar ponto, máquina, chamado, grupo, mensagem, tarefa…"></div><div class="flow-palbody" id="flowPaletteBody"></div></div>';document.body.appendChild(p)}
 if(!document.getElementById('flowModalBack')){var m=document.createElement('div');m.id='flowModalBack';m.className='flow-modalback';m.innerHTML='<div class="flow-modal" id="flowModal"></div>';document.body.appendChild(m)}
 if(!document.getElementById('flowTipPop')){var tp=document.createElement('div');tp.id='flowTipPop';tp.className='prisma-pop';document.body.appendChild(tp)}
}
function nav(){
 var side=document.querySelector('.side');if(!side||document.getElementById('flowNav'))return;
 var ng=document.createElement('div');ng.className='navgroup';ng.id='flowNav';
 ng.innerHTML='<div class="navtitle">PRISMA FLOW</div><button class="navbtn" data-page="flowToday">Meu Turno <span class="n">V11</span></button><button class="navbtn" data-page="flow360">Ponto 360º</button><button class="navbtn" data-page="flowRelations">Relações</button><button class="navbtn" data-page="flowUpdate">Atualizar bases</button><button class="navbtn" data-page="flowHealth">Saúde das bases</button><button class="navbtn" id="flowNewbieBtn">Modo Novo no NOC <span class="n" id="flowNewbieState">OFF</span></button>';
 var action=document.getElementById('prismaActionNav');if(action)side.insertBefore(ng,action);else{var logo=side.querySelector('.logo');if(logo&&logo.nextSibling)side.insertBefore(ng,logo.nextSibling);else side.appendChild(ng)}
 ng.querySelectorAll('.navbtn[data-page]').forEach(function(b){b.onclick=function(){V.activate(b.dataset.page)}});
 document.getElementById('flowNewbieBtn').onclick=function(){V.toggleNewbie()};
}
V.activate=function(id){
 try{currentPage=id}catch(e){}
 document.querySelectorAll('.page').forEach(function(x){x.classList.toggle('active',x.id===id)});
 document.querySelectorAll('.navbtn[data-page]').forEach(function(x){x.classList.toggle('active',x.dataset.page===id)});
 var fn=V.pages.get(id);if(fn)Promise.resolve(fn()).catch(function(e){console.error('PRISMA V11 page',id,e);toast('Erro ao abrir '+id)});
 window.scrollTo(0,0);log('navegacao','Abriu '+id,{page:id});
};

function registerPage(id,render){V.pages.set(id,render)}
V.registerPage=registerPage;

function workerStart(){
 try{
  if(!window.PRISMA_V11_WORKER_MAIN)throw new Error('factory ausente');
  var src='('+window.PRISMA_V11_WORKER_MAIN.toString()+')();',blob=new Blob([src],{type:'text/javascript'}),url=URL.createObjectURL(blob);
  V.worker=new Worker(url);setTimeout(function(){URL.revokeObjectURL(url)},3000);
  V.worker.onmessage=function(ev){var d=ev.data||{},w=V.workerWait.get(d.id);if(!w)return;V.workerWait.delete(d.id);if(d.ok)w.resolve(d);else w.reject(new Error(d.error||'Worker falhou'))};
  V.worker.onerror=function(e){console.warn('PRISMA V11 worker',e);V.workerReady=false};
  return true;
 }catch(e){console.warn('Worker indisponível; fallback local ativo.',e);V.worker=null;V.workerReady=false;return false}
}
function rpc(type,data){
 if(!V.worker)return Promise.reject(new Error('worker indisponível'));
 var id='w'+(++V.workerSeq)+'_'+Date.now(),payload=Object.assign({id:id,type:type},data||{});
 return new Promise(function(resolve,reject){V.workerWait.set(id,{resolve:resolve,reject:reject});V.worker.postMessage(payload);setTimeout(function(){if(V.workerWait.has(id)){V.workerWait.delete(id);reject(new Error('timeout do worker'))}},30000)});
}
V.rpc=rpc;

function sigPoint(p){return norm([p[0],p[1],p[2],p[3],p[10],p[6]].join('|'))}
function sigMachine(m){return norm([m[0],m[1],m[2],m[4],m[5],m[6],m[7]].join('|'))}
async function buildIndex(){
 var records=[],batch=3500;
 async function loop(arr,fn){for(var i=0;i<arr.length;i++){var r=fn(arr[i],i);if(r)records.push(r);if(i&&i%batch===0)await idle()}}
 await loop(P,function(p,i){var primary=String(p[1]||''),name=String(p[2]||'');return {t:'point',i:i,k:String(p[0]||primary),keys:[String(p[0]||''),primary],primary:primary,secondary:name+' • '+String(p[3]||''),s:norm([p[0],p[1],p[2],p[3],p[6],p[10]].join(' ')),sig:sigPoint(p)}});
 await loop(M,function(m,i){return {t:'machine',i:i,k:String(m[0]||''),keys:[String(m[0]||'')],primary:String(m[0]||''),secondary:String(m[2]||'')+' • ponto '+String(m[1]||''),s:norm([m[0],m[1],m[2],m[3],m[4],m[5],m[6],m[7],m[8]].join(' ')),sig:sigMachine(m)}});
 await loop(WA.groups||[],function(g,i){return {t:'group',i:i,k:String(g.name||''),primary:String(g.name||''),secondary:String(g.category||''),s:norm([g.name,g.category,(g.regionHints||[]).join(' ')].join(' ')),sig:norm([g.name,g.category].join('|'))}});
 await loop(WA.tickets||[],function(t,i){return {t:'ticket',i:i,k:String(t[0]||''),primary:String(t[0]||''),secondary:fmt((t[1]||[]).length)+' ocorrência(s)',s:norm([t[0]].join(' ')),sig:norm(String(t[0]||''))}});
 await loop(WA.messages||[],function(m,i){var g=WA.groups[m[4]]||{},text=String(m[6]||m[10]||'');return {t:'message',i:i,k:String(m[0]||i),primary:String(g.name||'WhatsApp'),secondary:String(m[5]||'')+' • '+String(m[2]||''),s:norm([g.name,m[5],m[2],m[3],text.slice(0,900)].join(' ')),sig:norm([m[0],g.name,m[5],text].join('|'))}});
 V.fallbackRecords=records;
 if(V.worker){try{var r=await rpc('INIT',{records:records});V.workerReady=true;console.info('PRISMA V11 worker index',r.count)}catch(e){console.warn(e);V.workerReady=false}}
 return records.length;
}
function fallbackSearch(query,limit){
 var q=norm(query),t=q.split(/\s+/).filter(Boolean),out=[],arr=V.fallbackRecords||[],max=limit||40;if(!q)return [];
 for(var i=0;i<arr.length;i++){var r=arr[i],s=r.s||'',ok=t.every(function(x){return s.indexOf(x)>=0});if(!ok)continue;var score=(r.k&&norm(r.k)===q?10000:0)+(r.primary&&norm(r.primary)===q?8500:0)+(s.indexOf(q)>=0?1200:0);out.push({score:score,t:r.t,i:r.i,k:r.k,primary:r.primary,secondary:r.secondary,overlay:false})}
 out.sort(function(a,b){return b.score-a.score});return out.slice(0,max);
}
V.search=function(query,limit){
 V.lastSearch=String(query||'');log('busca','Busca: '+V.lastSearch,{query:V.lastSearch});
 if(V.workerReady)return rpc('SEARCH',{query:query,limit:limit||50}).then(function(x){return x.results||[]}).catch(function(){return fallbackSearch(query,limit)});
 return Promise.resolve(fallbackSearch(query,limit));
};

function entityActions(r){
 if(r.overlay)return '<button data-flow-overlay="'+esc(r.importId)+'" data-flow-overlay-index="'+r.overlayIndex+'" data-flow-overlay-kind="'+esc(r.t)+'">Abrir importado</button>';
 if(r.t==='point')return '<button class="primary" data-flow-360="'+r.i+'">360º</button><button data-flow-open-point="'+r.i+'">Detalhes</button><a href="'+esc(pointOps(r.i))+'" target="_blank" rel="noopener">Operações ↗</a>';
 if(r.t==='machine')return '<button data-flow-open-machine="'+r.i+'">Detalhes</button><a href="'+esc(machineOps(r.i))+'" target="_blank" rel="noopener">Operações ↗</a>';
 if(r.t==='group')return '<button data-flow-open-group="'+r.i+'">Grupo</button><button data-flow-group-routes="'+r.i+'">Rotas</button>';
 if(r.t==='ticket')return '<button data-flow-open-ticket="'+r.i+'">Chamado</button>';
 if(r.t==='message')return '<button data-flow-open-msg="'+r.i+'">Evidência</button>';
 return '';
}
function typeName(t){return {point:'Ponto',machine:'Máquina',group:'Grupo',ticket:'Chamado',message:'Mensagem',generic:'Importado'}[t]||t}
function renderPaletteResults(results){
 var body=document.getElementById('flowPaletteBody');if(!body)return;
 if(!results.length){body.innerHTML='<div class="empty">Nada encontrado.</div>';return}
 body.innerHTML=results.map(function(r){return '<div class="flow-palrow"><span class="type">'+typeName(r.t)+(r.overlay?' • overlay':'')+'</span><div><strong>'+esc(r.primary||r.k)+'</strong><small>'+esc(r.secondary||'')+'</small></div><div class="actions">'+entityActions(r)+'</div></div>'}).join('');
}
function openPalette(seed){
 var back=document.getElementById('flowPaletteBack'),q=document.getElementById('flowPaletteInput');back.classList.add('open');q.value=seed||'';q.focus();if(q.value)V.search(q.value,60).then(renderPaletteResults);else renderPaletteResults([])
}
function closePalette(){var x=document.getElementById('flowPaletteBack');if(x)x.classList.remove('open')}
V.openPalette=openPalette;V.closePalette=closePalette;

function installPaletteEvents(){
 var q=document.getElementById('flowPaletteInput'),timer;
 q.oninput=function(){clearTimeout(timer);var v=q.value;timer=setTimeout(function(){if(!v.trim())renderPaletteResults([]);else V.search(v,60).then(renderPaletteResults)},110)};
 q.onkeydown=function(e){if(e.key==='Escape')closePalette()};
 var back=document.getElementById('flowPaletteBack');back.onclick=function(e){if(e.target===back)closePalette()};
 document.addEventListener('keydown',function(e){
  var tag=(document.activeElement&&document.activeElement.tagName||'').toLowerCase();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette('');return}
  if(e.key==='/'&&!/input|textarea|select/.test(tag)){e.preventDefault();openPalette('');return}
  if(e.key==='Escape'){closePalette();var mb=document.getElementById('flowModalBack');if(mb)mb.classList.remove('open')}
 });
}

function showHelp(btn){
 var pop=document.getElementById('flowTipPop'),r=btn.getBoundingClientRect();if(!pop)return;
 pop.innerHTML='<b>'+esc(btn.dataset.flowHelpTitle||'Ajuda')+'</b><br>'+esc(btn.dataset.flowHelp||'');
 pop.style.left=Math.min(window.innerWidth-330,Math.max(8,r.left))+'px';pop.style.top=Math.min(window.innerHeight-150,r.bottom+6)+'px';pop.classList.add('open');
}
function groupRoutes(gi){
 var b=document.querySelector('.navbtn[data-page="groupRoutes"]');if(b)b.click();
 setTimeout(function(){var q=document.getElementById('noc8GroupQuery');if(q){q.value=(WA.groups[gi]||{}).name||'';q.dispatchEvent(new Event('input',{bubbles:true}));q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}},100);
}
V.groupRoutes=groupRoutes;

function globalClicks(){
 document.addEventListener('click',function(e){
  var hb=e.target.closest('[data-flow-help]');if(hb){e.preventDefault();showHelp(hb);return}else{var p=document.getElementById('flowTipPop');if(p&&!e.target.closest('#flowTipPop'))p.classList.remove('open')}
  var b=e.target.closest('[data-flow-360],[data-flow-open-point],[data-flow-open-machine],[data-flow-open-group],[data-flow-open-ticket],[data-flow-open-msg],[data-flow-group-routes],[data-flow-overlay]');
  if(!b)return;
  closePalette();
  if(b.dataset.flow360!=null){V.currentPoint=Number(b.dataset.flow360);V.activate('flow360');return}
  if(b.dataset.flowOpenPoint!=null){openP(Number(b.dataset.flowOpenPoint));log('abrir_ponto','Abriu '+pointLabel(Number(b.dataset.flowOpenPoint)),{point:Number(b.dataset.flowOpenPoint)});return}
  if(b.dataset.flowOpenMachine!=null){openM(Number(b.dataset.flowOpenMachine));log('abrir_maquina','Abriu máquina '+String((M[Number(b.dataset.flowOpenMachine)]||[])[0]||''),{machine:Number(b.dataset.flowOpenMachine)});return}
  if(b.dataset.flowOpenGroup!=null){if(typeof openGroup==='function')openGroup(Number(b.dataset.flowOpenGroup));log('abrir_grupo','Abriu grupo '+String((WA.groups[Number(b.dataset.flowOpenGroup)]||{}).name||''),{group:Number(b.dataset.flowOpenGroup)});return}
  if(b.dataset.flowOpenTicket!=null){openTicket(Number(b.dataset.flowOpenTicket));log('abrir_chamado','Abriu chamado '+String((WA.tickets[Number(b.dataset.flowOpenTicket)]||[])[0]||''),{ticket:Number(b.dataset.flowOpenTicket)});return}
  if(b.dataset.flowOpenMsg!=null){openMsg(Number(b.dataset.flowOpenMsg));log('abrir_evidencia','Abriu evidência WhatsApp',{message:Number(b.dataset.flowOpenMsg)});return}
  if(b.dataset.flowGroupRoutes!=null){groupRoutes(Number(b.dataset.flowGroupRoutes));return}
  if(b.dataset.flowOverlay!=null&&V.openOverlay) V.openOverlay(b.dataset.flowOverlay,Number(b.dataset.flowOverlayIndex),b.dataset.flowOverlayKind);
 });
 document.addEventListener('click',function(e){var a=e.target.closest('a[href*="operacoes.eletromidia.com.br"]');if(a)log('operacoes','Abriu Operações',{url:a.href})},true);
}

function patchCoreFunctions(){
 if(typeof window.openP==='function'&&!V._openP){V._openP=window.openP;window.openP=async function(i){var r=await V._openP(i);log('abrir_ponto','Abriu '+pointLabel(i),{point:i});return r}}
 if(typeof window.openM==='function'&&!V._openM){V._openM=window.openM;window.openM=async function(i){var r=await V._openM(i);log('abrir_maquina','Abriu máquina '+String((M[i]||[])[0]||''),{machine:i});return r}}
 if(typeof window.openTicket==='function'&&!V._openTicket){V._openTicket=window.openTicket;window.openTicket=function(i){var r=V._openTicket(i);log('abrir_chamado','Abriu chamado '+String((WA.tickets[i]||[])[0]||''),{ticket:i});return r}}
 if(typeof window.openGroup==='function'&&!V._openGroup){V._openGroup=window.openGroup;window.openGroup=function(i){var r=V._openGroup(i);log('abrir_grupo','Abriu grupo '+String((WA.groups[i]||{}).name||''),{group:i});return r}}
}

V.toggleNewbie=function(){
 var next=!document.body.classList.contains('newbie');document.body.classList.toggle('newbie',next);V.settings.newbie=next;
 if(PRISMA_DB)PRISMA_DB.setSetting(V.keys.newbie,next).catch(function(){});
 var s=document.getElementById('flowNewbieState');if(s)s.textContent=next?'ON':'OFF';toast(next?'Modo Novo no NOC ativado':'Modo Novo no NOC desativado');log('configuracao','Modo Novo no NOC '+(next?'ativado':'desativado'));
};
function loadSettings(){
 if(!window.PRISMA_DB)return Promise.resolve();
 return Promise.all([PRISMA_DB.setting(V.keys.newbie,false),PRISMA_DB.all('imports')]).then(function(x){
  V.settings.newbie=!!x[0];V.overlays=(x[1]||[]).filter(function(i){return i.active!==false});
  document.body.classList.toggle('newbie',V.settings.newbie);var st=document.getElementById('flowNewbieState');if(st)st.textContent=V.settings.newbie?'ON':'OFF';
  if(V.worker&&V.overlays.length)return rpc('OVERLAY_SET',{imports:V.overlays}).catch(function(){});
 });
}
function topVersion(){
 var b=document.getElementById('topBadges');if(b&&!b.querySelector('.flow-v11-badge'))b.insertAdjacentHTML('afterbegin','<span class="badge orange flow-v11-badge">PRISMA FLOW V11</span>');
 document.title='PRISMA FLOW V11 • NOC Workspace';
}

async function boot(){
 var start=Date.now(),timer=setInterval(async function(){
  var ok=false;try{ok=window.__ELETRO_V7_READY__===true&&window.PRISMA&&window.PRISMA.version&&window.PRISMA_DB&&typeof P!=='undefined'&&P.length&&typeof M!=='undefined'&&M.length&&typeof WA!=='undefined'&&WA&&Array.isArray(WA.messages)}catch(e){}
  if(ok){
   clearInterval(timer);
   try{
    styles();pages();nav();topVersion();installPaletteEvents();globalClicks();patchCoreFunctions();
    await PRISMA_DB.open();await PRISMA_DB.migrateLegacy();workerStart();
    await buildIndex();await loadSettings();
    V.ready=true;document.documentElement.dataset.prismaV11='ready';log('sistema','PRISMA FLOW V11 iniciado',{version:V.version,indexed:V.fallbackRecords.length});
    document.dispatchEvent(new CustomEvent('prisma-v11-ready',{detail:{version:V.version}}));
    setTimeout(function(){V.activate('flowToday')},50);
    console.info('PRISMA FLOW V11 pronto',{records:V.fallbackRecords.length,worker:V.workerReady,overlays:V.overlays.length});
   }catch(e){console.error('PRISMA V11 boot',e);document.documentElement.dataset.prismaV11='error';toast('PRISMA V11 carregou com erro: '+(e.message||e))}
  }else if(Date.now()-start>40000){clearInterval(timer);console.error('PRISMA V11: base não ficou pronta em 40s');document.documentElement.dataset.prismaV11='timeout'}
 },120);
}
V._boot=boot;
boot();
})();