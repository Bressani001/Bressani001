(function(){
'use strict';

var P10={
  version:'10.0.0',
  installed:false,
  pointBlobs:[],
  machineBlobs:[],
  groupBlobs:[],
  ticketBlobs:[],
  currentResults:null,
  compose:{point:null,machine:null,group:null,channel:'whatsapp',ticket:'',mention:'',obs:'',template:''},
  keys:{
    templates:'prisma_templates_v10',
    whatsappLinks:'prisma_whatsapp_links_v10',
    slackChannels:'prisma_slack_channels_v10',
    contacts:'prisma_contacts_v10',
    ticketMap:'prisma_ops_ticket_map_v10',
    recent:'prisma_recent_search_v10'
  }
};
window.PRISMA=P10;

function pe(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function pn(v){try{return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').trim()}catch(e){return String(v||'').toLowerCase().trim()}}
function pc(v){return pn(v).replace(/[^a-z0-9]+/g,'')}
function pf(v){return Number(v||0).toLocaleString('pt-BR')}
function load(k,f){try{var x=JSON.parse(localStorage.getItem(k));return x==null?f:x}catch(e){return f}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){console.warn('PRISMA localStorage',e);return false}}
function ptoast(t){try{if(typeof toast==='function'){toast(t);return}}catch(e){} var x=document.getElementById('toast');if(x){x.textContent=t;x.classList.add('show');setTimeout(function(){x.classList.remove('show')},1600)}}
function copyText(t,msg){if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(t).then(function(){ptoast(msg||'Copiado')}).catch(function(){window.prompt('Copie:',t)})}window.prompt('Copie:',t);return Promise.resolve()}
function opsPointUrl(pi){var p=P[pi]||[];return p[0]?'https://operacoes.eletromidia.com.br/places/'+encodeURIComponent(p[0]):'https://operacoes.eletromidia.com.br/places'}
function opsMachineUrl(mi){var m=M[mi]||[];return m[0]?'https://operacoes.eletromidia.com.br/legacy/machines/'+encodeURIComponent(m[0])+'/edit':'https://operacoes.eletromidia.com.br/legacy/machines'}
function ticketMap(){return load(P10.keys.ticketMap,{})||{}}
function opsTicketUrl(ticket){var v=ticketMap()[String(ticket||'')];if(!v)return '';v=String(v).trim();if(/^https?:\/\//i.test(v))return v;if(/^\d+$/.test(v))return 'https://operacoes.eletromidia.com.br/tickets/'+v+'/edit';return ''}
function pointFromMachine(mi){var m=M[mi];if(!m)return null;try{var pi=pointMap.get(pkey(m[1],m[5]));return Number.isInteger(pi)?pi:null}catch(e){return null}}
function groupName(gi){return (WA.groups[gi]&&WA.groups[gi].name)||('Grupo '+gi)}
function pointName(pi){var p=P[pi]||[];return String(p[2]||p[1]||'')}
function machineName(mi){var m=M[mi]||[];return String(m[2]||m[0]||'')}
function pointAddress(pi){var p=P[pi]||[];return String(p[3]||'')}
function fmtPoint(pi){var p=P[pi]||[];return (p[1]?'['+p[1]+'] ':'')+(p[2]||'')}
function fmtMachine(mi){var m=M[mi]||[];return (m[0]?'['+m[0]+'] ':'')+(m[2]||'')}
function safeOpen(url){if(!url)return;window.open(url,'_blank','noopener,noreferrer')}

function defaults(){
 return [
  {id:'verificacao',title:'Solicitar verificação',body:'Boa tarde, pessoal.\n\nIdentificamos uma ocorrência[[ no ponto {COD_PONTO} - {PONTO}]][[ na máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem verificar, por favor?[[\n\nObservação: {OBS}]]'},
  {id:'sem_midia',title:'Sem mídia / conteúdo',body:'Boa tarde, pessoal.\n\nIdentificamos o ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]] sem mídia ou com conteúdo fora do esperado.[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem verificar, por favor?[[\n\nObservação: {OBS}]]'},
  {id:'offline',title:'Offline / sem acesso',body:'Boa tarde, pessoal.\n\nO ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]] está sem acesso/offline no momento.[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem validar, por favor?[[\n\nObservação: {OBS}]]'},
  {id:'hardware',title:'Tela / hardware / energia',body:'Boa tarde, pessoal.\n\nPrecisamos de verificação física no ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem verificar tela, energia, cabeamento e equipamento, por favor?[[\n\nObservação: {OBS}]]'},
  {id:'rede',title:'Rede / internet',body:'Boa tarde, pessoal.\n\nIdentificamos possível indisponibilidade de rede no ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem validar a conectividade, por favor?[[\n\nObservação: {OBS}]]'},
  {id:'retorno',title:'Cobrança de retorno',body:'Boa tarde, pessoal.\n\nConseguem nos atualizar sobre a tratativa[[ do ponto {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]][[ / chamado {CHAMADO}]]?[[\n\n{MENCION}, consegue nos apoiar com um retorno?]][[\n\nObservação: {OBS}]]'},
  {id:'normalizado',title:'Normalizado / restabelecido',body:'Boa tarde, pessoal.\n\nO ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]] voltou a operar normalmente.[[\nChamado: {CHAMADO}.]][[\n\nObservação: {OBS}]]'},
  {id:'tecnico',title:'Acionamento técnico',body:'Boa tarde, pessoal.\n\nSolicitamos apoio técnico para o ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem seguir com a tratativa, por favor?[[\n\nObservação: {OBS}]]'}
 ];
}
function templates(){var t=load(P10.keys.templates,null);if(!Array.isArray(t)||!t.length){t=defaults();save(P10.keys.templates,t)}return t}
function whatsappLinks(){return load(P10.keys.whatsappLinks,{})||{}}
function slackChannels(){var x=load(P10.keys.slackChannels,[]);return Array.isArray(x)?x:[]}
function contacts(){var x=load(P10.keys.contacts,[]);return Array.isArray(x)?x:[]}

function styles(){
 if(document.getElementById('prismaV10Styles'))return;
 var st=document.createElement('style');st.id='prismaV10Styles';st.textContent=`
 .prisma-brand{display:flex;align-items:center;gap:9px;padding:2px 5px 15px}
 .prisma-brand img{width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 12px rgba(255,90,19,.18))}
 .prisma-brand strong{display:block;font-size:19px;letter-spacing:.08em}.prisma-brand strong b{color:var(--orange)}
 .prisma-brand small{display:block;color:#777f89;font-size:8px;line-height:1.35;margin-top:2px;max-width:150px}
 .prisma-homehero{padding:18px;border:1px solid #5e301d;background:radial-gradient(circle at 85% 0,rgba(255,90,19,.10),transparent 38%),#0d0f12;border-radius:14px}
 .prisma-homehead{display:flex;gap:16px;align-items:center}.prisma-homehead img{width:72px;height:72px;object-fit:contain}
 .prisma-homehead h2{margin:0;font-size:27px;letter-spacing:.08em}.prisma-homehead h2 b{color:var(--orange)}
 .prisma-homehead p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.5}
 .prisma-quicksearch{position:relative;margin-top:15px}.prisma-quicksearch input{width:100%;height:54px;font-size:17px;padding:0 50px 0 15px;border-color:#434951}
 .prisma-searchkbd{position:absolute;right:12px;top:14px;border:1px solid #343a42;border-radius:6px;padding:4px 7px;color:#7f8791;font:10px Consolas}
 .prisma-quickgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:11px}.prisma-quick{padding:11px;text-align:left;background:#111419}
 .prisma-quick b{display:block;font-size:11px}.prisma-quick span{display:block;color:var(--muted);font-size:8.5px;margin-top:3px;line-height:1.35}
 .prisma-searchout{margin-top:12px}.prisma-result-section{margin-top:10px}.prisma-result-title{display:flex;justify-content:space-between;align-items:center;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#7f8791;padding:0 2px 5px}
 .prisma-result-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.prisma-result{border:1px solid #2c3138;background:#0d1014;border-radius:9px;padding:9px 10px}
 .prisma-result:hover{border-color:#4a515a}.prisma-result strong{display:block;font-size:11px}.prisma-result small{display:block;color:#8d959f;font-size:8.5px;margin-top:3px;line-height:1.35}
 .prisma-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.prisma-actions button,.prisma-actions a{font-size:8.5px;padding:5px 7px;border-radius:6px;text-decoration:none;color:#fff;background:#171a1f;border:1px solid #30343b}
 .prisma-actions .hot{background:var(--orange);border-color:var(--orange)}.prisma-actions a:hover{border-color:var(--orange)}
 .prisma-help{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid #424850;color:#aab1ba;background:#111419;padding:0;font-size:9px;vertical-align:middle;margin-left:4px}
 .prisma-help:hover{color:white;border-color:var(--orange)}.prisma-pop{position:fixed;z-index:300;max-width:320px;padding:9px 10px;border:1px solid #4a5059;background:#111419;box-shadow:0 14px 42px #000;border-radius:9px;font-size:9.5px;line-height:1.45;color:#d6d9de;display:none}
 .prisma-pop.open{display:block}.prisma-pop b{color:#ff9a6d}
 .prisma-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.prisma-tab.active{background:var(--orange);border-color:var(--orange)}
 .prisma-pane{display:none}.prisma-pane.active{display:block}.prisma-compose-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(340px,.75fr);gap:12px}
 .prisma-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.prisma-form .full{grid-column:1/-1}.prisma-lab{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#7f8791;margin:0 0 4px 2px}
 .prisma-field input,.prisma-field select,.prisma-field textarea{width:100%}.prisma-field textarea{min-height:95px}
 .prisma-checks{display:flex;gap:6px;flex-wrap:wrap}.prisma-check{display:flex;align-items:center;gap:5px;border:1px solid #30343b;background:#0c0e11;border-radius:7px;padding:6px 8px;font-size:9px;color:#b8bec6}
 .prisma-check input{width:auto;height:auto;margin:0}.prisma-context{border:1px solid #30343b;background:#0d1014;border-radius:10px;padding:10px;margin-top:8px}
 .prisma-context strong{font-size:11px}.prisma-context small{display:block;color:#8c949e;font-size:8.5px;margin-top:3px}.prisma-context .none{color:#707780}
 .prisma-suggest{position:absolute;left:0;right:0;top:100%;z-index:70;background:#111419;border:1px solid #3a4048;border-radius:8px;box-shadow:0 16px 45px #000;max-height:280px;overflow:auto;display:none}
 .prisma-suggest.open{display:block}.prisma-suggest button{display:block;width:100%;border:0;border-bottom:1px solid #252a30;border-radius:0;background:transparent;text-align:left;padding:8px 9px}.prisma-suggest button:last-child{border-bottom:0}
 .prisma-suggest button strong{display:block;font-size:10px}.prisma-suggest button small{display:block;color:#8c949e;font-size:8px;margin-top:2px}
 .prisma-relative{position:relative}.prisma-preview{width:100%;min-height:270px;font-size:12px;line-height:1.5}
 .prisma-sidecard{border:1px solid #30343b;background:#0d1014;border-radius:10px;padding:11px;margin-bottom:9px}.prisma-sidecard h4{margin:0 0 7px;font-size:11px}
 .prisma-muted{color:#8c949e;font-size:9px;line-height:1.45}.prisma-destrow{display:grid;grid-template-columns:1fr 1fr auto;gap:7px;align-items:end;margin:8px 0}
 .prisma-listrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border-bottom:1px solid #272c32;padding:7px 0}.prisma-listrow:last-child{border-bottom:0}
 .prisma-listrow strong{font-size:10px}.prisma-listrow small{display:block;color:#868e98;font-size:8px;margin-top:2px;word-break:break-all}
 .prisma-modalback{position:fixed;inset:0;background:rgba(0,0,0,.80);z-index:260;display:none;align-items:center;justify-content:center;padding:18px}.prisma-modalback.open{display:flex}
 .prisma-modal{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#0d1014;border:1px solid #444b54;border-radius:13px;box-shadow:0 24px 80px #000;padding:14px}
 .prisma-modal h3{margin:0;font-size:16px}.prisma-modal .dest{color:#ff9a6d;font-size:10px;margin-top:4px}.prisma-modal textarea{width:100%;min-height:250px;margin-top:10px;font-size:12px;line-height:1.5}
 .prisma-opgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:11px 0}.prisma-opcard{border:1px solid #30343b;background:#0d1014;border-radius:10px;padding:10px;text-decoration:none;color:white}
 .prisma-opcard:hover{border-color:var(--orange)}.prisma-opcard b{display:block;font-size:11px}.prisma-opcard span{display:block;color:#8d959f;font-size:8px;margin-top:3px}
 .prisma-ops-search{display:grid;grid-template-columns:1fr 140px;gap:8px}.prisma-version{color:#ff9a6d!important;font-weight:700}
 .prisma-drawerbar{border:1px solid #4a351f;background:#15110e;border-radius:9px;padding:9px;margin-bottom:10px}.prisma-drawerbar h4{margin:0 0 6px;font-size:9px;color:#ff9a6d;letter-spacing:.08em}
 @media(max-width:1100px){.prisma-quickgrid,.prisma-opgrid{grid-template-columns:repeat(2,1fr)}.prisma-compose-grid{grid-template-columns:1fr}}
 @media(max-width:720px){.prisma-result-list,.prisma-form,.prisma-ops-search{grid-template-columns:1fr}.prisma-form .full{grid-column:auto}.prisma-quickgrid,.prisma-opgrid{grid-template-columns:1fr}.prisma-homehead img{width:50px;height:50px}}
 `;
 document.head.appendChild(st);
}

function helpButton(title,text){return '<button class="prisma-help" type="button" data-prisma-help-title="'+pe(title)+'" data-prisma-help="'+pe(text)+'" aria-label="Ajuda: '+pe(title)+'">?</button>'}

function brand(){
 document.title='PRISMA • NOC Workspace';
 var old=document.querySelector('.side > .logo');
 if(old){
   old.className='logo';
   old.innerHTML='<div class="prisma-brand"><img src="prisma_mark.png" alt=""><div><strong>PRISM<b>A</b></strong><small>Plataforma de Roteamento, Informação, Suporte, Mensagens e Acessos</small></div></div>';
 }
 var top=document.querySelector('.top > div:first-child');
 if(top)top.innerHTML='<h2>PRISM<b>A</b></h2><p>Workspace operacional do NOC • encontre, entenda e encaminhe</p>';
 var lb=document.querySelector('.loadbox h2');if(lb)lb.innerHTML='PRISM<b>A</b>';
 var lp=document.getElementById('loadText');if(lp&&!pn(lp.textContent).includes('prisma'))lp.textContent='Carregando workspace operacional e conectando evidências…';
}

function activate(id){
 try{currentPage=id}catch(e){}
 document.querySelectorAll('.page').forEach(function(x){x.classList.toggle('active',x.id===id)});
 document.querySelectorAll('.navbtn[data-page]').forEach(function(x){x.classList.toggle('active',x.dataset.page===id)});
 window.scrollTo(0,0);
}

function installNav(){
 var side=document.querySelector('.side');if(!side||document.getElementById('prismaActionNav'))return;
 var brandNode=side.querySelector('.logo');
 var ng=document.createElement('div');ng.className='navgroup';ng.id='prismaActionNav';
 ng.innerHTML='<div class="navtitle">PRISMA • Ação</div><button class="navbtn" data-page="prismaHome">Início <span class="n">V10</span></button><button class="navbtn" data-page="prismaMessages">Mensagens <span class="n">NOVO</span></button><button class="navbtn" data-page="prismaOps">Operações ↗</button>';
 if(brandNode&&brandNode.nextSibling)side.insertBefore(ng,brandNode.nextSibling);else side.appendChild(ng);
 var home=ng.querySelector('[data-page="prismaHome"]'),msg=ng.querySelector('[data-page="prismaMessages"]'),ops=ng.querySelector('[data-page="prismaOps"]');
 home.onclick=function(){activate('prismaHome');renderHome()};
 msg.onclick=function(){activate('prismaMessages');renderComposer()};
 ops.onclick=function(){activate('prismaOps');renderOps()};
 var move=['search','pointGroups','router'];
 move.forEach(function(id){
   var b=document.querySelector('.navbtn[data-page="'+id+'"]');if(b){if(id==='search')b.childNodes[0].nodeValue='Buscar ';if(id==='router')b.childNodes[0].nodeValue='Roteador ';if(id==='pointGroups')b.childNodes[0].nodeValue='Ponto → Grupo ';ng.insertBefore(b,ops);}
 });
}

function pages(){
 var main=document.querySelector('.main')||document.querySelector('main');if(!main)return;
 if(!document.getElementById('prismaHome')){var h=document.createElement('section');h.id='prismaHome';h.className='page';main.appendChild(h)}
 if(!document.getElementById('prismaMessages')){var m=document.createElement('section');m.id='prismaMessages';m.className='page';main.appendChild(m)}
 if(!document.getElementById('prismaOps')){var o=document.createElement('section');o.id='prismaOps';o.className='page';main.appendChild(o)}
 if(!document.getElementById('prismaPop')){var pop=document.createElement('div');pop.id='prismaPop';pop.className='prisma-pop';document.body.appendChild(pop)}
 if(!document.getElementById('prismaModalBack')){var mb=document.createElement('div');mb.id='prismaModalBack';mb.className='prisma-modalback';mb.innerHTML='<div class="prisma-modal" id="prismaModal"></div>';document.body.appendChild(mb)}
}

function makeIndexes(){
 P10.pointBlobs=P.map(function(p,i){return {i:i,blob:pn([p[0],p[1],p[2],p[3],p[6],p[10]].join(' ')),code:String(p[1]||''),id:String(p[0]||'')}});
 P10.machineBlobs=M.map(function(m,i){return {i:i,blob:pn([m[0],m[1],m[2],m[3],m[4],m[5],m[6],m[7],m[8]].join(' ')),id:String(m[0]||''),code:String(m[1]||'')}});
 P10.groupBlobs=WA.groups.map(function(g,i){return {i:i,blob:pn([g.name,g.category,(g.regionHints||[]).join(' ')].join(' ')),name:pn(g.name||'')}});
 P10.ticketBlobs=WA.tickets.map(function(t,i){
   var parts=[t[0]],pi=t[2]||[],mi=t[3]||[];
   pi.slice(0,15).forEach(function(x){var p=P[x[0]||x];if(p)parts.push(p[1],p[2])});
   mi.slice(0,15).forEach(function(x){var m=M[x[0]||x];if(m)parts.push(m[0],m[1],m[2])});
   return {i:i,blob:pn(parts.join(' ')),ticket:String(t[0]||'')};
 });
}
function scoreBlob(obj,q,tokens,type){
 var b=obj.blob,s=0;if(!tokens.every(function(t){return b.indexOf(t)>=0}))return -1;
 if(type==='point'){if(obj.code===q)s+=5000;if(obj.id===q)s+=4200;if(obj.code.indexOf(q)===0)s+=1200}
 if(type==='machine'){if(obj.id===q)s+=5000;if(obj.code===q)s+=2500;if(obj.id.indexOf(q)===0)s+=1200}
 if(type==='group'){if(obj.name===q)s+=5000;if(obj.name.indexOf(q)===0)s+=1600}
 if(type==='ticket'){if(obj.ticket===q)s+=5000;if(obj.ticket.indexOf(q)===0)s+=1600}
 if(b.indexOf(q)>=0)s+=600;tokens.forEach(function(t){if(b.indexOf(t)>=0)s+=80});return s;
}
function topSearch(arr,q,tokens,type,limit){var out=[];for(var i=0;i<arr.length;i++){var s=scoreBlob(arr[i],q,tokens,type);if(s<0)continue;out.push([s,arr[i].i])}out.sort(function(a,b){return b[0]-a[0]});return out.slice(0,limit||5).map(function(x){return x[1]})}
function messageSearch(q,tokens,limit){if(q.length<3)return [];var out=[];for(var i=0;i<WA.messages.length;i++){var m=WA.messages[i],g=WA.groups[m[4]]||{},b=pn([m[6],m[5],g.name,m[2]].join(' '));if(!tokens.every(function(t){return b.indexOf(t)>=0}))continue;var s=(b.indexOf(q)>=0?500:0)+(pn(g.name).indexOf(q)>=0?400:0);out.push([s,Number(m[1])||0,i])}out.sort(function(a,b){return b[0]-a[0]||b[1]-a[1]});return out.slice(0,limit||4).map(function(x){return x[2]})}
function searchAll(raw){
 var q=pn(raw),tokens=q.split(/\s+/).filter(Boolean);if(!q)return {points:[],machines:[],groups:[],tickets:[],messages:[]};
 return {points:topSearch(P10.pointBlobs,q,tokens,'point',5),machines:topSearch(P10.machineBlobs,q,tokens,'machine',5),groups:topSearch(P10.groupBlobs,q,tokens,'group',4),tickets:topSearch(P10.ticketBlobs,q,tokens,'ticket',4),messages:messageSearch(q,tokens,3)};
}
function saveRecent(q){q=String(q||'').trim();if(!q)return;var a=load(P10.keys.recent,[])||[];a=[q].concat(a.filter(function(x){return pn(x)!==pn(q)})).slice(0,8);save(P10.keys.recent,a)}

function suggestGroup(pi){
 var refs=pointMsgMap.get(pi)||[],counts=new Map();
 refs.forEach(function(x){var mi=x[0],cf=Number(x[1])||0,m=WA.messages[mi];if(!m)return;var gi=Number(m[4]),v=counts.get(gi)||{gi:gi,score:0,count:0};v.score+=(cf>=.9?5:cf>=.7?3:1);v.count++;counts.set(gi,v)});
 var arr=Array.from(counts.values()).sort(function(a,b){return b.score-a.score||b.count-a.count});return arr.length?arr[0].gi:null;
}

function resultActions(kind,i){
 if(kind==='point')return '<div class="prisma-actions"><button data-p10-open-point="'+i+'">Detalhes</button><a href="'+pe(opsPointUrl(i))+'" target="_blank" rel="noopener">Operações ↗</a><button class="hot" data-p10-compose-point="'+i+'">Mensagem</button><button data-p10-groups="'+i+'">Grupos</button></div>';
 if(kind==='machine')return '<div class="prisma-actions"><button data-p10-open-machine="'+i+'">Detalhes</button><a href="'+pe(opsMachineUrl(i))+'" target="_blank" rel="noopener">Operações ↗</a><button class="hot" data-p10-compose-machine="'+i+'">Mensagem</button></div>';
 if(kind==='group')return '<div class="prisma-actions"><button data-p10-open-group="'+i+'">Histórico</button><button data-p10-route-group="'+i+'">Rotas</button><button class="hot" data-p10-compose-group="'+i+'">Mensagem</button></div>';
 if(kind==='ticket'){var t=WA.tickets[i]||[],u=opsTicketUrl(t[0]);return '<div class="prisma-actions"><button data-p10-open-ticket="'+i+'">Detalhes</button>'+(u?'<a href="'+pe(u)+'" target="_blank" rel="noopener">Operações ↗</a>':'<button data-p10-ticket-list="'+pe(t[0])+'">Operações / pesquisar</button>')+'<button class="hot" data-p10-compose-ticket="'+pe(t[0])+'">Mensagem</button></div>'}
 return '';
}
function renderSearchResults(raw,target){
 var r=searchAll(raw);P10.currentResults=r;var html='';
 function section(title,arr,fn){if(!arr.length)return;html+='<div class="prisma-result-section"><div class="prisma-result-title"><span>'+title+'</span><span>'+arr.length+' resultado(s)</span></div><div class="prisma-result-list">'+arr.map(fn).join('')+'</div></div>'}
 section('Pontos',r.points,function(i){var p=P[i]||[];return '<div class="prisma-result"><strong>'+pe(fmtPoint(i))+'</strong><small>'+pe(p[3]||'')+' • '+pe(p[6]||'')+'</small>'+resultActions('point',i)+'</div>'});
 section('Máquinas',r.machines,function(i){var m=M[i]||[];return '<div class="prisma-result"><strong>'+pe(fmtMachine(i))+'</strong><small>Ponto '+pe(m[1]||'')+' • '+pe(m[5]||'')+' • '+pe(m[7]||'sem IP')+'</small>'+resultActions('machine',i)+'</div>'});
 section('Grupos',r.groups,function(i){var g=WA.groups[i]||{};return '<div class="prisma-result"><strong>'+pe(g.name||'')+'</strong><small>'+pe(g.category||'')+' • '+pe(g.status||'')+'</small>'+resultActions('group',i)+'</div>'});
 section('Chamados',r.tickets,function(i){var t=WA.tickets[i]||[];return '<div class="prisma-result"><strong>Chamado '+pe(t[0])+'</strong><small>'+pf((t[1]||[]).length)+' ocorrência(s) • '+pf((t[2]||[]).length)+' ponto(s)</small>'+resultActions('ticket',i)+'</div>'});
 section('Mensagens',r.messages,function(i){var m=WA.messages[i]||[],g=WA.groups[m[4]]||{};return '<div class="prisma-result"><strong>'+pe(g.name||'WhatsApp')+'</strong><small>'+pe((m[2]||'')+' '+(m[3]||'')+' • '+(m[5]||''))+'</small><small style="color:#cbd0d6;margin-top:5px">'+pe(String(m[6]||'').slice(0,180))+'</small><div class="prisma-actions"><button data-p10-open-msg="'+i+'">Abrir evidência</button></div></div>'});
 if(!html)html='<div class="empty">Nada encontrado. Tente código do ponto, ID da máquina, nome do local, grupo ou chamado.</div>';
 target.innerHTML=html;
 return r;
}

function renderHome(){
 var sec=document.getElementById('prismaHome');if(!sec)return;
 var recent=load(P10.keys.recent,[])||[];
 sec.innerHTML='<div class="prisma-homehero"><div class="prisma-homehead"><img src="prisma_mark.png" alt=""><div><h2>PRISM<b>A</b></h2><p><b>Plataforma de Roteamento, Informação, Suporte, Mensagens e Acessos.</b><br>Uma busca para sair do problema e chegar na ação certa.</p></div></div><div class="prisma-quicksearch"><input id="prismaHomeSearch" autocomplete="off" placeholder="Ponto, máquina, endereço, chamado, grupo, pessoa ou mensagem…"><span class="prisma-searchkbd">/</span></div><div class="prisma-quickgrid"><button class="prisma-quick" data-p10-go="pointGroups"><b>Achar grupo do ponto</b><span>Ponto ou máquina → grupos relacionados.</span></button><button class="prisma-quick" data-p10-go="prismaMessages"><b>Montar mensagem</b><span>Modelo + ponto + máquina + @ + destino.</span></button><button class="prisma-quick" data-p10-go="router"><b>Roteador</b><span>Recebeu uma ocorrência e não sabe pra onde vai?</span></button><button class="prisma-quick" data-p10-go="prismaOps"><b>Ir para Operações</b><span>Ponto, máquina, chamado e atalhos diretos.</span></button><button class="prisma-quick" data-p10-go="search"><b>Busca avançada</b><span>Filtros e evidências da base completa.</span></button></div></div><div id="prismaHomeResults" class="prisma-searchout">'+(recent.length?'<div class="card section"><div class="shead"><h3>Buscas recentes</h3><span>salvas só neste navegador</span></div><div class="body prisma-actions">'+recent.map(function(q){return '<button data-p10-recent="'+pe(q)+'">'+pe(q)+'</button>'}).join('')+'</div></div>':'')+'</div>';
 var input=document.getElementById('prismaHomeSearch'),out=document.getElementById('prismaHomeResults'),timer;
 input.oninput=function(){clearTimeout(timer);timer=setTimeout(function(){var q=input.value.trim();if(q)renderSearchResults(q,out);else renderHome()},150)};
 input.onkeydown=function(e){if(e.key==='Enter'&&input.value.trim()){saveRecent(input.value);renderSearchResults(input.value,out)}};
 setTimeout(function(){input.focus()},20);
}

function templateById(id){return templates().find(function(t){return t.id===id})||templates()[0]}
function ctx(){
 var pi=P10.compose.point,mi=P10.compose.machine,p=Number.isInteger(pi)?P[pi]:[],m=Number.isInteger(mi)?M[mi]:[],c=P10.compose;
 var inc=function(k){var el=document.getElementById('p10inc_'+k);return !el||el.checked};
 return {
  PONTO:inc('point')?String(p[2]||''):'',
  COD_PONTO:inc('point')?String(p[1]||''):'',
  MAQUINA:inc('machine')?String(m[2]||''):'',
  ID_MAQUINA:inc('machine')?String(m[0]||''):'',
  ENDERECO:inc('address')?String((p[3]||m[4]||'')):'',
  PRACA:String(p[6]||m[5]||''),
  CHAMADO:inc('ticket')?String((document.getElementById('p10Ticket')||{}).value||c.ticket||''):'',
  GRUPO:Number.isInteger(c.group)?groupName(c.group):'',
  MENCION:inc('mention')?String((document.getElementById('p10Mention')||{}).value||c.mention||'').trim():'',
  OBS:inc('obs')?String((document.getElementById('p10Obs')||{}).value||c.obs||'').trim():'',
  DATA:new Date().toLocaleDateString('pt-BR'),
  HORA:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
 };
}
function applyTemplate(body,c){
 body=String(body||'');
 body=body.replace(/\[\[([\s\S]*?)\]\]/g,function(_,block){
   var toks=Array.from(block.matchAll(/\{([A-Z_]+)\}/g)).map(function(x){return x[1]});
   var missing=toks.some(function(k){return !String(c[k]||'').trim()});
   if(missing)return '';
   return block;
 });
 body=body.replace(/\{([A-Z_]+)\}/g,function(_,k){return c[k]==null?'':c[k]});
 return body.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/ +([,.;:!?])/g,'$1').replace(/\s+\./g,'.').trim();
}
function regen(){
 var sel=document.getElementById('p10Template'),prev=document.getElementById('p10Preview');if(!sel||!prev)return;
 P10.compose.template=sel.value;var t=templateById(sel.value);prev.value=applyTemplate(t.body,ctx());updateContext();
}
function updateContext(){
 var el=document.getElementById('p10Context');if(!el)return;var pi=P10.compose.point,mi=P10.compose.machine,gi=P10.compose.group,parts=[];
 if(Number.isInteger(pi))parts.push('<strong>'+pe(fmtPoint(pi))+'</strong><small>'+pe(pointAddress(pi))+'</small>');
 if(Number.isInteger(mi))parts.push('<strong>'+pe(fmtMachine(mi))+'</strong><small>Ponto '+pe((M[mi]||[])[1]||'')+'</small>');
 if(Number.isInteger(gi))parts.push('<small>Destino sugerido/selecionado: <b>'+pe(groupName(gi))+'</b></small>');
 el.innerHTML=parts.length?parts.join(''):'<span class="none">Nenhum ponto/máquina selecionado ainda.</span>';
}
function pointSuggest(raw,box){
 var q=pn(raw),t=q.split(/\s+/).filter(Boolean);if(!q){box.classList.remove('open');box.innerHTML='';return}
 var ids=topSearch(P10.pointBlobs,q,t,'point',8);
 box.innerHTML=ids.map(function(i){var p=P[i]||[];return '<button data-p10-select-point="'+i+'"><strong>'+pe(fmtPoint(i))+'</strong><small>'+pe(p[3]||'')+' • '+pe(p[6]||'')+'</small></button>'}).join('');
 box.classList.toggle('open',!!ids.length);
}
function machinesForPoint(pi){
 if(!Number.isInteger(pi))return [];
 try{return (machinesByPoint.get(pkey(P[pi][1],P[pi][6]))||[]).slice(0,300)}catch(e){return []}
}
function fillMachineSelect(){
 var s=document.getElementById('p10Machine');if(!s)return;var ids=machinesForPoint(P10.compose.point);
 var current=P10.compose.machine;
 s.innerHTML='<option value="">Máquina (opcional)</option>'+ids.map(function(i){return '<option value="'+i+'">'+pe(fmtMachine(i))+'</option>'}).join('');
 if(Number.isInteger(current)&&ids.indexOf(current)>=0)s.value=String(current);else if(ids.length===1){P10.compose.machine=ids[0];s.value=String(ids[0])}else if(Number.isInteger(current)&&ids.indexOf(current)<0)P10.compose.machine=null;
}
function fillGroupSelect(){
 var s=document.getElementById('p10Group');if(!s)return;
 s.innerHTML='<option value="">Grupo WhatsApp (opcional)</option>'+WA.groups.map(function(g,i){return '<option value="'+i+'">'+pe(g.name||('Grupo '+i))+'</option>'}).join('');
 if(Number.isInteger(P10.compose.group))s.value=String(P10.compose.group);
}
function fillTemplateSelect(){
 var s=document.getElementById('p10Template');if(!s)return;var tt=templates(),id=P10.compose.template||tt[0].id;
 s.innerHTML=tt.map(function(t){return '<option value="'+pe(t.id)+'">'+pe(t.title)+'</option>'}).join('');s.value=id;P10.compose.template=s.value;
}
function fillSlackSelect(){
 var s=document.getElementById('p10Slack');if(!s)return;var a=slackChannels();
 s.innerHTML='<option value="">Canal Slack (opcional)</option>'+a.map(function(x,i){return '<option value="'+i+'">'+pe(x.name||x.url||x.id||('Canal '+(i+1)))+'</option>'}).join('');
}
function fillContactList(){
 var dl=document.getElementById('p10Contacts');if(!dl)return;dl.innerHTML=contacts().map(function(x){return '<option value="'+pe(x.mention||x.name||'')+'">'+pe(x.name||'')+'</option>'}).join('');
}
function renderComposer(){
 var sec=document.getElementById('prismaMessages');if(!sec)return;
 sec.innerHTML='<div class="card section"><div class="shead"><h3>Mensagens PRISMA '+helpButton('Mensagens','Monte mensagens padronizadas usando dados reais da base. Nada é enviado automaticamente: sempre existe uma etapa de revisão antes de abrir WhatsApp ou Slack.')+'</h3><span>modelo → contexto → revisão → destino</span></div><div class="body"><div class="prisma-tabs"><button class="prisma-tab active" data-p10-tab="compose">Compor</button><button class="prisma-tab" data-p10-tab="templates">Modelos</button><button class="prisma-tab" data-p10-tab="destinations">Destinos</button></div><div class="prisma-pane active" data-p10-pane="compose" id="p10ComposePane"></div><div class="prisma-pane" data-p10-pane="templates" id="p10TemplatesPane"></div><div class="prisma-pane" data-p10-pane="destinations" id="p10DestPane"></div></div></div>';
 renderComposePane();renderTemplatesPane();renderDestinationsPane();
}
function renderComposePane(){
 var pane=document.getElementById('p10ComposePane');if(!pane)return;
 pane.innerHTML='<div class="prisma-compose-grid"><div><div class="prisma-form"><div class="prisma-field"><div class="prisma-lab">Modelo '+helpButton('Modelo','Escolha um texto padronizado. Você pode criar, editar e duplicar modelos na aba Modelos.')+'</div><select id="p10Template"></select></div><div class="prisma-field"><div class="prisma-lab">Destino WhatsApp '+helpButton('Destino WhatsApp','Selecione o grupo. Se um link direto estiver cadastrado na aba Destinos, o PRISMA abre esse link; caso contrário abre o WhatsApp Web geral e copia a mensagem.')+'</div><select id="p10Group"></select></div><div class="prisma-field full prisma-relative"><div class="prisma-lab">Ponto '+helpButton('Ponto','Pesquise por código, nome ou endereço. O endereço e as máquinas relacionadas são preenchidos a partir da base.')+'</div><input id="p10PointSearch" autocomplete="off" placeholder="Ex.: 77825, Visionnaire, Brooklin Prime..."><div id="p10PointSuggest" class="prisma-suggest"></div></div><div class="prisma-field"><div class="prisma-lab">Máquina</div><select id="p10Machine"><option value="">Máquina (opcional)</option></select></div><div class="prisma-field"><div class="prisma-lab">Chamado</div><input id="p10Ticket" placeholder="Ex.: 20887147"></div><div class="prisma-field"><div class="prisma-lab">@ responsável</div><input id="p10Mention" list="p10Contacts" placeholder="@nome ou @handle"><datalist id="p10Contacts"></datalist></div><div class="prisma-field"><div class="prisma-lab">Canal Slack</div><select id="p10Slack"></select></div><div class="prisma-field full"><div class="prisma-lab">Observação adicional</div><input id="p10Obs" placeholder="Opcional"></div><div class="prisma-field full"><div class="prisma-lab">Incluir na mensagem</div><div class="prisma-checks"><label class="prisma-check"><input id="p10inc_point" type="checkbox" checked> ponto</label><label class="prisma-check"><input id="p10inc_machine" type="checkbox" checked> máquina</label><label class="prisma-check"><input id="p10inc_address" type="checkbox" checked> endereço</label><label class="prisma-check"><input id="p10inc_ticket" type="checkbox" checked> chamado</label><label class="prisma-check"><input id="p10inc_mention" type="checkbox" checked> @</label><label class="prisma-check"><input id="p10inc_obs" type="checkbox" checked> observação</label></div></div></div><div id="p10Context" class="prisma-context"></div></div><div><div class="prisma-sidecard"><h4>Prévia editável '+helpButton('Prévia editável','Esse é o texto final. Você pode alterar qualquer coisa aqui antes de copiar ou abrir o canal. Alterações na prévia não são enviadas automaticamente.')+'</h4><textarea id="p10Preview" class="prisma-preview"></textarea><div class="prisma-actions"><button id="p10Regen">Regerar do modelo</button><button id="p10Copy">Copiar</button><button class="hot" id="p10Whats">Revisar → WhatsApp</button><button id="p10SlackBtn">Revisar → Slack</button></div></div><div class="prisma-sidecard"><h4>Acessos rápidos</h4><div id="p10OpsInline" class="prisma-actions"></div><p class="prisma-muted" style="margin-top:7px">Links do Operações abrem em outra aba. Para chamado, o PRISMA só abre direto quando conhece o ID interno; caso contrário abre a lista e copia o número ELT para pesquisa.</p></div></div></div>';
 fillTemplateSelect();fillGroupSelect();fillMachineSelect();fillSlackSelect();fillContactList();
 var ps=document.getElementById('p10PointSearch');if(Number.isInteger(P10.compose.point))ps.value=fmtPoint(P10.compose.point);
 var ti=document.getElementById('p10Ticket');ti.value=P10.compose.ticket||'';
 var me=document.getElementById('p10Mention');me.value=P10.compose.mention||'';
 var ob=document.getElementById('p10Obs');ob.value=P10.compose.obs||'';
 document.getElementById('p10Template').onchange=regen;
 document.getElementById('p10Group').onchange=function(){P10.compose.group=this.value===''?null:Number(this.value);regen()};
 document.getElementById('p10Machine').onchange=function(){P10.compose.machine=this.value===''?null:Number(this.value);regen()};
 [ti,me,ob].forEach(function(el){el.oninput=function(){P10.compose.ticket=ti.value;P10.compose.mention=me.value;P10.compose.obs=ob.value;regen()}});
 document.querySelectorAll('.prisma-check input').forEach(function(x){x.onchange=regen});
 var sb=document.getElementById('p10PointSuggest'),timer;ps.oninput=function(){clearTimeout(timer);timer=setTimeout(function(){pointSuggest(ps.value,sb)},100)};
 ps.onkeydown=function(e){if(e.key==='Escape')sb.classList.remove('open')};
 document.getElementById('p10Regen').onclick=regen;
 document.getElementById('p10Copy').onclick=function(){copyText(document.getElementById('p10Preview').value,'Mensagem copiada')};
 document.getElementById('p10Whats').onclick=function(){openReview('whatsapp')};
 document.getElementById('p10SlackBtn').onclick=function(){openReview('slack')};
 regen();updateOpsInline();
}
function updateOpsInline(){
 var el=document.getElementById('p10OpsInline');if(!el)return;var h=[];
 if(Number.isInteger(P10.compose.point))h.push('<a href="'+pe(opsPointUrl(P10.compose.point))+'" target="_blank" rel="noopener">Ponto ↗</a>');
 if(Number.isInteger(P10.compose.machine))h.push('<a href="'+pe(opsMachineUrl(P10.compose.machine))+'" target="_blank" rel="noopener">Máquina ↗</a>');
 var t=(document.getElementById('p10Ticket')||{}).value||P10.compose.ticket,u=opsTicketUrl(t);
 if(t)h.push(u?'<a href="'+pe(u)+'" target="_blank" rel="noopener">Chamado ↗</a>':'<button data-p10-ticket-list="'+pe(t)+'">Pesquisar chamado</button>');
 h.push('<a href="https://operacoes.eletromidia.com.br/ticket/create-ticket" target="_blank" rel="noopener">Abrir chamado ↗</a>');
 el.innerHTML=h.join('');
}

function renderTemplatesPane(){
 var pane=document.getElementById('p10TemplatesPane');if(!pane)return;var tt=templates();
 pane.innerHTML='<div class="prisma-compose-grid"><div class="prisma-sidecard"><h4>Modelos salvos</h4><div id="p10TemplateList">'+tt.map(function(t){return '<div class="prisma-listrow"><div><strong>'+pe(t.title)+'</strong><small>'+pe(t.body.slice(0,120).replace(/\n/g,' '))+'</small></div><div class="prisma-actions"><button data-p10-edit-template="'+pe(t.id)+'">Editar</button><button data-p10-use-template="'+pe(t.id)+'">Usar</button></div></div>'}).join('')+'</div><div class="prisma-actions" style="margin-top:9px"><button class="hot" id="p10NewTemplate">Novo modelo</button></div></div><div class="prisma-sidecard"><h4>Editor de modelo '+helpButton('Tokens de modelo','Tokens disponíveis: {PONTO}, {COD_PONTO}, {MAQUINA}, {ID_MAQUINA}, {ENDERECO}, {PRACA}, {CHAMADO}, {GRUPO}, {MENCION}, {OBS}, {DATA}, {HORA}. Trechos entre [[ ... ]] somem inteiros se algum token dentro estiver vazio.')+'</h4><input id="p10TplId" type="hidden"><div class="prisma-field"><div class="prisma-lab">Nome</div><input id="p10TplTitle"></div><div class="prisma-field" style="margin-top:8px"><div class="prisma-lab">Texto</div><textarea id="p10TplBody" style="width:100%;min-height:330px"></textarea></div><div class="prisma-actions"><button class="hot" id="p10SaveTemplate">Salvar</button><button id="p10DuplicateTemplate">Duplicar</button><button id="p10DeleteTemplate">Excluir</button><button id="p10RestoreTemplates">Restaurar padrões</button></div></div></div>';
 document.getElementById('p10NewTemplate').onclick=function(){editTemplate({id:'',title:'Novo modelo',body:'Boa tarde, pessoal.\\n\\n[[Ponto {COD_PONTO} - {PONTO}.]][[\\nMáquina {ID_MAQUINA} - {MAQUINA}.]][[\\nEndereço: {ENDERECO}.]][[\\nChamado: {CHAMADO}.]]\\n\\n[[{MENCION}, ]]podem verificar, por favor?[[\\n\\nObservação: {OBS}]]'})};
 document.getElementById('p10SaveTemplate').onclick=saveTemplateEditor;
 document.getElementById('p10DuplicateTemplate').onclick=duplicateTemplateEditor;
 document.getElementById('p10DeleteTemplate').onclick=deleteTemplateEditor;
 document.getElementById('p10RestoreTemplates').onclick=function(){if(confirm('Restaurar os modelos padrão do PRISMA? Isso substitui os modelos atuais.')){save(P10.keys.templates,defaults());renderTemplatesPane();ptoast('Modelos restaurados')}};
 if(tt[0])editTemplate(tt[0]);
}
function editTemplate(t){var id=document.getElementById('p10TplId'),title=document.getElementById('p10TplTitle'),body=document.getElementById('p10TplBody');if(!id)return;id.value=t.id||'';title.value=t.title||'';body.value=t.body||''}
function saveTemplateEditor(){
 var id=document.getElementById('p10TplId').value.trim(),title=document.getElementById('p10TplTitle').value.trim(),body=document.getElementById('p10TplBody').value;
 if(!title||!body.trim()){ptoast('Nome e texto são obrigatórios');return}
 var tt=templates();if(!id)id='custom_'+Date.now();var i=tt.findIndex(function(x){return x.id===id});var obj={id:id,title:title,body:body};if(i>=0)tt[i]=obj;else tt.push(obj);save(P10.keys.templates,tt);P10.compose.template=id;renderTemplatesPane();ptoast('Modelo salvo')
}
function duplicateTemplateEditor(){var title=document.getElementById('p10TplTitle').value.trim(),body=document.getElementById('p10TplBody').value;if(!body.trim())return;var tt=templates(),id='custom_'+Date.now();tt.push({id:id,title:(title||'Modelo')+' — cópia',body:body});save(P10.keys.templates,tt);renderTemplatesPane();editTemplate(templateById(id));ptoast('Modelo duplicado')}
function deleteTemplateEditor(){var id=document.getElementById('p10TplId').value;if(!id)return;var tt=templates();if(tt.length<=1){ptoast('Mantenha pelo menos um modelo');return}if(!confirm('Excluir este modelo?'))return;tt=tt.filter(function(x){return x.id!==id});save(P10.keys.templates,tt);P10.compose.template=tt[0].id;renderTemplatesPane();ptoast('Modelo excluído')}

function renderDestinationsPane(){
 var pane=document.getElementById('p10DestPane');if(!pane)return;var wl=whatsappLinks(),sc=slackChannels(),ct=contacts();
 pane.innerHTML='<div class="prisma-compose-grid"><div><div class="prisma-sidecard"><h4>WhatsApp • links de grupos '+helpButton('Links de grupos','O WhatsApp não oferece um link público confiável por nome de grupo. Se você cadastrar o link/URL da conversa que funciona no seu ambiente, o PRISMA abre exatamente esse destino; sem ele, abre o WhatsApp Web geral e mantém o grupo identificado para você.')+'</h4><div class="prisma-destrow"><div class="prisma-field"><div class="prisma-lab">Grupo</div><select id="p10WaMapGroup">'+WA.groups.map(function(g,i){return '<option value="'+i+'">'+pe(g.name||('Grupo '+i))+'</option>'}).join('')+'</select></div><div class="prisma-field"><div class="prisma-lab">URL/link</div><input id="p10WaMapUrl" placeholder="https://web.whatsapp.com/..."></div><button id="p10SaveWaMap">Salvar</button></div><div id="p10WaMaps">'+Object.keys(wl).sort().map(function(k){return '<div class="prisma-listrow"><div><strong>'+pe(k)+'</strong><small>'+pe(wl[k])+'</small></div><button data-p10-del-wa="'+pe(k)+'">Remover</button></div>'}).join('')+'</div></div><div class="prisma-sidecard"><h4>Slack • canais</h4><div class="prisma-destrow"><div class="prisma-field"><div class="prisma-lab">Nome</div><input id="p10SlackName" placeholder="Ex.: NOC Campo"></div><div class="prisma-field"><div class="prisma-lab">URL ou Channel ID</div><input id="p10SlackUrl" placeholder="C012345 ou https://app.slack.com/..."></div><button id="p10SaveSlack">Salvar</button></div><div>'+sc.map(function(x,i){return '<div class="prisma-listrow"><div><strong>'+pe(x.name||'Canal')+'</strong><small>'+pe(x.url||x.id||'')+'</small></div><button data-p10-del-slack="'+i+'">Remover</button></div>'}).join('')+'</div></div></div><div><div class="prisma-sidecard"><h4>Contatos / @</h4><div class="prisma-destrow"><div class="prisma-field"><div class="prisma-lab">Nome</div><input id="p10ContactName" placeholder="Nome"></div><div class="prisma-field"><div class="prisma-lab">@ / menção</div><input id="p10ContactMention" placeholder="@fulano"></div><button id="p10SaveContact">Salvar</button></div><div>'+ct.map(function(x,i){return '<div class="prisma-listrow"><div><strong>'+pe(x.name||x.mention||'Contato')+'</strong><small>'+pe(x.mention||'')+'</small></div><button data-p10-del-contact="'+i+'">Remover</button></div>'}).join('')+'</div></div><div class="prisma-sidecard"><h4>Configuração PRISMA</h4><p class="prisma-muted">Modelos, links, canais, contatos e mapeamentos de chamados ficam somente neste navegador. Exporte para levar a outro PC.</p><div class="prisma-actions"><button id="p10ExportCfg">Exportar configuração</button><button id="p10ImportCfg">Importar configuração</button><input id="p10ImportFile" type="file" accept=".json,application/json" style="display:none"></div></div></div></div>';
 document.getElementById('p10WaMapGroup').onchange=function(){var n=groupName(Number(this.value));document.getElementById('p10WaMapUrl').value=whatsappLinks()[n]||''};
 document.getElementById('p10WaMapGroup').dispatchEvent(new Event('change'));
 document.getElementById('p10SaveWaMap').onclick=function(){var gi=Number(document.getElementById('p10WaMapGroup').value),url=document.getElementById('p10WaMapUrl').value.trim(),x=whatsappLinks(),n=groupName(gi);if(!url){delete x[n]}else{x[n]=url}save(P10.keys.whatsappLinks,x);renderDestinationsPane();ptoast('Destino WhatsApp salvo')};
 document.getElementById('p10SaveSlack').onclick=function(){var name=document.getElementById('p10SlackName').value.trim(),url=document.getElementById('p10SlackUrl').value.trim();if(!name||!url){ptoast('Informe nome e URL/Channel ID');return}var a=slackChannels();a.push({name:name,url:url});save(P10.keys.slackChannels,a);renderDestinationsPane();ptoast('Canal Slack salvo')};
 document.getElementById('p10SaveContact').onclick=function(){var name=document.getElementById('p10ContactName').value.trim(),mention=document.getElementById('p10ContactMention').value.trim();if(!mention){ptoast('Informe a menção');return}var a=contacts();a.push({name:name||mention,mention:mention});save(P10.keys.contacts,a);renderDestinationsPane();ptoast('Contato salvo')};
 document.getElementById('p10ExportCfg').onclick=exportConfig;
 document.getElementById('p10ImportCfg').onclick=function(){document.getElementById('p10ImportFile').click()};
 document.getElementById('p10ImportFile').onchange=importConfig;
}
function exportConfig(){
 var obj={product:'PRISMA',version:P10.version,exportedAt:new Date().toISOString(),templates:templates(),whatsappLinks:whatsappLinks(),slackChannels:slackChannels(),contacts:contacts(),ticketMap:ticketMap()};
 var blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='PRISMA_V10_CONFIG_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500)
}
function importConfig(e){
 var f=e.target.files&&e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result);if(Array.isArray(o.templates))save(P10.keys.templates,o.templates);if(o.whatsappLinks)save(P10.keys.whatsappLinks,o.whatsappLinks);if(Array.isArray(o.slackChannels))save(P10.keys.slackChannels,o.slackChannels);if(Array.isArray(o.contacts))save(P10.keys.contacts,o.contacts);if(o.ticketMap)save(P10.keys.ticketMap,o.ticketMap);renderComposer();ptoast('Configuração importada')}catch(x){alert('Arquivo de configuração inválido.')}};r.readAsText(f)
}

function openReview(channel){
 var text=(document.getElementById('p10Preview')||{}).value||'';if(!text.trim()){ptoast('A mensagem está vazia');return}
 var gi=P10.compose.group,slackSel=document.getElementById('p10Slack'),dest='',url='',note='';
 if(channel==='whatsapp'){
   dest=Number.isInteger(gi)?groupName(gi):'WhatsApp Web';
   var map=whatsappLinks();url=Number.isInteger(gi)?(map[dest]||''):'';
   if(!url){url='https://web.whatsapp.com/';note='Este grupo ainda não possui link direto cadastrado. O PRISMA abrirá o WhatsApp Web geral e copiará a mensagem; procure o grupo '+dest+' antes de colar.'}
 }else{
   var sc=slackChannels(),idx=slackSel&&slackSel.value!==''?Number(slackSel.value):null,ch=Number.isInteger(idx)?sc[idx]:null;
   dest=ch?(ch.name||'Slack'):'Slack';var v=ch&&String(ch.url||'').trim();
   if(v){url=/^https?:\/\//i.test(v)?v:'https://slack.com/app_redirect?channel='+encodeURIComponent(v)}else{url='https://app.slack.com/client';note='Nenhum canal Slack foi selecionado/cadastrado. O PRISMA abrirá o Slack e copiará a mensagem.'}
 }
 var back=document.getElementById('prismaModalBack'),modal=document.getElementById('prismaModal');
 modal.innerHTML='<h3>Revisar antes de abrir '+(channel==='whatsapp'?'WhatsApp':'Slack')+'</h3><div class="dest">Destino: <b>'+pe(dest)+'</b></div>'+(note?'<div class="routewarn warn" style="margin-top:9px">'+pe(note)+'</div>':'')+'<textarea id="p10ReviewText">'+pe(text)+'</textarea><div class="prisma-actions" style="margin-top:9px"><button data-p10-modal-close>Voltar</button><button data-p10-review-copy>Copiar mensagem</button>'+(channel==='whatsapp'&&Number.isInteger(gi)?'<button data-p10-copy-group="'+gi+'">Copiar nome do grupo</button>':'')+'<button class="hot" data-p10-open-channel="'+pe(channel)+'" data-p10-url="'+pe(url)+'">Abrir '+(channel==='whatsapp'?'WhatsApp':'Slack')+'</button></div><p class="prisma-muted" style="margin-top:8px">O PRISMA nunca clica em Enviar por você. O texto acima continua editável até o último momento.</p>';
 back.classList.add('open');
}

function renderOps(){
 var sec=document.getElementById('prismaOps');if(!sec)return;
 sec.innerHTML='<div class="card section"><div class="shead"><h3>Operações • atalhos PRISMA '+helpButton('Operações','Os links de ponto e máquina usam os IDs internos da base. Chamados possuem número ELT e ID interno diferentes; o PRISMA só abre direto quando esse mapeamento é conhecido.')+'</h3><span>sem procurar tela por tela</span></div><div class="body"><div class="prisma-opgrid"><a class="prisma-opcard" href="https://operacoes.eletromidia.com.br/home" target="_blank" rel="noopener"><b>Home</b><span>Operações</span></a><a class="prisma-opcard" href="https://operacoes.eletromidia.com.br/places" target="_blank" rel="noopener"><b>Pontos</b><span>Lista de pontos</span></a><a class="prisma-opcard" href="https://operacoes.eletromidia.com.br/legacy/machines" target="_blank" rel="noopener"><b>Máquinas</b><span>Lista de máquinas</span></a><a class="prisma-opcard" href="https://operacoes.eletromidia.com.br/tickets" target="_blank" rel="noopener"><b>Chamados</b><span>Lista de chamados</span></a><a class="prisma-opcard" href="https://operacoes.eletromidia.com.br/ticket/create-ticket" target="_blank" rel="noopener"><b>Abrir chamado</b><span>Novo chamado</span></a></div><div class="prisma-ops-search"><input id="p10OpsSearch" placeholder="Código/nome do ponto, ID da máquina ou chamado..."><button class="primary" id="p10OpsGo">LOCALIZAR</button></div><div id="p10OpsResults" class="prisma-searchout"></div></div></div>';
 var inp=document.getElementById('p10OpsSearch'),out=document.getElementById('p10OpsResults'),timer;
 function go(){var q=inp.value.trim();if(!q){out.innerHTML='<div class="empty">Digite o que você quer abrir no Operações.</div>';return}saveRecent(q);var r=searchAll(q);r.groups=[];r.messages=[];renderOpsResults(r,out)}
 inp.oninput=function(){clearTimeout(timer);timer=setTimeout(go,150)};inp.onkeydown=function(e){if(e.key==='Enter')go()};document.getElementById('p10OpsGo').onclick=go;go()
}
function renderOpsResults(r,out){
 var html='<div class="prisma-result-list">';
 r.points.forEach(function(i){var p=P[i]||[];html+='<div class="prisma-result"><strong>'+pe(fmtPoint(i))+'</strong><small>'+pe(p[3]||'')+'</small><div class="prisma-actions"><a class="hot" href="'+pe(opsPointUrl(i))+'" target="_blank" rel="noopener">Abrir ponto ↗</a><button data-p10-open-point="'+i+'">Detalhes PRISMA</button></div></div>'});
 r.machines.forEach(function(i){var m=M[i]||[];html+='<div class="prisma-result"><strong>'+pe(fmtMachine(i))+'</strong><small>Ponto '+pe(m[1]||'')+' • '+pe(m[5]||'')+'</small><div class="prisma-actions"><a class="hot" href="'+pe(opsMachineUrl(i))+'" target="_blank" rel="noopener">Abrir máquina ↗</a><button data-p10-open-machine="'+i+'">Detalhes PRISMA</button></div></div>'});
 r.tickets.forEach(function(i){var t=WA.tickets[i]||[],u=opsTicketUrl(t[0]);html+='<div class="prisma-result"><strong>Chamado ELT '+pe(t[0])+'</strong><small>'+pf((t[1]||[]).length)+' ocorrência(s)</small><div class="prisma-actions">'+(u?'<a class="hot" href="'+pe(u)+'" target="_blank" rel="noopener">Abrir chamado ↗</a>':'<button class="hot" data-p10-ticket-list="'+pe(t[0])+'">Abrir lista + copiar ELT</button><button data-p10-map-ticket="'+pe(t[0])+'">Mapear ID interno</button>')+'<button data-p10-open-ticket="'+i+'">Detalhes PRISMA</button></div></div>'});
 html+='</div>';out.innerHTML=(r.points.length+r.machines.length+r.tickets.length)?html:'<div class="empty">Nenhum ponto, máquina ou chamado encontrado.</div>';
}

function goPointGroups(pi){
 var p=P[pi]||[],nav=document.querySelector('.navbtn[data-page="pointGroups"]');if(nav)nav.click();
 setTimeout(function(){var q=document.getElementById('v9PointGroupInput');if(q){q.value=p[1]||p[2]||'';q.dispatchEvent(new Event('input',{bubbles:true}));q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}},100)
}
function goGroupRoutes(gi){
 var nav=document.querySelector('.navbtn[data-page="groupRoutes"]');if(nav)nav.click();
 setTimeout(function(){var q=document.getElementById('noc8GroupQuery');if(q){q.value=groupName(gi);q.dispatchEvent(new Event('input',{bubbles:true}));q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}},120)
}
function setComposeFrom(kind,val){
 if(kind==='point'){P10.compose.point=Number(val);P10.compose.machine=null;var gi=suggestGroup(P10.compose.point);if(Number.isInteger(gi))P10.compose.group=gi}
 if(kind==='machine'){P10.compose.machine=Number(val);var pi=pointFromMachine(P10.compose.machine);if(Number.isInteger(pi)){P10.compose.point=pi;var gi2=suggestGroup(pi);if(Number.isInteger(gi2))P10.compose.group=gi2}}
 if(kind==='group'){P10.compose.group=Number(val)}
 if(kind==='ticket'){P10.compose.ticket=String(val||'')}
 activate('prismaMessages');renderComposer();
}
function mapTicket(ticket){
 var cur=ticketMap()[String(ticket)]||'',v=prompt('Chamado ELT '+ticket+'\\nCole a URL do chamado no Operações ou somente o ID interno:',cur);if(v===null)return;v=v.trim();var mp=ticketMap();if(v)mp[String(ticket)]=v;else delete mp[String(ticket)];save(P10.keys.ticketMap,mp);ptoast(v?'Chamado mapeado':'Mapeamento removido');if(document.getElementById('prismaOps').classList.contains('active'))renderOps()
}
function ticketList(ticket){copyText(String(ticket),'Número do chamado copiado');safeOpen('https://operacoes.eletromidia.com.br/tickets')}

function patchDrawers(){
 if(!P10.oldOpenP&&typeof window.openP==='function'){P10.oldOpenP=window.openP;window.openP=async function(i){await P10.oldOpenP(i);injectDrawer('point',i)}}
 if(!P10.oldOpenM&&typeof window.openM==='function'){P10.oldOpenM=window.openM;window.openM=async function(i){await P10.oldOpenM(i);injectDrawer('machine',i)}}
 if(!P10.oldOpenTicket&&typeof window.openTicket==='function'){P10.oldOpenTicket=window.openTicket;window.openTicket=function(i){P10.oldOpenTicket(i);setTimeout(function(){injectDrawer('ticket',i)},20)}}
 if(!P10.oldOpenGroup&&typeof window.openGroup==='function'){P10.oldOpenGroup=window.openGroup;window.openGroup=function(i){P10.oldOpenGroup(i);setTimeout(function(){injectDrawer('group',i)},20)}}
}
function injectDrawer(kind,i){
 var body=document.getElementById('drawerBody');if(!body)return;var old=document.getElementById('prismaDrawerQuick');if(old)old.remove();var h='<div class="prisma-drawerbar" id="prismaDrawerQuick"><h4>PRISMA • AÇÕES RÁPIDAS</h4><div class="prisma-actions">';
 if(kind==='point')h+='<a href="'+pe(opsPointUrl(i))+'" target="_blank" rel="noopener">Operações ↗</a><button class="hot" data-p10-compose-point="'+i+'">Criar mensagem</button><button data-p10-groups="'+i+'">Grupos do ponto</button>';
 if(kind==='machine'){var pi=pointFromMachine(i);h+='<a href="'+pe(opsMachineUrl(i))+'" target="_blank" rel="noopener">Máquina no Operações ↗</a>'+(Number.isInteger(pi)?'<a href="'+pe(opsPointUrl(pi))+'" target="_blank" rel="noopener">Ponto no Operações ↗</a>':'')+'<button class="hot" data-p10-compose-machine="'+i+'">Criar mensagem</button>'}
 if(kind==='group')h+='<button class="hot" data-p10-compose-group="'+i+'">Criar mensagem</button><button data-p10-route-group="'+i+'">Ver rotas</button>';
 if(kind==='ticket'){var t=WA.tickets[i]||[],u=opsTicketUrl(t[0]);h+=(u?'<a href="'+pe(u)+'" target="_blank" rel="noopener">Chamado no Operações ↗</a>':'<button data-p10-ticket-list="'+pe(t[0])+'">Abrir lista + copiar ELT</button><button data-p10-map-ticket="'+pe(t[0])+'">Mapear ID interno</button>')+'<button class="hot" data-p10-compose-ticket="'+pe(t[0])+'">Criar mensagem</button>'}
 h+='</div></div>';body.insertAdjacentHTML('afterbegin',h)
}

function events(){
 document.addEventListener('click',function(e){
   var h=e.target.closest('[data-prisma-help]');if(h){e.preventDefault();showHelp(h);return}
   if(!e.target.closest('#prismaPop')){var pop=document.getElementById('prismaPop');if(pop)pop.classList.remove('open')}
   var b=e.target.closest('[data-p10-go],[data-p10-open-point],[data-p10-open-machine],[data-p10-open-group],[data-p10-route-group],[data-p10-open-ticket],[data-p10-open-msg],[data-p10-compose-point],[data-p10-compose-machine],[data-p10-compose-group],[data-p10-compose-ticket],[data-p10-groups],[data-p10-ticket-list],[data-p10-map-ticket],[data-p10-select-point],[data-p10-tab],[data-p10-edit-template],[data-p10-use-template],[data-p10-del-wa],[data-p10-del-slack],[data-p10-del-contact],[data-p10-modal-close],[data-p10-review-copy],[data-p10-copy-group],[data-p10-open-channel],[data-p10-recent]');
   if(!b)return;
   if(b.dataset.p10Go){var n=document.querySelector('.navbtn[data-page="'+b.dataset.p10Go+'"]');if(n)n.click();else{activate(b.dataset.p10Go);if(b.dataset.p10Go==='prismaMessages')renderComposer();if(b.dataset.p10Go==='prismaOps')renderOps()}return}
   if(b.dataset.p10OpenPoint!=null){openP(Number(b.dataset.p10OpenPoint));return}
   if(b.dataset.p10OpenMachine!=null){openM(Number(b.dataset.p10OpenMachine));return}
   if(b.dataset.p10OpenGroup!=null){if(typeof openGroup==='function')openGroup(Number(b.dataset.p10OpenGroup));return}
   if(b.dataset.p10RouteGroup!=null){goGroupRoutes(Number(b.dataset.p10RouteGroup));return}
   if(b.dataset.p10OpenTicket!=null){openTicket(Number(b.dataset.p10OpenTicket));return}
   if(b.dataset.p10OpenMsg!=null){openMsg(Number(b.dataset.p10OpenMsg));return}
   if(b.dataset.p10ComposePoint!=null){setComposeFrom('point',b.dataset.p10ComposePoint);return}
   if(b.dataset.p10ComposeMachine!=null){setComposeFrom('machine',b.dataset.p10ComposeMachine);return}
   if(b.dataset.p10ComposeGroup!=null){setComposeFrom('group',b.dataset.p10ComposeGroup);return}
   if(b.dataset.p10ComposeTicket!=null){setComposeFrom('ticket',b.dataset.p10ComposeTicket);return}
   if(b.dataset.p10Groups!=null){goPointGroups(Number(b.dataset.p10Groups));return}
   if(b.dataset.p10TicketList!=null){ticketList(b.dataset.p10TicketList);return}
   if(b.dataset.p10MapTicket!=null){mapTicket(b.dataset.p10MapTicket);return}
   if(b.dataset.p10SelectPoint!=null){P10.compose.point=Number(b.dataset.p10SelectPoint);P10.compose.machine=null;var gi=suggestGroup(P10.compose.point);if(Number.isInteger(gi))P10.compose.group=gi;var ps=document.getElementById('p10PointSearch');if(ps)ps.value=fmtPoint(P10.compose.point);var sb=document.getElementById('p10PointSuggest');if(sb)sb.classList.remove('open');fillMachineSelect();fillGroupSelect();regen();updateOpsInline();return}
   if(b.dataset.p10Tab){document.querySelectorAll('.prisma-tab').forEach(function(x){x.classList.toggle('active',x.dataset.p10Tab===b.dataset.p10Tab)});document.querySelectorAll('.prisma-pane').forEach(function(x){x.classList.toggle('active',x.dataset.p10Pane===b.dataset.p10Tab)});return}
   if(b.dataset.p10EditTemplate!=null){editTemplate(templateById(b.dataset.p10EditTemplate));return}
   if(b.dataset.p10UseTemplate!=null){P10.compose.template=b.dataset.p10UseTemplate;document.querySelector('[data-p10-tab="compose"]').click();renderComposePane();return}
   if(b.dataset.p10DelWa!=null){var wl=whatsappLinks();delete wl[b.dataset.p10DelWa];save(P10.keys.whatsappLinks,wl);renderDestinationsPane();return}
   if(b.dataset.p10DelSlack!=null){var sc=slackChannels();sc.splice(Number(b.dataset.p10DelSlack),1);save(P10.keys.slackChannels,sc);renderDestinationsPane();return}
   if(b.dataset.p10DelContact!=null){var ct=contacts();ct.splice(Number(b.dataset.p10DelContact),1);save(P10.keys.contacts,ct);renderDestinationsPane();return}
   if(b.hasAttribute('data-p10-modal-close')){document.getElementById('prismaModalBack').classList.remove('open');return}
   if(b.hasAttribute('data-p10-review-copy')){copyText(document.getElementById('p10ReviewText').value,'Mensagem copiada');return}
   if(b.dataset.p10CopyGroup!=null){copyText(groupName(Number(b.dataset.p10CopyGroup)),'Nome do grupo copiado');return}
   if(b.dataset.p10OpenChannel!=null){var url=b.dataset.p10Url,text=document.getElementById('p10ReviewText').value;safeOpen(url);copyText(text,'Mensagem copiada • cole no destino');return}
   if(b.dataset.p10Recent!=null){activate('prismaHome');renderHome();setTimeout(function(){var x=document.getElementById('prismaHomeSearch'),o=document.getElementById('prismaHomeResults');if(x){x.value=b.dataset.p10Recent;renderSearchResults(x.value,o)}},20);return}
 });
 document.addEventListener('keydown',function(e){if(e.key==='Escape'){var mb=document.getElementById('prismaModalBack');if(mb)mb.classList.remove('open');var pop=document.getElementById('prismaPop');if(pop)pop.classList.remove('open')}if(e.key==='/'&&!/input|textarea|select/i.test(document.activeElement&&document.activeElement.tagName||'')){e.preventDefault();var n=document.querySelector('.navbtn[data-page="prismaHome"]');if(n)n.click();setTimeout(function(){var q=document.getElementById('prismaHomeSearch');if(q)q.focus()},20)}})
 var mb=document.getElementById('prismaModalBack');if(mb)mb.addEventListener('click',function(e){if(e.target===mb)mb.classList.remove('open')})
}
function showHelp(btn){
 var pop=document.getElementById('prismaPop'),r=btn.getBoundingClientRect();pop.innerHTML='<b>'+pe(btn.dataset.prismaHelpTitle||'Ajuda')+'</b><br>'+pe(btn.dataset.prismaHelp||'');pop.style.left=Math.min(window.innerWidth-330,Math.max(8,r.left))+'px';pop.style.top=Math.min(window.innerHeight-140,r.bottom+6)+'px';pop.classList.add('open')
}

function patchSearchbar(){
 var q=document.getElementById('q');if(q)q.placeholder='Ponto, máquina, endereço, chamado, grupo, mensagem, autor, IP…';
 var hb=document.getElementById('helpBtn');if(hb){hb.textContent='? Busca';hb.title='Ajuda da busca avançada'}
 var hint=document.querySelector('.searchbar .hint');if(hint)hint.style.display='none';
}
function diagnostics(){
 var d={version:P10.version,points:P.length,machines:M.length,groups:WA.groups.length,tickets:WA.tickets.length,templates:templates().length,home:!!document.getElementById('prismaHome'),messages:!!document.getElementById('prismaMessages'),ops:!!document.getElementById('prismaOps'),v9:!!document.querySelector('.navbtn[data-page="pointGroups"]')};
 var vi=P.findIndex(function(p){return String(p[1])==='77825'});if(vi>=0)d.samplePointUrl=opsPointUrl(vi);
 d.ok=d.points>0&&d.machines>0&&d.groups>0&&d.templates>0&&d.home&&d.messages&&d.ops;
 window.__PRISMA_V10_DIAG__=d;document.documentElement.dataset.prismaV10=d.ok?'ready':'error';console.info('PRISMA V10',d)
}
function install(){
 if(P10.installed)return;P10.installed=true;styles();brand();pages();makeIndexes();installNav();patchSearchbar();patchDrawers();events();renderHome();renderComposer();renderOps();
 var nav=document.querySelector('.navbtn[data-page="prismaHome"]');if(nav){nav.click()}else activate('prismaHome');
 var badge=document.querySelector('.top .badges');if(badge)badge.insertAdjacentHTML('afterbegin','<span class="badge orange prisma-version">PRISMA V10</span>');
 diagnostics()
}
function boot(){
 var start=Date.now(),timer=setInterval(function(){
   var ready=false;try{ready=window.__ELETRO_V7_READY__===true&&typeof WA!=='undefined'&&WA&&Array.isArray(WA.messages)&&typeof P!=='undefined'&&P.length&&typeof M!=='undefined'&&M.length&&document.querySelector('.main')}catch(e){}
   var v9=document.querySelector('.navbtn[data-page="pointGroups"]');
   if(ready&&(v9||Date.now()-start>15000)){clearInterval(timer);try{install()}catch(e){console.error('PRISMA V10:',e);document.documentElement.dataset.prismaV10='error'}}
   else if(Date.now()-start>35000){clearInterval(timer);console.error('PRISMA V10: base não ficou pronta em 35s.');document.documentElement.dataset.prismaV10='timeout'}
 },120)
}
boot();
})();