(function(){
'use strict';
const C=()=>window.PrismaCore;
const S=()=>C().S;
const esc=v=>C().esc(v),fmt=n=>C().fmt(n),norm=v=>C().norm(v);

function statusChip(g){
  const s=String(g&&g.status||'').toUpperCase();
  if(s==='COMPLETE')return '<span class="chip ok">coleta completa</span>';
  if(s==='COMPLETE_WITH_MEDIA_GAPS')return '<span class="chip warn">texto completo • gaps mídia</span>';
  if(s==='NEEDS_REVIEW')return '<span class="chip warn">revisão necessária</span>';
  if(s==='FAILED')return '<span class="chip danger">falha de coleta</span>';
  return '<span class="chip">'+esc(s||'sem status')+'</span>';
}
function groupCard(g,i){
  return '<button class="group-card" data-group="'+i+'"><div><b>'+esc(g.name||('Grupo '+i))+'</b><small>'+esc([g.category,(g.regionHints||[]).join(', ')].filter(Boolean).join(' • '))+'</small></div><div>'+statusChip(g)+'<small>'+fmt(g.messagesObserved||0)+' msg • '+fmt(g.mediaUnique||0)+' mídia</small></div></button>';
}
function latestMessages(gi,max){
  const arr=[];for(let i=0;i<S().messages.length;i++){const m=S().messages[i]||[];if(Number(m[4])===Number(gi))arr.push({i,m});}
  arr.sort((a,b)=>Number(b.m[1]||0)-Number(a.m[1]||0));
  return arr.slice(0,max||50);
}
function openGroup(gi){
  const g=S().groups[gi];if(!g){C().toast('Grupo não encontrado');return}
  const msgs=latestMessages(gi,60);
  const html='<h2>'+esc(g.name||('Grupo '+gi))+'</h2><div class="sub">'+esc([g.category,(g.regionHints||[]).join(', ')].filter(Boolean).join(' • '))+'</div>'+
  '<div class="actions" style="margin-top:10px"><button id="groupRoutesBtn" class="primary">Ver rotas</button><button id="groupMessageBtn">Criar mensagem</button></div>'+
  '<div class="section-title">Cobertura</div><div class="field-grid">'+
  '<div class="field"><label>Status</label><div>'+statusChip(g)+'</div></div>'+
  '<div class="field"><label>Mensagens observadas</label><div>'+fmt(g.messagesObserved||msgs.length)+'</div></div>'+
  '<div class="field"><label>Mídias únicas</label><div>'+fmt(g.mediaUnique||0)+'</div></div>'+
  '<div class="field"><label>Motivos de revisão</label><div>'+esc((g.reviewReasons||[]).join(', ')||'—')+'</div></div></div>'+
  '<div class="section-title">Histórico recente</div><div class="timeline">'+
  (msgs.length?msgs.map(x=>'<button class="timeline-row" data-message="'+x.i+'"><div class="meta">'+esc([x.m[2],x.m[3],x.m[5]].filter(Boolean).join(' • '))+'</div><div>'+esc(String(x.m[6]||x.m[10]||'(sem texto)').slice(0,500))+'</div></button>').join(''):'<div class="empty">Nenhuma mensagem observada.</div>')+'</div>';
  PrismaApp.openDrawer(html);
  document.querySelector('#drawerBody #groupRoutesBtn').onclick=()=>{PrismaApp.closeDrawer();PrismaApp.activate('routes');setTimeout(()=>PrismaRoutes.selectGroup&&PrismaRoutes.selectGroup(gi),30)};
  document.querySelector('#drawerBody #groupMessageBtn').onclick=()=>{PrismaApp.closeDrawer();PrismaApp.activate('messages');setTimeout(()=>PrismaMessages.prefill({group:gi}),30)};
  document.querySelectorAll('#drawerBody [data-message]').forEach(b=>b.onclick=()=>PrismaApp.openMessage(Number(b.dataset.message)));
}
function renderGroups(){
  const host=document.getElementById('page-groups');if(!host)return;
  if(!S().connected){host.innerHTML='<div class="card empty">Conecte a pasta V11 para carregar os grupos do WhatsApp.</div>';return}
  host.innerHTML='<div class="hero"><h2>GRUPOS <b>WHATSAPP</b></h2><p>Busca, cobertura e histórico preservado. Nenhuma mensagem de origem é alterada.</p></div>'+
  '<div class="card"><div class="card-body"><div class="search-row"><input id="groupSearch" placeholder="Nome do grupo, categoria, região…"><button id="groupSearchBtn" class="primary">Buscar</button></div></div></div>'+
  '<div id="groupGrid" class="group-grid"></div>';
  const run=()=>{const q=norm(document.getElementById('groupSearch').value);const rows=S().groups.map((g,i)=>({g,i})).filter(x=>!q||norm([x.g.name,x.g.category,(x.g.regionHints||[]).join(' ')].join(' ')).includes(q)).sort((a,b)=>String(a.g.name||'').localeCompare(String(b.g.name||''),'pt-BR'));document.getElementById('groupGrid').innerHTML=rows.length?rows.map(x=>groupCard(x.g,x.i)).join(''):'<div class="card empty">Nenhum grupo encontrado.</div>';document.querySelectorAll('#groupGrid [data-group]').forEach(b=>b.onclick=()=>openGroup(Number(b.dataset.group)));};
  document.getElementById('groupSearchBtn').onclick=run;document.getElementById('groupSearch').oninput=run;run();
}
async function resolvePoint(raw){
  const rows=await C().search(raw,15,'all');for(const r of rows){if(r.type==='point')return r.entity;if(r.type==='machine'){const p=C().pointForMachine(r.entity);if(p)return p;}}return null;
}
function confidenceLabel(s){
  if(s.strong>=3||s.count>=5)return ['CONFIRMADO','ok'];
  if(s.strong>=1||s.medium>=2)return ['PROVÁVEL','blue'];
  if(s.count>=1)return ['HISTÓRICO','warn'];
  return ['SEM EVIDÊNCIA',''];
}
function renderPointGroup(){
  const host=document.getElementById('page-pointgroup');if(!host)return;
  host.innerHTML='<div class="hero"><h2>PONTO <b>→ GRUPO</b></h2><p>Pesquise por código/nome do ponto ou por máquina relacionada. O resultado usa vínculos reais do histórico.</p></div>'+
  '<div class="card"><div class="card-body"><div class="search-row"><input id="pgQuery" placeholder="Ex.: 78670, Chronos, urbanbarrafunda2_1…"><button id="pgRun" class="primary">Encontrar grupos</button></div></div></div><div id="pgOut"></div>';
  const run=async()=>{const q=document.getElementById('pgQuery').value.trim(),out=document.getElementById('pgOut');if(!q){out.innerHTML='<div class="card empty">Digite um ponto ou máquina.</div>';return}out.innerHTML='<div class="card empty">Cruzando histórico…</div>';const p=await resolvePoint(q);if(!p){out.innerHTML='<div class="card empty">Nenhum ponto relacionado encontrado.</div>';return}renderPointGroupsFor(p);};
  document.getElementById('pgRun').onclick=run;document.getElementById('pgQuery').onkeydown=e=>{if(e.key==='Enter')run()};
}
function renderPointGroupsFor(p){
  const out=document.getElementById('pgOut');if(!out)return;const stats=C().groupStatsForPoint(p);
  out.innerHTML='<div class="card result-section"><div class="card-head"><h3>'+esc((p.code?p.code+' • ':'')+p.name)+'</h3><small>'+fmt(stats.length)+' grupo(s) relacionado(s)</small></div><div class="card-body">'+
  (stats.length?stats.map(s=>{const g=S().groups[s.group]||{},l=confidenceLabel(s);return '<div class="source-row"><div><b>'+esc(g.name||('Grupo '+s.group))+'</b><small>'+fmt(s.count)+' evidência(s) • '+fmt(s.strong)+' forte(s) • confiança máx. '+Math.round(s.maxConfidence*100)+'%</small></div><div class="actions"><span class="chip '+l[1]+'">'+l[0]+'</span><button data-open-pg="'+s.group+'">Abrir grupo</button><button data-route-pg="'+s.group+'">Rotas</button><button data-msg-pg="'+s.group+'">Mensagem</button></div></div>';}).join(''):'<div class="empty">Nenhum grupo sustentado pelo histórico deste ponto.</div>')+
  '</div></div>';
  out.querySelectorAll('[data-open-pg]').forEach(b=>b.onclick=()=>openGroup(Number(b.dataset.openPg)));
  out.querySelectorAll('[data-route-pg]').forEach(b=>b.onclick=()=>{PrismaApp.activate('routes');setTimeout(()=>PrismaRoutes.selectGroup&&PrismaRoutes.selectGroup(Number(b.dataset.routePg)),30)});
  out.querySelectorAll('[data-msg-pg]').forEach(b=>b.onclick=()=>{PrismaApp.activate('messages');setTimeout(()=>PrismaMessages.prefill({group:Number(b.dataset.msgPg),pointKey:p._key}),30)});
}
function openPointGroups(pointKey){
  const p=C().getPoint(pointKey);if(!p)return;PrismaApp.activate('pointgroup');setTimeout(()=>{const q=document.getElementById('pgQuery');if(q)q.value=(p.code||p.name||'');renderPointGroupsFor(p)},30);
}
window.PrismaGroups={renderGroups,renderPointGroup,openGroup,openPointGroups,renderPointGroupsFor};
})();