(function(){
'use strict';
const C=()=>window.PrismaCore,S=()=>C().S,DB=()=>window.PrismaDB;
const esc=v=>C().esc(v),fmt=n=>C().fmt(n),norm=v=>C().norm(v);
const STATUSES=['Fazer','Validar','Aguardando','Em andamento','Bloqueado','Concluído'];
let currentPointKey=null,taskFilter='abertas';

function dateState(v){
  if(!v)return {label:'sem prazo',cls:''};const d=new Date(v),now=new Date();if(Number.isNaN(d.getTime()))return {label:String(v),cls:''};
  const same=d.toDateString()===now.toDateString();if(d<now&&!same)return {label:'atrasada • '+d.toLocaleString('pt-BR'),cls:'danger'};if(same)return {label:'hoje • '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),cls:'warn'};return {label:d.toLocaleString('pt-BR'),cls:'blue'};
}
async function tasks(){const a=await DB().all('tasks');a.sort((x,y)=>String(y.updatedAt||'').localeCompare(String(x.updatedAt||'')));return a}
async function favorites(){return DB().all('favorites')}
async function isFav(key){return (await DB().get('favorites','point:'+key))||null}
async function toggleFav(p){const id='point:'+p._key,f=await DB().get('favorites',id);if(f)await DB().delete('favorites',id);else await DB().put('favorites',{id,kind:'point',key:p._key,label:(p.code?p.code+' • ':'')+p.name,createdAt:new Date().toISOString()});C().toast(f?'Removido dos favoritos':'Ponto favoritado');if(document.getElementById('page-flow360')?.classList.contains('active'))render360(p._key)}
function taskCard(t){
  const ds=dateState(t.dueAt),p=t.pointKey?C().getPoint(t.pointKey):null,m=t.machineKey?C().getMachine(t.machineKey):null;
  return '<div class="task-card"><div><div class="task-meta"><span class="chip '+(t.priority==='Alta'?'danger':t.priority==='Baixa'?'':'warn')+'">'+esc(t.priority||'Média')+'</span><span class="chip">'+esc(t.status||'Fazer')+'</span><span class="chip '+ds.cls+'">'+esc(ds.label)+'</span></div><b>'+esc(t.title||'Tarefa')+'</b><small>'+esc([p&&('Ponto '+p.code+' • '+p.name),m&&('Máq '+m.id),t.ticket&&('Chamado '+t.ticket)].filter(Boolean).join(' | '))+'</small></div><div class="actions"><button data-task-open="'+esc(t.id)+'">Editar</button><button data-task-next="'+esc(t.id)+'">Avançar</button></div></div>';
}
async function renderToday(){
  const host=document.getElementById('page-today');if(!host)return;const all=await tasks(),favs=await favorites(),audit=(await DB().all('audit')).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,12);
  let rows=all;if(taskFilter==='abertas')rows=all.filter(t=>t.status!=='Concluído');else if(taskFilter!=='todas')rows=all.filter(t=>t.status===taskFilter);
  const overdue=all.filter(t=>t.status!=='Concluído'&&t.dueAt&&new Date(t.dueAt)<new Date()).length;
  host.innerHTML='<div class="hero"><h2>MEU <b>TURNO</b></h2><p>Pesquisar → entender → agir → registrar. Pendências locais do PRISMA, sem alterar a base de origem.</p><div class="actions" style="margin-top:10px"><button id="newTask" class="primary">Nova tarefa</button><button id="quickCapture">Captura rápida</button><span class="chip '+(overdue?'danger':'ok')+'">'+fmt(overdue)+' atrasada(s)</span></div></div>'+
  '<div class="tabs"><button data-task-filter="abertas">Abertas</button>'+STATUSES.map(s=>'<button data-task-filter="'+esc(s)+'">'+esc(s)+'</button>').join('')+'<button data-task-filter="todas">Todas</button></div>'+
  '<div class="grid2"><div class="card"><div class="card-head"><h3>Pendências</h3><small>'+fmt(rows.length)+'</small></div><div class="card-body task-list">'+(rows.length?rows.map(taskCard).join(''):'<div class="empty">Nada aqui.</div>')+'</div></div>'+
  '<div><div class="card"><div class="card-head"><h3>Favoritos</h3><small>'+fmt(favs.length)+'</small></div><div class="card-body">'+(favs.length?favs.map(f=>'<div class="source-row"><div><b>'+esc(f.label)+'</b><small>'+esc(f.kind)+'</small></div><button data-fav-open="'+esc(f.key)+'">Abrir</button></div>').join(''):'<div class="empty">Nenhum favorito.</div>')+'</div></div>'+
  '<div class="card" style="margin-top:12px"><div class="card-head"><h3>Atividade recente</h3><small>automática</small></div><div class="card-body">'+(audit.length?audit.map(a=>'<div class="audit-row"><b>'+esc(a.label||a.type)+'</b><small>'+esc(a.at||'')+'</small></div>').join(''):'<div class="empty">Sem atividade.</div>')+'</div></div></div></div>';
  document.getElementById('newTask').onclick=()=>taskEditor(null,{});document.getElementById('quickCapture').onclick=openCapture;
  host.querySelectorAll('[data-task-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.taskFilter===taskFilter);b.onclick=()=>{taskFilter=b.dataset.taskFilter;renderToday()}});
  host.querySelectorAll('[data-task-open]').forEach(b=>b.onclick=()=>taskEditor(b.dataset.taskOpen));
  host.querySelectorAll('[data-task-next]').forEach(b=>b.onclick=()=>advanceTask(b.dataset.taskNext));
  host.querySelectorAll('[data-fav-open]').forEach(b=>b.onclick=()=>{PrismaApp.activate('flow360');setTimeout(()=>render360(b.dataset.favOpen),20)});
}
async function taskEditor(id,prefill){
  const t=id?await DB().get('tasks',id):Object.assign({id:DB().uid('task'),title:'',status:'Fazer',priority:'Média',dueAt:'',notes:'',pointKey:null,machineKey:null,ticket:''},prefill||{});
  const p=t.pointKey?C().getPoint(t.pointKey):null,m=t.machineKey?C().getMachine(t.machineKey):null;
  PrismaApp.showModal('<h3 style="margin-top:0">'+(id?'Editar tarefa':'Nova tarefa')+'</h3><div class="form-grid"><label class="full">Título<input id="taskTitle" value="'+esc(t.title||'')+'"></label><label>Status<select id="taskStatus">'+STATUSES.map(s=>'<option '+(s===t.status?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label><label>Prioridade<select id="taskPriority"><option '+(t.priority==='Baixa'?'selected':'')+'>Baixa</option><option '+(t.priority==='Média'?'selected':'')+'>Média</option><option '+(t.priority==='Alta'?'selected':'')+'>Alta</option></select></label><label>Prazo<input id="taskDue" type="datetime-local" value="'+esc(t.dueAt||'')+'"></label><label>Chamado<input id="taskTicket" value="'+esc(t.ticket||'')+'"></label><label class="full">Ponto / máquina vinculados<div class="context-box"><b>'+esc(p?((p.code?p.code+' • ':'')+p.name):'sem ponto')+'</b><small>'+esc(m?('Máq '+m.id+' • '+m.name):'sem máquina')+'</small></div></label><label class="full">Notas<textarea id="taskNotes" style="min-height:140px">'+esc(t.notes||'')+'</textarea></label></div><div class="actions" style="margin-top:10px"><button data-modal-close>Cancelar</button>'+(id?'<button id="taskDelete" class="danger">Excluir</button>':'')+'<button id="taskSave" class="primary">Salvar</button></div>');
  document.querySelector('[data-modal-close]').onclick=PrismaApp.closeModal;
  document.getElementById('taskSave').onclick=async()=>{t.title=document.getElementById('taskTitle').value.trim()||'Tarefa';t.status=document.getElementById('taskStatus').value;t.priority=document.getElementById('taskPriority').value;t.dueAt=document.getElementById('taskDue').value;t.ticket=document.getElementById('taskTicket').value.trim();t.notes=document.getElementById('taskNotes').value;t.updatedAt=new Date().toISOString();if(!t.createdAt)t.createdAt=t.updatedAt;await DB().put('tasks',t);await DB().audit('tarefa','Tarefa salva: '+t.title,t.id,{status:t.status});PrismaApp.closeModal();C().toast('Tarefa salva');renderToday()};
  if(id)document.getElementById('taskDelete').onclick=async()=>{if(confirm('Excluir esta tarefa?')){await DB().delete('tasks',id);await DB().audit('tarefa','Tarefa excluída: '+(t.title||id),id,{});PrismaApp.closeModal();renderToday()}};
}
async function advanceTask(id){const t=await DB().get('tasks',id);if(!t)return;let i=STATUSES.indexOf(t.status);t.status=STATUSES[Math.min(STATUSES.length-1,Math.max(0,i)+1)];t.updatedAt=new Date().toISOString();await DB().put('tasks',t);await DB().audit('tarefa','Tarefa → '+t.status,t.id,{});renderToday()}
function openCapture(){
  PrismaApp.showModal('<h3 style="margin-top:0">Captura rápida</h3><p class="muted">Cole a anotação como veio. O texto original é preservado e a V12 procura ponto/máquina/chamado existente.</p><textarea id="captureText" style="min-height:180px" placeholder="Ex.: Chronos 14122 validar ativos amanhã"></textarea><div class="actions" style="margin-top:10px"><button data-modal-close>Cancelar</button><button id="captureAnalyze" class="primary">Organizar</button></div><div id="captureOut"></div>');
  document.querySelector('[data-modal-close]').onclick=PrismaApp.closeModal;
  document.getElementById('captureAnalyze').onclick=async()=>{const raw=document.getElementById('captureText').value.trim();if(!raw)return;const rows=await C().search(raw,12,'all'),best=rows.find(r=>['point','machine','ticket'].includes(r.type));let pre={title:raw.split(/\r?\n/)[0].slice(0,120),notes:'Texto original:\n'+raw,status:'Validar',priority:'Média'};if(best?.type==='point')pre.pointKey=best.entity._key;if(best?.type==='machine'){pre.machineKey=best.entity._key;const p=C().pointForMachine(best.entity);if(p)pre.pointKey=p._key}if(best?.type==='ticket')pre.ticket=best.key;PrismaApp.closeModal();taskEditor(null,pre)};
}
function evidenceLevel(stats){
  const total=stats.reduce((s,x)=>s+x.count,0),strong=stats.reduce((s,x)=>s+x.strong,0),medium=stats.reduce((s,x)=>s+x.medium,0);
  if(strong>=3||total>=8)return ['CONFIRMADO','ok'];if(strong>=1||medium>=2)return ['PROVÁVEL','blue'];if(total)return ['HISTÓRICO','warn'];return ['SEM EVIDÊNCIA',''];
}
function recommendation(p,refs,groups){
  const latest=refs.slice().sort((a,b)=>Number(b.message[1]||0)-Number(a.message[1]||0)).slice(0,40),txt=norm(latest.map(r=>r.message[6]||r.message[10]||'').join(' '));let title='Validar contexto antes de agir',body='A base não tem evidência suficiente para recomendar uma ação específica. Confirme ponto, máquina e situação antes de encaminhar.';
  if(/\b(tela apagada|tela preta|fonte|cabo|energia|hardware|display|monitor|placa|modulo|troca)\b/.test(txt)){title='Provável intervenção física';body='Há histórico de sinais físicos. Faça a validação remota básica e, se persistir, encaminhe para manutenção/campo com o que já foi testado.'}
  else if(/\b(offline|sem acesso|inacessivel|internet|rede|conectividade|sem midia|player|loop)\b/.test(txt)){title='Comece por validação remota rápida';body='O histórico aponta acesso, rede ou mídia. Valide conectividade/player e reinício controlado quando aplicável.'}
  else if(/\b(chamado|ticket|protocolo)\b/.test(txt)){title='Acompanhe pelo chamado';body='O histórico referencia tratativas por chamado. Confira chamados relacionados e timeline antes de novo acionamento.'}
  if(groups[0])body+=' Grupo com maior associação histórica: '+(S().groups[groups[0].group]?.name||'—')+'.';return {title,body};
}
async function render360(key){
  const host=document.getElementById('page-flow360');if(!host)return;
  if(key)currentPointKey=key;
  let p=currentPointKey?C().getPoint(currentPointKey):null;

  if(!p){
    host.innerHTML=
      '<div class="home-command">'+
        '<div class="home-kicker">PONTO 360º</div>'+
        '<h2>Abra tudo que importa sobre um ponto.</h2>'+
        '<p>Código, nome ou máquina. O PRISMA cruza cadastro, máquinas, chamados, grupos, ativos e histórico.</p>'+
        '<div class="home-omni"><input id="p360Query" autocomplete="off" placeholder="Ex.: 78670, Chronos Offices, urbanbarrafunda2_1…"><button id="p360Run" class="primary">Abrir 360º</button></div>'+
      '</div>';
    const run=async()=>{
      const q=document.getElementById('p360Query').value.trim();if(!q)return;
      const rows=await C().search(q,20,'all'),r=rows.find(x=>x.type==='point'||x.type==='machine');
      if(!r)return C().toast('Ponto não encontrado');
      const pp=r.type==='point'?r.entity:C().pointForMachine(r.entity);
      if(pp)render360(pp._key);
    };
    document.getElementById('p360Run').onclick=run;
    document.getElementById('p360Query').onkeydown=e=>{if(e.key==='Enter')run()};
    setTimeout(()=>document.getElementById('p360Query')?.focus(),20);
    return;
  }

  currentPointKey=p._key;
  const machines=C().machinesForPoint(p),
        refs=C().messagesForPoint(p).sort((a,b)=>Number(b.message[1]||0)-Number(a.message[1]||0)),
        groups=C().groupStatsForPoint(p),
        tickets=C().ticketsForPoint(p),
        assets=C().assetsForPoint(p),
        lvl=evidenceLevel(groups),
        rec=recommendation(p,refs,groups),
        fav=await isFav(p._key),
        topGroup=groups[0]?S().groups[groups[0].group]:null;

  host.innerHTML=
    '<div class="card"><div class="card-body"><div class="flow360-head">'+
      '<div><div class="actions" style="margin-bottom:6px"><span class="chip blue">PONTO '+esc(p.code||'—')+'</span><span class="chip">ID '+esc(p.id||'—')+'</span>'+(p.status?'<span class="chip">'+esc(p.status)+'</span>':'')+'</div>'+
      '<h2>'+esc(p.name)+'</h2><p class="muted">'+esc([p.address,p.neighborhood,p.city,p.square].filter(Boolean).join(' • '))+'</p></div>'+
      '<div class="actions">'+
        '<button id="p360CopyCode">Copiar código</button>'+
        '<button id="p360Map">⌖ Mapa PRISMA</button>'+
        '<a class="btn" target="_blank" rel="noopener" href="'+esc(C().operationsPointUrl(p))+'">Operações ↗</a>'+
        '<a class="btn" target="_blank" rel="noopener" href="'+esc(C().mapsUrl(p))+'">Google Maps ↗</a>'+
        '<button id="p360Fav">'+(fav?'★ Favorito':'☆ Favoritar')+'</button>'+
        '<button id="p360Msg" class="primary">Criar mensagem</button>'+
      '</div>'+
    '</div></div></div>'+

    '<div class="kpi-strip" style="margin-top:10px">'+
      '<div class="kpi-card"><b>'+fmt(machines.length)+'</b><span>Máquinas</span></div>'+
      '<div class="kpi-card"><b>'+fmt(tickets.length)+'</b><span>Chamados</span></div>'+
      '<div class="kpi-card"><b>'+fmt(groups.length)+'</b><span>Grupos</span></div>'+
      '<div class="kpi-card"><b>'+fmt(refs.length)+'</b><span>Mensagens</span></div>'+
      '<div class="kpi-card"><b>'+fmt(assets.length)+'</b><span>Ativos</span></div>'+
      '<div class="kpi-card"><b>'+esc(topGroup?.name||'—')+'</b><span>Grupo mais relacionado</span></div>'+
    '</div>'+

    '<div class="grid2" style="margin-top:12px">'+
      '<div class="card"><div class="card-head"><h3>Próxima ação sugerida</h3><span class="chip '+lvl[1]+'">'+lvl[0]+'</span></div><div class="card-body"><b>'+esc(rec.title)+'</b><p class="muted">'+esc(rec.body)+'</p><div class="actions"><button id="p360Task">Adicionar ao Meu Turno</button><button id="p360Groups">Ponto → Grupo</button><button id="p360Routes">Rotas do grupo</button></div></div></div>'+
      '<div class="card"><div class="card-head"><h3>Identificação rápida</h3><small>o essencial</small></div><div class="card-body field-grid">'+
        '<div class="field"><label>Código</label><div>'+esc(p.code||'—')+'</div></div>'+
        '<div class="field"><label>Praça</label><div>'+esc(p.square||'—')+'</div></div>'+
        '<div class="field"><label>Cidade</label><div>'+esc(p.city||'—')+'</div></div>'+
        '<div class="field"><label>CEP</label><div>'+esc(p.cep||'—')+'</div></div>'+
      '</div></div>'+
    '</div>'+

    '<div class="relation-grid" style="margin-top:12px">'+relMachines(machines)+relTickets(tickets)+relGroups(groups)+relAssets(assets)+'</div>'+
    '<div class="card" style="margin-top:12px"><div class="card-head"><h3>Histórico recente</h3><small>mensagem original • clique para abrir evidência</small></div><div class="card-body timeline">'+
      (refs.length?refs.slice(0,24).map(r=>'<button class="timeline-row" data-360-msg="'+r.index+'"><div class="meta">'+esc([r.message[2],r.message[3],r.group.name,Math.round(r.confidence*100)+'% vínculo'].filter(Boolean).join(' • '))+'</div><div>'+esc(r.message[6]||r.message[10]||'(sem texto)')+'</div></button>').join(''):'<div class="empty">Nenhuma mensagem vinculada.</div>')+
    '</div></div>';

  document.getElementById('p360CopyCode').onclick=async()=>{try{await navigator.clipboard.writeText(String(p.code||''));C().toast('Código copiado')}catch(e){}};
  document.getElementById('p360Map').onclick=()=>{PrismaApp.activate('map');setTimeout(()=>PrismaMap.renderSearchPoints([p]),40)};
  document.getElementById('p360Fav').onclick=()=>toggleFav(p);
  document.getElementById('p360Msg').onclick=()=>{PrismaApp.activate('messages');setTimeout(()=>PrismaMessages.prefill({pointKey:p._key,group:groups[0]?.group}),30)};
  document.getElementById('p360Task').onclick=()=>taskEditor(null,{title:'Acompanhar '+(p.code?p.code+' • ':'')+p.name,pointKey:p._key,status:'Fazer',priority:'Média',notes:'Criado pelo Ponto 360º.'});
  document.getElementById('p360Groups').onclick=()=>PrismaGroups.openPointGroups(p._key);
  document.getElementById('p360Routes').onclick=()=>{if(groups[0]){PrismaApp.activate('routes');setTimeout(()=>PrismaRoutes.selectGroup(groups[0].group),30)}else C().toast('Sem grupo relacionado para abrir rotas')};
  host.querySelectorAll('[data-360-msg]').forEach(b=>b.onclick=()=>PrismaApp.openMessage(Number(b.getAttribute('data-360-msg'))));
  bindRelations(host);
  DB().audit('ponto_360','Abriu 360º: '+(p.code||p.name),p._key,{}).catch(()=>{});
}

function mini(a,b){return '<div class="mini-stat"><b>'+fmt(b)+'</b><span>'+esc(a)+'</span></div>'}
function relMachines(ms){return '<div class="card"><div class="card-head"><h3>Máquinas</h3><small>'+fmt(ms.length)+'</small></div><div class="card-body">'+(ms.length?ms.slice(0,12).map(m=>'<button class="relation-row" data-rel-machine="'+esc(m._key)+'"><b>'+esc('['+m.id+'] '+m.name)+'</b><small>'+esc([m.os,m.ip].filter(Boolean).join(' • '))+'</small></button>').join(''):'<div class="empty">Nenhuma</div>')+'</div></div>'}
function relTickets(ts){return '<div class="card"><div class="card-head"><h3>Chamados</h3><small>'+fmt(ts.length)+'</small></div><div class="card-body">'+(ts.length?ts.slice(0,12).map(t=>'<div class="relation-row"><b>'+esc(t.id)+'</b><small>'+fmt((t.row[1]||[]).length)+' ocorrência(s)</small></div>').join(''):'<div class="empty">Nenhum</div>')+'</div></div>'}
function relGroups(gs){return '<div class="card"><div class="card-head"><h3>Grupos</h3><small>'+fmt(gs.length)+'</small></div><div class="card-body">'+(gs.length?gs.slice(0,12).map(s=>'<button class="relation-row" data-rel-group="'+s.group+'"><b>'+esc(S().groups[s.group]?.name||'')+'</b><small>'+fmt(s.count)+' evidência(s) • '+fmt(s.strong)+' forte(s)</small></button>').join(''):'<div class="empty">Nenhum</div>')+'</div></div>'}
function relAssets(as){return '<div class="card"><div class="card-head"><h3>Ativos</h3><small>'+fmt(as.length)+'</small></div><div class="card-body">'+(as.length?as.slice(0,12).map(a=>'<div class="relation-row"><b>'+esc(a.id)+'</b><small>'+fmt((a.row[1]||[]).length)+' ocorrência(s)</small></div>').join(''):'<div class="empty">Nenhum</div>')+'</div></div>'}
function bindRelations(host){host.querySelectorAll('[data-rel-machine]').forEach(b=>b.onclick=()=>PrismaApp.openMachine(b.dataset.relMachine));host.querySelectorAll('[data-rel-group]').forEach(b=>b.onclick=()=>PrismaGroups.openGroup(Number(b.dataset.relGroup)))}
async function renderRelations(){
  const host=document.getElementById('page-relations');if(!host)return;const p=currentPointKey?C().getPoint(currentPointKey):null;if(!p){host.innerHTML='<div class="hero"><h2>MAPA DE <b>RELAÇÕES</b></h2><p>Abra um Ponto 360º primeiro para navegar Ponto ⇄ Máquina ⇄ Chamado ⇄ Grupo ⇄ Mensagem ⇄ Ativo.</p><button id="relations360" class="primary">Escolher ponto</button></div>';document.getElementById('relations360').onclick=()=>PrismaApp.activate('flow360');return}
  host.innerHTML='<div class="hero"><h2>'+esc((p.code?p.code+' • ':'')+p.name)+'</h2><p>'+esc(p.address||'')+'</p><div class="actions"><button id="rel360" class="primary">Ponto 360º</button><button id="relPg">Ponto → Grupo</button></div></div><div class="relation-grid">'+relMachines(C().machinesForPoint(p))+relTickets(C().ticketsForPoint(p))+relGroups(C().groupStatsForPoint(p))+relAssets(C().assetsForPoint(p))+'</div>';document.getElementById('rel360').onclick=()=>PrismaApp.activate('flow360');document.getElementById('relPg').onclick=()=>PrismaGroups.openPointGroups(p._key);bindRelations(host);
}
async function renderHealth(){
  const host=document.getElementById('page-health');if(!host)return;const st=C().stats(),groups=S().groups||[],imports=await DB().all('imports'),corr=await DB().all('corrections'),a=S().WA?.audit||{},failed=groups.filter(g=>g.status==='FAILED').length,review=groups.filter(g=>g.status==='NEEDS_REVIEW').length,gaps=groups.filter(g=>g.status==='COMPLETE_WITH_MEDIA_GAPS').length,newbie=await DB().setting('newbie',false);
  host.innerHTML='<div class="hero"><h2>SAÚDE DAS <b>BASES</b></h2><p>Diagnóstico sem mascarar ausência de coleta. Falha/revisão não significa ausência de atividade.</p></div><div class="grid4">'+mini('Pontos',st.points)+mini('Máquinas',st.machines)+mini('Mensagens',st.messages)+mini('Coordenadas',st.withCoords)+mini('Grupos',st.groups)+mini('Imports V12',imports.length)+mini('Correções',corr.length)+mini('Ativos',st.assets)+'</div>'+
  '<div class="grid2" style="margin-top:12px"><div class="card"><div class="card-head"><h3>Cobertura WhatsApp</h3></div><div class="card-body">'+statusRow('Falhas de coleta',failed,'danger')+statusRow('Revisão necessária',review,'warn')+statusRow('Com gaps de mídia',gaps,'warn')+statusRow('IDs únicos',a.messageIdsUnique||st.messages,'ok')+statusRow('Mídias capturadas',a.capturedUniqueMediaReferenced||0,'blue')+'</div></div><div class="card"><div class="card-head"><h3>Fontes conectadas</h3></div><div class="card-body">'+Object.entries(S().loadMeta||{}).map(x=>'<div class="audit-row"><b>'+esc(x[0])+'</b><small>'+esc(String(x[1]??'—'))+'</small></div>').join('')+'<div class="source-row"><div><b>Modo Novo no NOC</b><small>Exibe dicas extras sem esconder recursos.</small></div><button id="newbieToggle">'+(newbie?'ON':'OFF')+'</button></div></div></div></div>';
  document.getElementById('newbieToggle').onclick=async()=>{const n=!(await DB().setting('newbie',false));await DB().setSetting('newbie',n);document.body.classList.toggle('newbie',n);renderHealth()};
}
function statusRow(a,b,c){return '<div class="source-row"><b>'+esc(a)+'</b><span class="chip '+c+'">'+fmt(b)+'</span></div>'}
async function renderBackup(){
  const host=document.getElementById('page-backup');if(!host)return;host.innerHTML='<div class="hero"><h2>BACKUP <b>PRISMA</b></h2><p>Exporta tarefas, favoritos, correções, importações, mapeamentos, modelos, destinos, contatos, histórico e configurações da V12. A base V11 original não entra porque continua sendo a fonte de leitura.</p></div><div class="card"><div class="card-body"><div class="actions"><button id="backupExport" class="primary">Exportar backup completo</button><button id="backupImport">Importar backup</button><input id="backupFile" type="file" accept=".json,application/json" hidden></div><p class="muted">Na importação você escolhe substituir ou mesclar os dados locais do PRISMA.</p></div></div>';
  document.getElementById('backupExport').onclick=exportBackup;document.getElementById('backupImport').onclick=()=>document.getElementById('backupFile').click();document.getElementById('backupFile').onchange=importBackup;
}
async function exportBackup(){const data=await DB().exportAll(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='PRISMA_FLOW_V13_BACKUP_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),700);await DB().audit('backup','Backup V12 exportado','',{})}
function importBackup(e){const f=e.target.files?.[0];if(!f)return;const rd=new FileReader();rd.onload=async()=>{try{const data=JSON.parse(rd.result),replace=confirm('OK = substituir dados locais V12.\nCancelar = mesclar.');await DB().importAll(data,replace);await C().refreshLocal();if(window.PrismaRoutes)PrismaRoutes.invalidate();if(window.PrismaRouter)PrismaRouter.invalidate();C().toast('Backup importado');renderBackup()}catch(err){alert('Backup inválido: '+(err.message||err))}};rd.readAsText(f)}
async function applySettings(){const newbie=await DB().setting('newbie',false);document.body.classList.toggle('newbie',!!newbie)}
window.PrismaFlow={renderToday,render360,renderRelations,renderHealth,renderBackup,taskEditor,openCapture,applySettings,get currentPointKey(){return currentPointKey},setCurrentPoint:k=>{currentPointKey=k}};
})();