(function(){
'use strict';

var V9={
  version:'9.0.0-ux-groups',
  installed:false,
  pointGroups:new Map(),
  groupPoints:new Map(),
  groupBlobs:[],
  oldOpenP:null,
  oldOpenM:null,
  oldRenderPointTable:null,
  oldSearchGroup:null
};

function v9Esc(v){
  try{return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  catch(e){return String(v==null?'':v);}
}
function v9Norm(v){
  try{return typeof norm==='function'?norm(v):String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  catch(e){return String(v==null?'':v).toLowerCase().trim();}
}
function v9Fmt(n){try{return typeof fmt==='function'?fmt(n):Number(n||0).toLocaleString('pt-BR');}catch(e){return String(n||0);}}
function v9Pill(text,cls){return '<span class="v9-pill '+(cls||'')+'">'+v9Esc(text)+'</span>';}
function v9GroupName(g){return WA&&WA.groups&&WA.groups[g]?(WA.groups[g].name||('Grupo '+g)):('Grupo '+g);}
function v9PointLabel(i){var p=P[i]||[];return String(p[1]||'')+' • '+String(p[2]||'Ponto');}
function v9OpsPointUrl(i){var id=P[i]&&P[i][0];return id?('https://operacoes.eletromidia.com.br/places/'+encodeURIComponent(id)):'';}
function v9OpsMachineUrl(i){var id=M[i]&&M[i][0];return id?('https://operacoes.eletromidia.com.br/legacy/machines/'+encodeURIComponent(id)+'/edit'):'';}
function v9Coverage(g){
  var x=WA.groups[g]||{},s=x.status||'';
  if(s==='COMPLETE')return v9Pill('coleta completa','good');
  if(s==='COMPLETE_WITH_MEDIA_GAPS')return v9Pill('gaps de mídia','warn');
  if(s==='NEEDS_REVIEW')return v9Pill('revisão','warn');
  if(s==='FAILED')return v9Pill('falha de coleta','bad');
  return v9Pill(s||'sem status','');
}
function v9Strength(s){
  if(!s)return {label:'SEM EVIDÊNCIA',cls:'bad'};
  if(s.high>=2 || (s.high>=1&&s.count>=3))return {label:'FORTE',cls:'good'};
  if(s.high>=1 || s.medium>=2 || s.count>=4)return {label:'MÉDIO',cls:'warn'};
  return {label:'CONTEXTO',cls:''};
}
function v9Score(s){
  if(!s)return 0;
  return s.high*30+s.medium*12+s.context*3+Math.min(s.count,20)*4+(s.latest?Math.min(10,s.latest/1e12):0);
}
function v9EnsureStat(pi,gi){
  var gm=V9.pointGroups.get(pi);if(!gm){gm=new Map();V9.pointGroups.set(pi,gm);}
  var s=gm.get(gi);if(!s){s={point:pi,group:gi,count:0,high:0,medium:0,context:0,latest:0,fromPoint:0,fromMachine:0};gm.set(gi,s);}
  return s;
}
function v9Add(pi,gi,conf,ts,source){
  if(!Number.isInteger(pi)||pi<0||pi>=P.length||!Number.isInteger(gi)||gi<0||gi>=WA.groups.length)return;
  var s=v9EnsureStat(pi,gi);s.count++;if(conf>=.9)s.high++;else if(conf>=.7)s.medium++;else s.context++;s.latest=Math.max(s.latest,Number(ts)||0);if(source==='point')s.fromPoint++;else s.fromMachine++;
}
function v9BuildRelations(){
  V9.pointGroups=new Map();V9.groupPoints=new Map();
  for(var mi=0;mi<WA.messages.length;mi++){
    var m=WA.messages[mi]||[],gi=Number(m[4]),per=new Map(),ts=Number(m[1])||0;
    (m[17]||[]).forEach(function(x){
      var pi=Number(x&&x[0]),cf=Number(x&&x[1])||0;if(!Number.isInteger(pi))return;
      var old=per.get(pi);if(!old||cf>old.conf)per.set(pi,{conf:cf,source:'point'});
    });
    (m[18]||[]).forEach(function(x){
      var mxi=Number(x&&x[0]),cf=(Number(x&&x[1])||0)*.92;if(!Number.isInteger(mxi)||!M[mxi])return;
      var pi;
      try{pi=pointMap.get(pkey(M[mxi][1],M[mxi][5]));}catch(e){pi=undefined;}
      if(!Number.isInteger(pi))return;
      var old=per.get(pi);if(!old||cf>old.conf)per.set(pi,{conf:cf,source:'machine'});
    });
    per.forEach(function(x,pi){v9Add(pi,gi,x.conf,ts,x.source);});
  }
  V9.pointGroups.forEach(function(gm,pi){
    gm.forEach(function(s,gi){
      var pm=V9.groupPoints.get(gi);if(!pm){pm=new Map();V9.groupPoints.set(gi,pm);}pm.set(pi,s);
    });
  });
  V9.groupBlobs=WA.groups.map(function(g,gi){
    var parts=[g.name||'',g.category||'',(g.regionHints||[]).join(' ')],pm=V9.groupPoints.get(gi);
    if(pm){pm.forEach(function(s,pi){var p=P[pi]||[];parts.push(p[1]||'',p[2]||'',p[3]||'',p[10]||'',p[6]||'');});}
    return v9Norm(parts.join(' '));
  });
}
function v9TopGroups(pi,limit){
  var gm=V9.pointGroups.get(pi);if(!gm)return [];
  return Array.from(gm.values()).sort(function(a,b){return v9Score(b)-v9Score(a)||b.count-a.count||v9GroupName(a.group).localeCompare(v9GroupName(b.group),'pt-BR');}).slice(0,limit||6);
}
function v9TopPoints(gi,limit){
  var pm=V9.groupPoints.get(gi);if(!pm)return [];
  return Array.from(pm.values()).sort(function(a,b){return v9Score(b)-v9Score(a)||b.count-a.count||v9PointLabel(a.point).localeCompare(v9PointLabel(b.point),'pt-BR');}).slice(0,limit||5);
}
function v9Styles(){
  if(document.getElementById('v9Styles'))return;
  var st=document.createElement('style');st.id='v9Styles';st.textContent=
  '.v9-hero{background:linear-gradient(180deg,#15100d,#0e1013);border:1px solid #633018;border-radius:13px;padding:14px;margin-top:12px}'+
  '.v9-hero h3{margin:0;font-size:18px}.v9-hero h3 b{color:#ff6a28}.v9-hero p{margin:5px 0 0;color:#9ca3ad;font-size:10px;line-height:1.5}'+
  '.v9-searchrow{display:grid;grid-template-columns:minmax(260px,1fr) 145px;gap:8px;margin-top:12px}.v9-searchrow input{width:100%}.v9-searchrow button{background:#ff5a13;border-color:#ff5a13}'+
  '.v9-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.v9-pcard{border:1px solid #30343b;background:#0d1014;border-radius:11px;overflow:hidden}.v9-phead{padding:11px 12px;background:#15191e;border-bottom:1px solid #30343b}.v9-phead .code{font-family:Consolas,monospace;color:#ff9868;font-size:10px;font-weight:800}.v9-phead strong{display:block;font-size:14px;margin-top:3px}.v9-phead small{display:block;color:#8f96a0;font-size:9px;margin-top:4px;line-height:1.4}.v9-pbody{padding:10px 12px}.v9-label{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#777f89;margin-bottom:6px}.v9-groups{display:flex;flex-direction:column;gap:6px}.v9-gitem{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #2e333a;background:#111419;border-radius:8px;padding:8px 9px;cursor:pointer;text-align:left}.v9-gitem:hover{border-color:#ff5a13}.v9-gitem strong{font-size:10px}.v9-gitem small{display:block;color:#8e959f;font-size:8px;margin-top:2px}.v9-pactions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.v9-pactions a,.v9-pactions button{font-size:9px;text-decoration:none;color:#fff;background:#171a1f;border:1px solid #30343b;border-radius:7px;padding:6px 8px;cursor:pointer}.v9-pactions a:hover,.v9-pactions button:hover{border-color:#ff5a13}.v9-pactions .primary{background:#ff5a13;border-color:#ff5a13}'+
  '.v9-pill{display:inline-flex;border:1px solid #41464d;border-radius:999px;padding:2px 6px;font-size:7.5px;color:#c4cad1;white-space:nowrap}.v9-pill.good{color:#78e8b0;border-color:#2b7650}.v9-pill.warn{color:#ffd478;border-color:#6e5926}.v9-pill.bad{color:#ff9ba1;border-color:#74343a}'+
  '.v9-groupshero{padding:13px}.v9-groupshero h3{margin:0;font-size:16px}.v9-groupshero p{margin:4px 0 10px;color:#9299a3;font-size:9.5px;line-height:1.45}.v9-groupshero input{width:100%;height:43px}.v9-groupgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:12px}.v9-groupcard{border:1px solid #30343b;background:#0d1014;border-radius:10px;padding:11px;cursor:pointer}.v9-groupcard:hover{border-color:#ff5a13}.v9-groupcard h4{margin:0;font-size:12px}.v9-groupcard .meta{color:#8f96a0;font-size:8.5px;margin-top:4px}.v9-groupcard .points{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}.v9-groupcard .stats{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}'+
  '.v9-inline-groups{border:1px solid #5b331f;background:#15100d;border-radius:10px;padding:10px;margin:0 0 12px}.v9-inline-groups h4{margin:0 0 7px;font-size:11px;color:#ff9868}.v9-inline-groups p{margin:0 0 8px;color:#969da7;font-size:9px}.v9-inline-list{display:flex;gap:6px;flex-wrap:wrap}.v9-inline-list button{font-size:9px}'+
  '.v9-cell{min-width:190px}.v9-cell strong{display:block;font-size:9px}.v9-cell small{display:block;color:#858c96;font-size:7.5px;margin-top:2px}.v9-empty{padding:24px;text-align:center;color:#8c939d;font-size:10px}.v9-version{color:#ff9f75!important;border-color:#6b351e!important}'+
  '@media(max-width:900px){.v9-results,.v9-groupgrid{grid-template-columns:1fr}.v9-searchrow{grid-template-columns:1fr}}';
  document.head.appendChild(st);
}
function v9Activate(id){
  document.querySelectorAll('.page').forEach(function(x){x.classList.toggle('active',x.id===id);});
  document.querySelectorAll('.navbtn[data-page]').forEach(function(x){x.classList.toggle('active',x.dataset.page===id);});
  try{currentPage=id;}catch(e){}
}
function v9OpenGroup(gi){try{if(typeof openGroup==='function')openGroup(gi);}catch(e){}}
function v9OpenGroupRoutes(gi){
  var nav=document.querySelector('.navbtn[data-page="groupRoutes"]');if(nav)nav.click();
  setTimeout(function(){
    var q=document.getElementById('noc8GroupQuery');if(q){q.value=v9GroupName(gi);q.dispatchEvent(new Event('input',{bubbles:true}));q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}
  },120);
}
function v9SearchWhatsPoint(pi){
  var p=P[pi]||[],q=document.getElementById('q'),scope=document.getElementById('scope');if(!q||!scope)return;
  q.value=String(p[1]||p[2]||'');scope.value='message';try{showPage('search');renderSearch();}catch(e){}
}
function v9SearchCandidates(raw){
  var out=[],seen=new Set(),pq;
  try{pq=parseQ(raw);}catch(e){pq={free:[v9Norm(raw)],f:{}};}
  function push(i){if(Number.isInteger(i)&&P[i]&&!seen.has(i)){seen.add(i);out.push(i);}}
  try{(searchPoint(pq,20)||[]).forEach(push);}catch(e){}
  try{(searchMachine(pq,40)||[]).forEach(function(mi){var m=M[mi];if(!m)return;var pi=pointMap.get(pkey(m[1],m[5]));push(pi);});}catch(e){}
  return out.slice(0,24);
}
function v9GroupButton(s){
  var str=v9Strength(s);return '<button class="v9-gitem" data-v9-group="'+s.group+'"><span><strong>'+v9Esc(v9GroupName(s.group))+'</strong><small>'+v9Fmt(s.count)+' evidência(s) vinculada(s) • '+v9Fmt(s.high)+' forte(s)</small></span>'+v9Pill(str.label,str.cls)+'</button>';
}
function v9PointCard(pi){
  var p=P[pi]||[],groups=v9TopGroups(pi,4),ops=v9OpsPointUrl(pi),area=p[10]||'',praca=p[6]||'';
  var gh=groups.length?groups.map(v9GroupButton).join(''):'<div class="v9-empty">Nenhum grupo foi ligado a este ponto com evidência suficiente na base atual.</div>';
  return '<article class="v9-pcard" data-v9-point="'+pi+'"><div class="v9-phead"><span class="code">PONTO '+v9Esc(p[1]||'—')+'</span><strong>'+v9Esc(p[2]||'Sem nome')+'</strong><small>'+v9Esc([area,praca,p[3]||''].filter(Boolean).join(' • '))+'</small></div><div class="v9-pbody"><div class="v9-label">GRUPOS DE WHATSAPP RELACIONADOS</div><div class="v9-groups">'+gh+'</div><div class="v9-pactions"><button class="primary" data-v9-detail="'+pi+'">Detalhes do ponto</button>'+(ops?'<a href="'+v9Esc(ops)+'" target="_blank" rel="noopener">Abrir no Operações ↗</a>':'')+'<button data-v9-msg="'+pi+'">Mensagens do ponto</button>'+(groups[0]?'<button data-v9-routes="'+groups[0].group+'">Rotas do grupo principal</button>':'')+'</div></div></article>';
}
function v9RenderPointGroups(){
  var input=document.getElementById('v9PointGroupInput'),el=document.getElementById('v9PointGroupResults');if(!input||!el)return;
  var raw=input.value.trim();
  if(!raw){el.innerHTML='<div class="card v9-empty">Digite código do ponto, nome do local, endereço ou nome/ID de máquina.</div>';return;}
  var ids=v9SearchCandidates(raw);el.innerHTML=ids.length?ids.map(v9PointCard).join(''):'<div class="card v9-empty">Nenhum ponto encontrado para <b>'+v9Esc(raw)+'</b>.</div>';
}
function v9InstallPointGroupsPage(){
  var main=document.querySelector('.main')||document.querySelector('main');if(!main)return;
  var sec=document.getElementById('pointGroups');if(!sec){sec=document.createElement('section');sec.id='pointGroups';sec.className='page';main.appendChild(sec);}
  sec.innerHTML='<div class="v9-hero"><h3>ACHE O <b>GRUPO DO PONTO</b></h3><p>Pesquise pelo ponto ou pela máquina. A Central mostra os grupos onde esse local realmente apareceu no histórico, com quantidade de evidências. Associação histórica não é tratada como grupo oficial quando a base não prova isso.</p><div class="v9-searchrow"><input id="v9PointGroupInput" placeholder="Ex.: 77825, Visionnaire, 92782, Brooklin Prime..."><button id="v9PointGroupGo">ENCONTRAR GRUPOS</button></div></div><div id="v9PointGroupResults" class="v9-results"></div>';
  var nav=document.querySelector('.navbtn[data-page="pointGroups"]');if(!nav){
    nav=document.createElement('button');nav.className='navbtn';nav.dataset.page='pointGroups';nav.innerHTML='Ponto → Grupo <span class="n">V9</span>';
    var anchor=document.querySelector('.navbtn[data-page="groupRoutes"]')||document.querySelector('.navbtn[data-page="router"]');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(nav,anchor.nextSibling);
  }
  nav.onclick=function(e){e.preventDefault();v9Activate('pointGroups');setTimeout(function(){var q=document.getElementById('v9PointGroupInput');if(q)q.focus();},30);};
  document.getElementById('v9PointGroupGo').onclick=v9RenderPointGroups;
  document.getElementById('v9PointGroupInput').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();v9RenderPointGroups();}});
  document.getElementById('v9PointGroupInput').addEventListener('input',function(){clearTimeout(V9.pointTimer);V9.pointTimer=setTimeout(v9RenderPointGroups,160);});
  sec.addEventListener('click',function(e){
    var b=e.target.closest('[data-v9-group],[data-v9-detail],[data-v9-msg],[data-v9-routes]');if(!b)return;
    if(b.dataset.v9Group!=null){v9OpenGroup(Number(b.dataset.v9Group));return;}
    if(b.dataset.v9Detail!=null){try{openP(Number(b.dataset.v9Detail));}catch(x){}return;}
    if(b.dataset.v9Msg!=null){v9SearchWhatsPoint(Number(b.dataset.v9Msg));return;}
    if(b.dataset.v9Routes!=null){v9OpenGroupRoutes(Number(b.dataset.v9Routes));}
  });
}
function v9GroupsMatching(raw){
  var q=v9Norm(raw),qt=q.split(/\s+/).filter(Boolean),arr=[];
  for(var gi=0;gi<WA.groups.length;gi++){
    var g=WA.groups[gi],blob=V9.groupBlobs[gi]||'',gn=v9Norm(g.name||''),ok=!qt.length||qt.every(function(t){return blob.indexOf(t)>=0;});if(!ok)continue;
    var score=0;if(q&&gn===q)score+=10000;else if(q&&gn.indexOf(q)>=0)score+=5000;
    qt.forEach(function(t){if(gn.indexOf(t)>=0)score+=600;else if(blob.indexOf(t)>=0)score+=160;});score+=(g.messagesObserved||0)/100;
    arr.push({gi:gi,score:score});
  }
  arr.sort(function(a,b){return b.score-a.score||(WA.groups[b.gi].messagesObserved||0)-(WA.groups[a.gi].messagesObserved||0)||v9GroupName(a.gi).localeCompare(v9GroupName(b.gi),'pt-BR');});
  return arr.map(function(x){return x.gi;});
}
function v9GroupCard(gi){
  var g=WA.groups[gi],pts=v9TopPoints(gi,4),ph=pts.length?pts.map(function(s){var p=P[s.point]||[];return v9Pill((p[1]||'')+' • '+(p[2]||''),'');}).join(''):'<span class="muted tiny">Nenhum ponto vinculado</span>';
  return '<div class="v9-groupcard" data-v9-open-group="'+gi+'"><h4>'+v9Esc(g.name||('Grupo '+gi))+'</h4><div class="meta">'+v9Esc([g.category||'',(g.regionHints||[]).join(', ')].filter(Boolean).join(' • '))+'</div><div class="points">'+ph+'</div><div class="stats">'+v9Coverage(gi)+v9Pill(v9Fmt(g.messagesObserved)+' msg','')+v9Pill(v9Fmt(pts.length)+' ponto(s) top','')+'</div></div>';
}
function v9RenderGroupsPage(){
  var sec=document.getElementById('groups');if(!sec)return;
  if(!document.getElementById('v9GroupSearch')){
    sec.innerHTML='<div class="card section"><div class="v9-groupshero"><h3>Grupos de WhatsApp</h3><p>Agora você pode buscar pelo <b>nome do grupo</b> ou pelo <b>ponto relacionado</b>. Ex.: código 77825 ou Visionnaire.</p><input id="v9GroupSearch" placeholder="Grupo, código do ponto, nome do ponto, praça..."><div id="v9GroupStatus" class="hint" style="margin-top:7px"></div></div><div id="v9GroupCards" class="v9-groupgrid"></div></div>';
    document.getElementById('v9GroupSearch').addEventListener('input',function(){clearTimeout(V9.groupTimer);V9.groupTimer=setTimeout(v9RefreshGroups,120);});
    document.getElementById('v9GroupCards').addEventListener('click',function(e){var c=e.target.closest('[data-v9-open-group]');if(c)v9OpenGroup(Number(c.dataset.v9OpenGroup));});
  }
  v9RefreshGroups();
}
function v9RefreshGroups(){
  var q=document.getElementById('v9GroupSearch'),cards=document.getElementById('v9GroupCards'),status=document.getElementById('v9GroupStatus');if(!q||!cards)return;
  var ids=v9GroupsMatching(q.value).slice(0,80);cards.innerHTML=ids.length?ids.map(v9GroupCard).join(''):'<div class="v9-empty">Nenhum grupo encontrado.</div>';if(status)status.textContent=ids.length+' grupo(s) exibido(s). Busque também pelo código ou nome do ponto.';
}
function v9OverrideGroupSearch(){
  try{V9.oldSearchGroup=searchGroup;searchGroup=function(pq,max){
    var terms=(pq&&pq.free)||[],arr=[];
    for(var gi=0;gi<WA.groups.length;gi++){
      var g=WA.groups[gi],blob=V9.groupBlobs[gi]||'',gn=v9Norm(g.name||'');
      if(pq&&pq.f&&pq.f.grupo&&!pq.f.grupo.every(function(v){return gn.indexOf(v9Norm(v))>=0;}))continue;
      if(!terms.every(function(t){return blob.indexOf(v9Norm(t))>=0;}))continue;
      var s=terms.reduce(function(a,t){var nt=v9Norm(t);return a+(gn===nt?1800:gn.indexOf(nt)>=0?800:blob.indexOf(nt)>=0?230:0);},0)+(g.messagesObserved||0)/100;arr.push([s,gi]);
    }
    arr.sort(function(a,b){return b[0]-a[0]||a[1]-b[1];});return arr.slice(0,max).map(function(x){return x[1];});
  };}catch(e){}
}
function v9PointGroupCell(pi){
  var a=v9TopGroups(pi,2);if(!a.length)return '<span class="muted">sem vínculo</span>';
  var first=a[0],str=v9Strength(first);return '<div class="v9-cell"><strong>'+v9Esc(v9GroupName(first.group))+'</strong><small>'+v9Fmt(first.count)+' evidência(s) • '+v9Esc(str.label)+(a.length>1?' • +'+(v9TopGroups(pi,99).length-1)+' grupo(s)':'')+'</small></div>';
}
function v9OverridePointTable(){
  try{V9.oldRenderPointTable=renderPointTable;renderPointTable=function(ids,terms){
    terms=terms||[];if(!ids.length)return '<div class="empty">Nenhum ponto encontrado.</div>';
    var h='<div class="tablewrap"><table><thead><tr><th>ID Operações</th><th>Código</th><th>Ponto</th><th>Grupos relacionados</th><th>Endereço</th><th>Área</th><th>Praça</th><th>Status</th><th></th></tr></thead><tbody>';
    for(var z=0;z<ids.length;z++){
      var i=ids[z],p=P[i],ops=v9OpsPointUrl(i);
      h+='<tr><td class="mono">'+highlight(p[0],terms)+'</td><td class="mono bold">'+highlight(p[1],terms)+'</td><td>'+highlight(p[2],terms)+'</td><td>'+v9PointGroupCell(i)+'</td><td class="clip">'+highlight(p[3],terms)+'</td><td>'+highlight(p[10],terms)+'</td><td>'+pill(p[6]||'—')+'</td><td>'+(p[8]?pill('Atual','ok'):pill(p[7]||'Legado',''))+'</td><td><div class="actions"><button onclick="openP('+i+')">Detalhes</button>'+(ops?'<button onclick="window.open(\''+v9Esc(ops)+'\',\'_blank\')">Operações ↗</button>':'')+'</div></td></tr>';
    }
    return h+'</tbody></table></div>';
  };}catch(e){}
}
function v9InlineGroups(pi){
  var a=v9TopGroups(pi,6),ops=v9OpsPointUrl(pi),h='<div class="v9-inline-groups" id="v9PointQuick"><h4>ATALHOS NOC • PONTO → GRUPO</h4><p>Grupos associados por evidência histórica do WhatsApp. Use as provas/rotas quando precisar confirmar o encaminhamento.</p><div class="v9-inline-list">';
  if(a.length)a.forEach(function(s){var st=v9Strength(s);h+='<button data-v9-inline-group="'+s.group+'">'+v9Esc(v9GroupName(s.group))+' • '+v9Fmt(s.count)+' • '+st.label+'</button>';});else h+='<span class="muted small">Nenhum grupo ligado a este ponto na base atual.</span>';
  h+='</div><div class="v9-pactions">'+(ops?'<a href="'+v9Esc(ops)+'" target="_blank" rel="noopener">Abrir ponto no Operações ↗</a>':'')+(a[0]?'<button data-v9-inline-routes="'+a[0].group+'">Ver rotas do grupo principal</button>':'')+'<button data-v9-inline-msg="'+pi+'">Pesquisar mensagens deste ponto</button></div></div>';return h;
}
function v9PatchDrawers(){
  V9.oldOpenP=window.openP;window.openP=async function(i){
    await V9.oldOpenP(i);var body=document.getElementById('drawerBody');if(!body||document.getElementById('v9PointQuick'))return;body.insertAdjacentHTML('afterbegin',v9InlineGroups(i));
  };
  V9.oldOpenM=window.openM;window.openM=async function(i){
    await V9.oldOpenM(i);var body=document.getElementById('drawerBody');if(!body||document.getElementById('v9MachineQuick'))return;var m=M[i]||[],pi;try{pi=pointMap.get(pkey(m[1],m[5]));}catch(e){}
    var mh='<div class="v9-inline-groups" id="v9MachineQuick"><h4>ATALHOS NOC • MÁQUINA</h4><div class="v9-pactions"><a href="'+v9Esc(v9OpsMachineUrl(i))+'" target="_blank" rel="noopener">Abrir máquina no Operações ↗</a>'+(Number.isInteger(pi)?'<a href="'+v9Esc(v9OpsPointUrl(pi))+'" target="_blank" rel="noopener">Abrir ponto no Operações ↗</a><button data-v9-open-point="'+pi+'">Grupos do ponto</button>':'')+'</div></div>';body.insertAdjacentHTML('afterbegin',mh);
  };
  document.getElementById('drawerBody').addEventListener('click',function(e){
    var b=e.target.closest('[data-v9-inline-group],[data-v9-inline-routes],[data-v9-inline-msg],[data-v9-open-point]');if(!b)return;
    if(b.dataset.v9InlineGroup!=null){v9OpenGroup(Number(b.dataset.v9InlineGroup));return;}
    if(b.dataset.v9InlineRoutes!=null){document.getElementById('drawerBack').classList.remove('open');v9OpenGroupRoutes(Number(b.dataset.v9InlineRoutes));return;}
    if(b.dataset.v9InlineMsg!=null){document.getElementById('drawerBack').classList.remove('open');v9SearchWhatsPoint(Number(b.dataset.v9InlineMsg));return;}
    if(b.dataset.v9OpenPoint!=null){var pi=Number(b.dataset.v9OpenPoint),p=P[pi]||[];document.getElementById('drawerBack').classList.remove('open');v9Activate('pointGroups');setTimeout(function(){var q=document.getElementById('v9PointGroupInput');if(q){q.value=p[1]||p[2]||'';v9RenderPointGroups();}},50);}
  });
}
function v9PatchGroups(){try{renderGroups=v9RenderGroupsPage;}catch(e){}var nav=document.querySelector('.navbtn[data-page="groups"]');if(nav){nav.onclick=function(e){e.preventDefault();v9Activate('groups');v9RenderGroupsPage();};}}
function v9Badge(){var el=document.getElementById('topBadges');if(el&&!document.getElementById('v9Badge')){var s=document.createElement('span');s.id='v9Badge';s.className='badge v9-version';s.textContent='V9 • Ponto → Grupo';el.appendChild(s);}}
function v9Install(){
  if(V9.installed)return;V9.installed=true;
  v9Styles();v9BuildRelations();v9InstallPointGroupsPage();v9OverrideGroupSearch();v9OverridePointTable();v9PatchDrawers();v9PatchGroups();v9Badge();
  try{if(currentPage==='groups')v9RenderGroupsPage();if(currentPage==='search'&&document.getElementById('q').value.trim())renderSearch();}catch(e){}
  window.__ELETRO_V9_READY__=true;
}
function v9Boot(){
  var start=Date.now(),timer=setInterval(function(){
    var ready=false;try{ready=window.__ELETRO_V7_READY__===true&&typeof WA!=='undefined'&&WA&&Array.isArray(WA.messages)&&typeof P!=='undefined'&&P.length&&document.querySelector('.main');}catch(e){}
    var v8=document.querySelector('.navbtn[data-page="groupRoutes"]');
    if(ready&&(v8||Date.now()-start>12000)){clearInterval(timer);try{v9Install();}catch(e){console.error('V9 UX:',e);}}
    else if(Date.now()-start>30000){clearInterval(timer);console.error('V9 UX: base não ficou pronta em 30s.');}
  },120);
}

v9Boot();
})();