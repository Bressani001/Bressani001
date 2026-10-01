(function(){
'use strict';

const K=()=>window.PrismaCore;
const PAGE_META={
 home:['Início','Visão geral do PRISMA FLOW V12 isolado.'],
 search:['Buscar','Procure ponto, máquina, grupo, chamado, ativo, mensagem ou dado importado.'],
 explore:['Explorar','Pontos, máquinas, WhatsApp, eventos, ativos e chamados em uma área única.'],
 today:['Meu Turno','Pendências, favoritos, captura rápida e atividade.'],
 flow360:['Ponto 360º','Tudo relacionado ao ponto em uma tela operacional.'],
 map:['Mapa','Navegue geograficamente pelos pontos com coordenadas.'],
 pointgroup:['Ponto → Grupo','Descubra os grupos mais associados a um ponto ou máquina.'],
 router:['Roteador NOC','Cole a ocorrência e receba uma rota explicada por evidências.'],
 routes:['Rotas WhatsApp','Veja de onde chega e para onde vai cada fluxo entre grupos.'],
 groups:['Grupos','Cobertura e histórico dos grupos do WhatsApp.'],
 messages:['Mensagens PRISMA','Modelos, contexto real, revisão e destinos.'],
 relations:['Relações','Ponto ⇄ Máquina ⇄ Chamado ⇄ Grupo ⇄ Mensagem ⇄ Ativo.'],
 imports:['Importar','Suba XLSX, CSV ou JSON mesmo fora do padrão antigo.'],
 corrections:['Correções','Revise e desfaça qualquer correção local da V12.'],
 health:['Saúde das bases','Cobertura, integridade e fontes carregadas.'],
 operations:['Operações','Atalhos seguros para ponto, máquina e chamado.'],
 local:['Dados locais','Senhas e notas operacionais preservadas localmente.'],
 backup:['Backup','Exportação e restauração dos dados locais da V12.'],
 sources:['Fontes','Base V11, WhatsApp, planilhas e preparação para Slack.']
};

function qs(s){return document.querySelector(s)}
function qsa(s){return Array.from(document.querySelectorAll(s))}
function activate(id){
  qsa('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  qsa('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+id));
  const meta=PAGE_META[id]||[id,''];
  qs('#pageTitle').textContent=meta[0];qs('#pageSub').textContent=meta[1];
  if(id==='home')renderHome();
  else if(id==='search')renderSearchPage();
  else if(id==='explore')PrismaExplore.renderPage();
  else if(id==='today')PrismaFlow.renderToday();
  else if(id==='flow360')PrismaFlow.render360();
  else if(id==='map')PrismaMap.renderPage();
  else if(id==='pointgroup')PrismaGroups.renderPointGroup();
  else if(id==='router')PrismaRouter.renderPage();
  else if(id==='routes')PrismaRoutes.renderPage();
  else if(id==='groups')PrismaGroups.renderGroups();
  else if(id==='messages')PrismaMessages.renderPage();
  else if(id==='relations')PrismaFlow.renderRelations();
  else if(id==='imports')renderImports();
  else if(id==='corrections')renderCorrections();
  else if(id==='health')PrismaFlow.renderHealth();
  else if(id==='operations')PrismaAccess.renderOperations();
  else if(id==='local')PrismaAccess.renderLocal();
  else if(id==='backup')PrismaFlow.renderBackup();
  else if(id==='sources')renderSources();
}
function status(){
  const el=qs('#baseStatus');
  if(K().S.connected){el.textContent='Base conectada • '+K().S.sourceFolderName;el.className='status-pill ok';}
  else{el.textContent='Base não conectada';el.className='status-pill warn';}
}
function stat(n,label){return '<div class="card stat"><b>'+K().fmt(n)+'</b><span>'+K().esc(label)+'</span></div>';}
function renderHome(){
  const s=K().stats(),host=qs('#page-home');
  host.innerHTML=
    '<div class="hero"><h2>PRISMA <b>FLOW V12</b></h2><p>Ambiente isolado. A pasta V11 é fonte somente de leitura; correções, tarefas, importações, modelos e preferências ficam no banco <b>prisma_flow_v12_test</b>.</p>'+
      '<div class="actions" style="margin-top:11px"><button id="homeConnect" class="primary">'+(K().S.connected?'Reconectar pasta':'Conectar pasta V11')+'</button><button data-home-go="search">Buscar</button><button data-home-go="today">Meu Turno</button><button data-home-go="map">Mapa</button><button data-home-go="router">Roteador NOC</button></div></div>'+
    '<div class="grid4">'+stat(s.points,'Pontos')+stat(s.machines,'Máquinas')+stat(s.messages,'Mensagens')+stat(s.withCoords,'Pontos com coordenadas')+'</div>'+
    '<div class="grid4" style="margin-top:12px">'+stat(s.groups,'Grupos WhatsApp')+stat(s.tickets,'Chamados')+stat(s.assets,'Ativos')+stat(s.imported,'Registros importados V12')+'</div>'+
    '<div class="grid2" style="margin-top:12px">'+
      '<div class="card"><div class="card-head"><h3>Fluxo operacional</h3><small>pesquisar → entender → agir → registrar</small></div><div class="card-body">'+
        '<div class="source-row"><div><b>Busca única</b><small>Ponto, máquina, grupo, chamado, ativo, mensagem e importado.</small></div><button data-home-go="search">Abrir</button></div>'+
        '<div class="source-row"><div><b>Ponto 360º</b><small>Relações, histórico, grupo, mapa, Operações e próxima ação.</small></div><button data-home-go="flow360">Abrir</button></div>'+
        '<div class="source-row"><div><b>Meu Turno</b><small>Fazer, Validar, Aguardando, Em andamento, Bloqueado e Concluído.</small></div><button data-home-go="today">Abrir</button></div>'+
        '<div class="source-row"><div><b>Roteamento</b><small>Roteador NOC + rotas direcionais entre grupos.</small></div><button data-home-go="router">Analisar</button></div>'+
      '</div></div>'+
      '<div class="card"><div class="card-head"><h3>Dados e segurança</h3><small>sem substituir arquivos</small></div><div class="card-body">'+
        '<div class="audit-row"><b>Pasta V11</b><small>'+(K().S.connected?K().esc(K().S.sourceFolderName)+' • conectada':'somente leitura quando conectada')+'</small></div>'+
        '<div class="audit-row"><b>Banco V12</b><small>IndexedDB separado: prisma_flow_v12_test.</small></div>'+
        '<div class="source-row"><div><b>Importador adaptativo</b><small>XLS/XLSX/CSV/JSON com mapeamento antes de gravar.</small></div><button data-home-go="imports">Importar</button></div>'+
        '<div class="source-row"><div><b>Correções reversíveis</b><small>Corrige a verdade operacional sem apagar o valor original.</small></div><button data-home-go="corrections">Ver</button></div>'+
      '</div></div>'+
    '</div>';
  qs('#homeConnect').onclick=()=>qs('#folderInput').click();
  host.querySelectorAll('[data-home-go]').forEach(b=>b.onclick=()=>activate(b.dataset.homeGo));
}
function resultCard(r){
  const e=K().esc;let actions='';
  if(r.type==='point'&&!r.imported)actions='<button class="primary" data-open-360="'+e(r.key)+'">360º</button><button data-open-point="'+e(r.key)+'">Detalhes</button>';
  else if(r.type==='machine'&&!r.imported)actions='<button data-open-machine="'+e(r.key)+'">Detalhes</button>';
  else if(r.type==='group')actions='<button data-open-group="'+e(r.entity.index)+'">Grupo</button><button data-route-group="'+e(r.entity.index)+'">Rotas</button>';
  else if(r.type==='message')actions='<button data-open-message="'+e(r.entity.index)+'">Evidência</button>';
  else if(r.type==='ticket')actions='<button data-open-ticket="'+e(r.entity.index)+'">Chamado</button>';
  else if(r.type==='asset')actions='<button data-open-asset="'+e(r.entity.index)+'">Ativo</button>';
  else if(r.imported)actions='<button data-open-import="'+e(r.entity.id)+'">Abrir importado</button>';
  const type={point:'Ponto',machine:'Máquina',group:'Grupo',message:'Mensagem',asset:'Ativo',ticket:'Chamado'}[r.type]||r.type;
  return '<div class="result"><div><strong>'+e(r.title)+'</strong><small>'+e(r.sub||'')+'</small><div class="meta"><span class="chip">'+e(type)+'</span>'+(r.imported?'<span class="chip orange">importado</span>':'')+'</div></div><div class="actions">'+actions+'</div></div>';
}
function groupResults(rows){
  const order=['point','machine','group','ticket','asset','message'];
  const labels={point:'Pontos',machine:'Máquinas',group:'Grupos',ticket:'Chamados',asset:'Ativos',message:'Mensagens'};
  let html='';
  for(const type of order){const list=rows.filter(r=>r.type===type);if(!list.length)continue;html+='<div class="card result-section"><div class="card-head"><h3>'+labels[type]+'</h3><small>'+K().fmt(list.length)+' resultado(s)</small></div><div class="result-list">'+list.map(resultCard).join('')+'</div></div>';}
  const other=rows.filter(r=>!order.includes(r.type));if(other.length)html+='<div class="card result-section"><div class="card-head"><h3>Outros importados</h3><small>'+other.length+'</small></div><div class="result-list">'+other.map(resultCard).join('')+'</div></div>';
  return html||'<div class="card empty">Nada encontrado.</div>';
}
function renderSearchPage(){
  const host=qs('#page-search');
  host.innerHTML='<div class="card search-shell"><div class="search-row"><input id="globalSearch" placeholder="Ex.: Urban Barra Funda, 119047, Chronos, chamado, grupo, offline…"><select id="searchType"><option value="all">Tudo</option><option value="point">Pontos</option><option value="machine">Máquinas</option><option value="group">Grupos</option><option value="ticket">Chamados</option><option value="asset">Ativos</option><option value="message">Mensagens</option></select><button id="doSearch" class="primary">Buscar</button></div><div class="actions" style="margin-top:8px"><span class="chip">Digite o que lembrar</span><span class="chip">sem sintaxe obrigatória</span><button id="searchMap" style="margin-left:auto">Ver pontos no mapa</button></div></div><div id="searchOutput">'+(!K().S.connected?'<div class="card empty">Conecte a pasta V11 para pesquisar a base atual. Importações V12 continuam pesquisáveis.</div>':'<div class="card empty">Digite qualquer pedaço da informação.</div>')+'</div>';
  const run=async()=>{const q=qs('#globalSearch').value.trim(),type=qs('#searchType').value;if(!q){qs('#searchOutput').innerHTML='<div class="card empty">Digite algo para pesquisar.</div>';return}qs('#searchOutput').innerHTML='<div class="card empty">Pesquisando…</div>';const rows=await K().search(q,160,type);qs('#searchOutput').innerHTML=groupResults(rows);bindResultActions(qs('#searchOutput'));};
  qs('#doSearch').onclick=run;qs('#globalSearch').onkeydown=e=>{if(e.key==='Enter')run();};qs('#searchMap').onclick=async()=>{const q=qs('#globalSearch').value.trim();activate('map');if(q){qs('#mapQuery').value=q;await PrismaMap.searchAndRender(q);}};setTimeout(()=>qs('#globalSearch')?.focus(),30);
}
function bindResultActions(host){
  host.querySelectorAll('[data-open-360]').forEach(b=>b.onclick=()=>{PrismaFlow.setCurrentPoint(b.dataset.open360);activate('flow360')});
  host.querySelectorAll('[data-open-point]').forEach(b=>b.onclick=()=>openPoint(b.dataset.openPoint));
  host.querySelectorAll('[data-open-machine]').forEach(b=>b.onclick=()=>openMachine(b.dataset.openMachine));
  host.querySelectorAll('[data-open-group]').forEach(b=>b.onclick=()=>PrismaGroups.openGroup(Number(b.dataset.openGroup)));
  host.querySelectorAll('[data-route-group]').forEach(b=>b.onclick=()=>{activate('routes');setTimeout(()=>PrismaRoutes.selectGroup(Number(b.dataset.routeGroup)),30)});
  host.querySelectorAll('[data-open-message]').forEach(b=>b.onclick=()=>openMessage(Number(b.dataset.openMessage)));
  host.querySelectorAll('[data-open-ticket]').forEach(b=>b.onclick=()=>openTicket(Number(b.dataset.openTicket)));
  host.querySelectorAll('[data-open-asset]').forEach(b=>b.onclick=()=>openAsset(Number(b.dataset.openAsset)));
  host.querySelectorAll('[data-open-import]').forEach(b=>b.onclick=()=>openImport(b.dataset.openImport));
}
function openDrawer(html){qs('#drawerBody').innerHTML=html;qs('#drawerBack').classList.remove('hidden')}
function closeDrawer(){qs('#drawerBack').classList.add('hidden')}
function showModal(html){qs('#modal').innerHTML=html;qs('#modalBack').classList.remove('hidden')}
function closeModal(){qs('#modalBack').classList.add('hidden')}
function field(label,value,editable){const v=value==null||value===''?'—':String(value);return '<div class="field"><label>'+K().esc(label)+'</label><div>'+K().esc(v)+(editable?' <button class="edit-field" data-field="'+K().esc(editable)+'" style="float:right;padding:3px 6px">✎</button>':'')+'</div></div>'}
function openPoint(key){
  const p=K().getPoint(key);if(!p){K().toast('Ponto não encontrado');return}
  const machines=K().machinesForPoint(p),groups=K().groupStatsForPoint(p),maps=K().mapsUrl(p);PrismaFlow.setCurrentPoint(p._key);
  openDrawer('<h2>'+K().esc((p.code?p.code+' • ':'')+(p.name||'Ponto'))+'</h2><div class="sub">'+K().esc([p.city,p.square,p.state].filter(Boolean).join(' • '))+'</div>'+
    '<div class="actions" style="margin-top:10px">'+(maps?'<a class="btn" target="_blank" rel="noopener" href="'+K().esc(maps)+'">Google Maps ↗</a>':'')+'<a class="btn" target="_blank" rel="noopener" href="'+K().esc(K().operationsPointUrl(p))+'">Operações ↗</a><button id="point360" class="primary">Ponto 360º</button><button id="pointGroups">Ponto → Grupo</button><button id="pointMessage">Mensagem</button><button id="pointOnMap">Mapa</button></div>'+
    '<div class="section-title">Cadastro efetivo V12</div><div class="field-grid">'+field('ID DB',p.id)+field('Código',p.code,'code')+field('Nome',p.name,'name')+field('Endereço',p.address,'address')+field('Bairro',p.neighborhood,'neighborhood')+field('Cidade',p.city,'city')+field('Estado',p.state,'state')+field('Praça',p.square,'square')+field('CEP',p.cep,'cep')+field('Latitude',p.lat,'lat')+field('Longitude',p.lng,'lng')+field('Área',p.area,'area')+field('Status',p.status,'status')+field('Ambiente',p.environment,'environment')+field('Tipo estabelecimento',p.establishment,'establishment')+'</div>'+
    '<div class="section-title">Relações</div><div class="card-body" style="padding:0"><div class="audit-row"><b>'+K().fmt(machines.length)+' máquina(s)</b><small>'+K().esc(machines.slice(0,10).map(m=>'['+m.id+'] '+m.name).join(' • ')||'Nenhuma relacionada')+'</small></div><div class="audit-row"><b>'+K().fmt(groups.length)+' grupo(s)</b><small>'+K().esc(groups.slice(0,5).map(g=>K().S.groups[g.group]?.name||'').join(' • ')||'Nenhum sustentado')+'</small></div>'+(p._overlayImportName?'<div class="audit-row"><b>Overlay ativo</b><small>'+K().esc(p._overlayImportName)+'</small></div>':'')+'</div>');
  qs('#drawerBody').querySelectorAll('.edit-field').forEach(b=>b.onclick=()=>correctionModal('point',p._key,b.dataset.field,p[b.dataset.field]));
  qs('#pointOnMap').onclick=()=>{closeDrawer();activate('map');setTimeout(()=>PrismaMap.render([p],true),80)};
  qs('#point360').onclick=()=>{closeDrawer();activate('flow360')};
  qs('#pointGroups').onclick=()=>{closeDrawer();PrismaGroups.openPointGroups(p._key)};
  qs('#pointMessage').onclick=()=>{closeDrawer();activate('messages');setTimeout(()=>PrismaMessages.prefill({pointKey:p._key,group:groups[0]?.group}),30)};
  PrismaDB.audit('abrir_ponto','Abriu ponto '+(p.code||p.name),p._key,{}).catch(()=>{});
}
function openMachine(key){
  const m=K().getMachine(key);if(!m){K().toast('Máquina não encontrada');return}
  const p=K().pointForMachine(m),groups=K().groupStatsForMachine(m);
  openDrawer('<h2>'+K().esc('['+(m.id||'')+'] '+(m.name||'Máquina'))+'</h2><div class="sub">'+K().esc([m.pointCode,m.pointName,m.square].filter(Boolean).join(' • '))+'</div>'+
    '<div class="actions" style="margin-top:10px">'+(p?'<button id="machinePoint" class="primary">Abrir ponto '+K().esc(p.code)+'</button>':'')+'<a class="btn" target="_blank" rel="noopener" href="'+K().esc(K().operationsMachineUrl(m))+'">Operações ↗</a><button id="machineMessage">Mensagem</button></div>'+
    '<div class="section-title">Cadastro efetivo V12</div><div class="field-grid">'+field('ID Máquina',m.id,'id')+field('Nome',m.name,'name')+field('Código ponto',m.pointCode,'pointCode')+field('Ponto',m.pointName,'pointName')+field('Endereço',m.address,'address')+field('Praça',m.square,'square')+field('Sistema',m.os,'os')+field('IP',m.ip,'ip')+field('Provedor',m.provider,'provider')+field('Localização',m.location,'location')+field('Modelo',m.model,'model')+field('Último reboot',m.lastReboot,'lastReboot')+'</div>');
  qs('#drawerBody').querySelectorAll('.edit-field').forEach(b=>b.onclick=()=>correctionModal('machine',m._key,b.dataset.field,m[b.dataset.field]));
  if(p)qs('#machinePoint').onclick=()=>openPoint(p._key);
  qs('#machineMessage').onclick=()=>{closeDrawer();activate('messages');setTimeout(()=>PrismaMessages.prefill({machineKey:m._key,pointKey:p?._key,group:groups[0]?.group}),30)};
  PrismaDB.audit('abrir_maquina','Abriu máquina '+m.id,m._key,{}).catch(()=>{});
}
function openMessage(i){
  const m=K().S.messages[i]||[],g=K().S.groups[m[4]]||{},pts=m[17]||[],macs=m[18]||[];
  openDrawer('<h2>'+K().esc(g.name||'Mensagem')+'</h2><div class="sub">'+K().esc([m[2],m[3],m[5]].filter(Boolean).join(' • '))+'</div><div class="section-title">Mensagem original</div><div class="audit-row"><div style="white-space:pre-wrap">'+K().esc(m[6]||m[10]||'(sem texto)')+'</div></div>'+
    (m[8]?'<div class="section-title">Mensagem citada</div><div class="audit-row"><b>'+K().esc(m[9]||'')+'</b><small style="white-space:pre-wrap">'+K().esc(m[10]||'')+'</small></div>':'')+
    '<div class="section-title">Vínculos operacionais</div><div class="card-body" style="padding:0">'+pts.slice(0,8).map(x=>{const p=K().S.points[Number(x[0])];return p?'<button class="relation-row" data-msg-point="'+K().esc(p._key)+'"><b>Ponto '+K().esc(p.code)+' • '+K().esc(p.name)+'</b><small>'+Math.round(Number(x[1]||0)*100)+'% confiança</small></button>':''}).join('')+macs.slice(0,8).map(x=>{const mm=K().S.machines[Number(x[0])];return mm?'<button class="relation-row" data-msg-machine="'+K().esc(mm._key)+'"><b>Máquina '+K().esc(mm.id)+' • '+K().esc(mm.name)+'</b><small>'+Math.round(Number(x[1]||0)*100)+'% confiança</small></button>':''}).join('')+'</div><div class="audit-row"><b>Preservada</b><small>Mensagem de fonte nunca é editada pela V12.</small></div>');
  qs('#drawerBody').querySelectorAll('[data-msg-point]').forEach(b=>b.onclick=()=>openPoint(b.dataset.msgPoint));qs('#drawerBody').querySelectorAll('[data-msg-machine]').forEach(b=>b.onclick=()=>openMachine(b.dataset.msgMachine));
}
async function openTicket(i){
  const r=K().S.tickets[i]||[],id=String(r[0]||''),maps=await PrismaDB.all('ticketMap'),tm=maps.find(x=>x.ticket===id),url=tm?'https://operacoes.eletromidia.com.br/tickets/'+encodeURIComponent(tm.internalId)+'/edit':'';
  const pts=(r[2]||[]).map(x=>K().S.points[Number(x[0])]).filter(Boolean),msgs=(r[1]||[]).map(x=>Number(Array.isArray(x)?x[0]:x)).filter(Number.isInteger);
  openDrawer('<h2>Chamado '+K().esc(id)+'</h2><div class="actions" style="margin-top:10px">'+(url?'<a class="btn primary" href="'+K().esc(url)+'" target="_blank" rel="noopener">Operações ↗</a>':'<button id="ticketCopy">Copiar número ELT</button>')+'<button id="ticketMessage">Mensagem</button></div><div class="section-title">Pontos relacionados</div>'+(pts.length?pts.map(p=>'<button class="relation-row" data-ticket-point="'+K().esc(p._key)+'"><b>'+K().esc(p.code+' • '+p.name)+'</b><small>'+K().esc(p.square||'')+'</small></button>').join(''):'<div class="empty">Nenhum ponto relacionado.</div>')+'<div class="section-title">Ocorrências</div><div class="timeline">'+msgs.slice(0,30).map(mi=>{const m=K().S.messages[mi]||[],g=K().S.groups[m[4]]||{};return '<button class="timeline-row" data-ticket-msg="'+mi+'"><div class="meta">'+K().esc([m[2],m[3],g.name].filter(Boolean).join(' • '))+'</div><div>'+K().esc(m[6]||m[10]||'')+'</div></button>'}).join('')+'</div>');
  if(!url&&qs('#ticketCopy'))qs('#ticketCopy').onclick=async()=>{try{await navigator.clipboard?.writeText(id);K().toast('Chamado copiado')}catch(e){}window.open('https://operacoes.eletromidia.com.br/tickets','_blank','noopener,noreferrer')};qs('#ticketMessage').onclick=()=>{closeDrawer();activate('messages');setTimeout(()=>PrismaMessages.prefill({ticket:id,pointKey:pts[0]?._key}),30)};qs('#drawerBody').querySelectorAll('[data-ticket-point]').forEach(b=>b.onclick=()=>openPoint(b.dataset.ticketPoint));qs('#drawerBody').querySelectorAll('[data-ticket-msg]').forEach(b=>b.onclick=()=>openMessage(Number(b.dataset.ticketMsg)));
}
function openAsset(i){
  const r=K().S.assets[i]||[],id=String(r[0]||''),pts=(r[2]||[]).map(x=>K().S.points[Number(x[0])]).filter(Boolean),macs=(r[3]||[]).map(x=>K().S.machines[Number(x[0])]).filter(Boolean),msgs=(r[1]||[]).map(x=>Number(Array.isArray(x)?x[0]:x)).filter(Number.isInteger);
  openDrawer('<h2>Ativo '+K().esc(id)+'</h2><div class="section-title">Pontos relacionados</div>'+(pts.length?pts.map(p=>'<button class="relation-row" data-asset-point="'+K().esc(p._key)+'"><b>'+K().esc(p.code+' • '+p.name)+'</b></button>').join(''):'<div class="empty">Nenhum</div>')+'<div class="section-title">Máquinas relacionadas</div>'+(macs.length?macs.map(m=>'<button class="relation-row" data-asset-machine="'+K().esc(m._key)+'"><b>'+K().esc(m.id+' • '+m.name)+'</b></button>').join(''):'<div class="empty">Nenhuma</div>')+'<div class="section-title">Ocorrências</div><div class="timeline">'+msgs.slice(0,30).map(mi=>{const m=K().S.messages[mi]||[],g=K().S.groups[m[4]]||{};return '<button class="timeline-row" data-asset-msg="'+mi+'"><div class="meta">'+K().esc([m[2],m[3],g.name].filter(Boolean).join(' • '))+'</div><div>'+K().esc(m[6]||m[10]||'')+'</div></button>'}).join('')+'</div>');
  qs('#drawerBody').querySelectorAll('[data-asset-point]').forEach(b=>b.onclick=()=>openPoint(b.dataset.assetPoint));qs('#drawerBody').querySelectorAll('[data-asset-machine]').forEach(b=>b.onclick=()=>openMachine(b.dataset.assetMachine));qs('#drawerBody').querySelectorAll('[data-asset-msg]').forEach(b=>b.onclick=()=>openMessage(Number(b.dataset.assetMsg)));
}
async function openImport(id){
  const r=await PrismaDB.get('importRecords',id);if(!r){K().toast('Registro importado não encontrado');return}const d=r.data||{};
  openDrawer('<h2>'+K().esc(r.label||r.entityKey)+'</h2><div class="sub">Importado • '+K().esc(r.importName||r.importId)+'</div><div class="section-title">Dados normalizados</div><div class="field-grid">'+Object.keys(d).map(k=>field(k,d[k])).join('')+'</div><div class="section-title">Linha original</div><div class="audit-row"><pre style="white-space:pre-wrap;font-size:10px">'+K().esc(JSON.stringify(r.raw||{},null,2))+'</pre></div>');
}
function correctionModal(type,key,fieldName,current){
  showModal('<h3 style="margin-top:0">Corrigir informação</h3><p class="muted">A base original não será alterada. A correção vale somente na V12 e pode ser desfeita.</p><div class="field"><label>Campo</label><div>'+K().esc(fieldName)+'</div></div><label style="display:block;margin-top:10px">Valor atual<input disabled value="'+K().esc(current==null?'':current)+'"></label><label style="display:block;margin-top:10px">Novo valor<input id="corrNew" value="'+K().esc(current==null?'':current)+'"></label><label style="display:block;margin-top:10px">Motivo<textarea id="corrReason" placeholder="Ex.: cadastro incorreto / validado no local"></textarea></label><div class="actions" style="margin-top:12px"><button id="corrCancel">Cancelar</button><button id="corrSave" class="primary">Salvar correção</button></div>');
  qs('#corrCancel').onclick=closeModal;qs('#corrSave').onclick=async()=>{let value=qs('#corrNew').value;if(fieldName==='lat'||fieldName==='lng')value=K().num(value);await K().saveCorrection(type,key,fieldName,value,qs('#corrReason').value);closeModal();K().toast('Correção salva');if(type==='point')openPoint(key);else openMachine(key);};
}
async function renderCorrections(){
  const host=qs('#page-corrections'),rows=await PrismaDB.all('corrections');rows.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  host.innerHTML='<div class="hero"><h2>CORREÇÕES <b>REVERSÍVEIS</b></h2><p>O valor da fonte é preservado. A V12 aplica sua correção por cima e registra motivo/data.</p></div>'+(rows.length?'<div class="card"><div class="card-head"><h3>'+rows.length+' correção(ões)</h3><small>desfazer volta à base/overlay anterior</small></div><div class="card-body">'+rows.map(r=>'<div class="audit-row"><div class="actions" style="justify-content:space-between"><div><b>'+K().esc(r.entityType+' '+r.entityKey+' • '+r.field)+'</b><small>Anterior: '+K().esc(r.oldValue)+' → Atual: '+K().esc(r.newValue)+'<br>'+K().esc(r.reason||'sem motivo')+' • '+K().esc(r.updatedAt||'')+'</small></div><button class="danger" data-remove-corr="'+K().esc(r.id)+'">Desfazer</button></div></div>').join('')+'</div></div>':'<div class="card empty">Nenhuma correção local.</div>');
  host.querySelectorAll('[data-remove-corr]').forEach(b=>b.onclick=async()=>{if(confirm('Desfazer esta correção?')){await K().removeCorrection(b.dataset.removeCorr);K().toast('Correção removida');renderCorrections();renderHome();}});
}
async function renderImports(){
  const host=qs('#page-imports'),rows=await PrismaDB.all('imports');rows.sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt)));
  host.innerHTML='<div class="hero"><h2>IMPORTADOR <b>ADAPTATIVO</b></h2><p>Arraste a planilha como veio. A V12 tenta reconhecer o significado das colunas e mostra o mapeamento antes de gravar. Suporta XLSX/XLS/CSV/JSON.</p></div><div class="card"><div class="card-body"><div class="import-drop"><h3 style="margin:0 0 6px">Subir informações</h3><p class="muted">Você não precisa renomear colunas antes.</p><button id="chooseSmartImport" class="primary">Escolher planilha/arquivo</button><input id="smartImportFile" type="file" accept=".xlsx,.xls,.csv,.txt,.json" hidden></div><div id="importPreview"></div></div></div><div class="card result-section"><div class="card-head"><h3>Importações V12</h3><small>'+rows.length+'</small></div><div class="card-body">'+(rows.length?rows.map(r=>'<div class="source-row"><div><b>'+K().esc(r.name)+'</b><small>'+K().esc(r.kind)+' • '+K().fmt(r.rows)+' registros • '+K().esc(r.importedAt)+'</small></div><button class="danger" data-delete-import="'+K().esc(r.id)+'">Excluir</button></div>').join(''):'<div class="empty">Nenhuma importação ainda.</div>')+'</div></div>';
  qs('#chooseSmartImport').onclick=()=>qs('#smartImportFile').click();PrismaImporter.init();host.querySelectorAll('[data-delete-import]').forEach(b=>b.onclick=async()=>{if(confirm('Excluir esta importação V12? A pasta V11 não será afetada.')){await PrismaDB.removeImport(b.dataset.deleteImport);await K().refreshLocal();K().toast('Importação removida');renderImports();renderHome();}});
}
async function renderSources(){
  const host=qs('#page-sources');
  host.innerHTML='<div class="hero"><h2>FONTES DO <b>PRISMA</b></h2><p>Todas as fontes convergem para as mesmas entidades. WhatsApp é preservado; Slack será normalizado como canal/thread/mensagem quando você subir a base.</p></div><div class="card"><div class="card-body">'+
  '<div class="source-row"><div><b>Base PRISMA V11</b><small>'+(K().S.connected?K().esc(K().S.sourceFolderName)+' • conectada nesta sessão':'não conectada nesta sessão')+'</small></div><button id="sourceConnect">'+(K().S.connected?'Reconectar':'Conectar')+'</button></div>'+
  '<div class="source-row"><div><b>WhatsApp</b><small>'+(K().S.connected?K().fmt(K().S.messages.length)+' mensagens • '+K().fmt(K().S.groups.length)+' grupos':'vem junto com a pasta V11')+'</small></div><span class="chip '+(K().S.connected?'ok':'warn')+'">'+(K().S.connected?'ATIVO':'AGUARDANDO')+'</span></div>'+
  '<div class="source-row"><div><b>Roteador histórico</b><small>'+(K().S.routerData?'router.js carregado com perfis/regras/associações':'router.js ainda não carregado')+'</small></div><span class="chip '+(K().S.routerData?'ok':'warn')+'">'+(K().S.routerData?'ATIVO':'AGUARDANDO')+'</span></div>'+
  '<div class="source-row"><div><b>Slack</b><small>Estrutura reservada para canal, thread, mensagem, autor, anexos e vínculo com ponto/máquina/chamado.</small></div><span class="chip blue">PRÓXIMA FONTE</span></div>'+
  '<div class="source-row"><div><b>Planilhas / CSV / JSON</b><small>Entram como overlays locais e podem atualizar a verdade operacional sem apagar a origem.</small></div><button data-go-import>Importar</button></div></div></div>';
  qs('#sourceConnect').onclick=()=>qs('#folderInput').click();qs('[data-go-import]').onclick=()=>activate('imports');
}
async function connect(files){
  try{qs('#connectBtn').disabled=true;qs('#connectBtn').textContent='Conectando…';await K().connectFolder(files);if(window.PrismaRoutes)PrismaRoutes.invalidate();if(window.PrismaRouter)PrismaRouter.invalidate();status();renderHome();K().toast('Base conectada com sucesso');}
  catch(e){console.error(e);K().toast(e.message||e);qs('#bootError').textContent='Falha ao conectar a pasta: '+(e.message||e);qs('#bootError').classList.remove('hidden');setTimeout(()=>qs('#bootError').classList.add('hidden'),7000);}
  finally{qs('#connectBtn').disabled=false;qs('#connectBtn').textContent='Conectar pasta V11';qs('#folderInput').value='';}
}
async function boot(){
  try{
    await PrismaDB.open();await PrismaLegacy.migrate();await K().refreshLocal();await PrismaMessages.ensureDefaults();await PrismaFlow.applySettings();
    qsa('.nav').forEach(b=>b.onclick=()=>activate(b.dataset.page));qs('#connectBtn').onclick=()=>qs('#folderInput').click();qs('#folderInput').onchange=e=>connect(e.target.files);qs('#drawerClose').onclick=closeDrawer;qs('#drawerBack').onclick=e=>{if(e.target===qs('#drawerBack'))closeDrawer()};qs('#modalBack').onclick=e=>{if(e.target===qs('#modalBack'))closeModal()};
    document.addEventListener('keydown',e=>{const tag=(document.activeElement?.tagName||'').toLowerCase();if(e.key==='Escape'){closeDrawer();closeModal()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();activate('search');setTimeout(()=>qs('#globalSearch')?.focus(),20)}else if(e.key==='/'&&!/input|textarea|select/.test(tag)){e.preventDefault();activate('search');setTimeout(()=>qs('#globalSearch')?.focus(),20)}});
    status();renderHome();
  }catch(e){console.error(e);qs('#bootError').textContent='Falha ao iniciar a V12: '+(e.message||e);qs('#bootError').classList.remove('hidden');}
}

window.PrismaApp={activate,renderHome,renderImports,renderCorrections,renderSources,openDrawer,closeDrawer,showModal,closeModal,openPoint,openMachine,openMessage,openTicket,openAsset,openImport};
boot();
})();