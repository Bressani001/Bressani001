(function(){
'use strict';
function start(){
 var V=window.PRISMA_V11;if(!V||V.flowInstalled)return;V.flowInstalled=true;
 var esc=V.esc,norm=V.norm,fmt=V.fmt,dt=V.dt,help=V.help,DB=window.PRISMA_DB;
 var STATUS=['Fazer','Validar','Aguardando','Em andamento','Bloqueado','Concluído'];
 var STATUS_CLASS={'Fazer':'bad','Validar':'warn','Aguardando':'warn','Em andamento':'blue','Bloqueado':'bad','Concluído':'ok'};

 function modal(html){var b=document.getElementById('flowModalBack'),m=document.getElementById('flowModal');m.innerHTML=html;b.classList.add('open')}
 function closeModal(){var b=document.getElementById('flowModalBack');if(b)b.classList.remove('open')}
 document.getElementById('flowModalBack').addEventListener('click',function(e){if(e.target===this)closeModal()});

 async function allTasks(){var x=await DB.all('tasks');return x.sort(function(a,b){return String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt))})}
 async function allActivity(limit){var x=await DB.all('activity');x.sort(function(a,b){return String(b.at).localeCompare(String(a.at))});return x.slice(0,limit||40)}
 async function allFav(){return DB.all('favorites')}
 function taskLabel(t){return t.title||t.summary||'Tarefa'}
 function taskEntity(t){return [t.pointCode?('Ponto '+t.pointCode):'',t.machineId?('Máquina '+t.machineId):'',t.ticket?('Chamado '+t.ticket):''].filter(Boolean).join(' • ')}
 function statusChip(s){return '<span class="flow-chip '+(STATUS_CLASS[s]||'')+'">'+esc(s||'Fazer')+'</span>'}
 function priorityChip(p){var c=p==='Alta'?'bad':p==='Média'?'warn':'blue';return '<span class="flow-chip '+c+'">'+esc(p||'Média')+'</span>'}

 async function renderToday(filter){
  var sec=document.getElementById('flowToday'),tasks=await allTasks(),acts=await allActivity(8),favs=await allFav(),status=filter||V.turnFilter||'';
  V.turnFilter=status;
  var counts={};STATUS.forEach(function(s){counts[s]=tasks.filter(function(t){return t.status===s}).length});
  var visible=status?tasks.filter(function(t){return t.status===status}):tasks.filter(function(t){return t.status!=='Concluído'});
  var last=acts[0];
  sec.innerHTML=
   '<div class="flow-hero"><h3>MEU TURNO • <b>FLOW</b></h3><p>Pesquisar → entender → agir → registrar. O PRISMA guarda o que você está tratando sem misturar suas pendências com a evidência corporativa.</p>'+
   '<div class="flow-command"><input id="flowTurnSearch" placeholder="Ponto, máquina, chamado, grupo, mensagem ou tarefa…"><span>Ctrl+K</span></div>'+
   '<div class="actions" style="margin-top:9px"><button class="primary" id="flowQuickCapture">+ Captura rápida</button><button id="flowNewTask">+ Nova tarefa</button><button id="flowOpenPalette">Busca universal</button></div></div>'+
   '<div data-newbie-only class="flow-tip" style="margin-top:9px"><b>Modo Novo no NOC:</b> use a busca acima mesmo sem saber se o número é ponto, máquina ou chamado. O PRISMA identifica o tipo e oferece a próxima ação.</div>'+
   (last?'<div class="card section"><div class="shead"><h3>Onde eu parei?</h3><span>'+esc(dt(last.at))+'</span></div><div class="body"><div class="flow-row"><div><strong>'+esc(last.label)+'</strong><small>'+esc(last.type||'ação')+'</small></div><div class="actions">'+activityAction(last)+'</div></div></div></div>':'')+
   '<div class="card section"><div class="shead"><h3>Minha fila</h3><span>dados locais • com histórico</span></div><div class="body"><div class="flow-statusgrid">'+STATUS.map(function(s){return '<div class="flow-status '+(status===s?'active':'')+'" data-flow-status="'+esc(s)+'"><b>'+fmt(counts[s])+'</b><span>'+esc(s)+'</span></div>'}).join('')+'</div><div id="flowTaskList" class="flow-list" style="margin-top:10px">'+taskRows(visible)+'</div></div></div>'+
   '<div class="flow-grid2"><div class="card section"><div class="shead"><h3>Favoritos</h3><span>'+fmt(favs.length)+'</span></div><div class="body">'+favRows(favs)+'</div></div><div class="card section"><div class="shead"><h3>Atividade recente</h3><span>automática</span></div><div class="body">'+activityRows(acts)+'</div></div></div>';
  document.getElementById('flowTurnSearch').onfocus=function(){V.openPalette(this.value)};
  document.getElementById('flowOpenPalette').onclick=function(){V.openPalette('')};
  document.getElementById('flowQuickCapture').onclick=openCapture;
  document.getElementById('flowNewTask').onclick=function(){openTaskEditor(null)};
 }
 function taskRows(tasks){
  if(!tasks.length)return '<div class="empty">Nenhuma tarefa neste estado.</div>';
  return tasks.map(function(t){return '<div class="flow-row"><div><strong>'+esc(taskLabel(t))+'</strong><small>'+esc(taskEntity(t)||t.notes||'Sem entidade vinculada')+' • alterado '+esc(dt(t.updatedAt||t.createdAt))+'</small><div style="margin-top:5px">'+statusChip(t.status)+' '+priorityChip(t.priority)+'</div></div><div class="actions"><button data-flow-task-open="'+esc(t.id)+'">Abrir</button><button data-flow-task-next="'+esc(t.id)+'">Avançar</button></div></div>'}).join('');
 }
 function favRows(favs){
  if(!favs.length)return '<div class="empty">Favoritos aparecem aqui. Fixe os pontos que você acompanha com frequência.</div>';
  return '<div class="flow-list">'+favs.slice(0,12).map(function(f){return '<div class="flow-row"><div><strong>'+esc(f.label||f.key)+'</strong><small>'+esc(f.kind||'favorito')+' • '+esc(dt(f.updatedAt||f.createdAt))+'</small></div><div class="actions">'+(f.kind==='point'?'<button data-flow-360="'+Number(f.index)+'">360º</button>':'')+'<button data-flow-unfav="'+esc(f.id)+'">Remover</button></div></div>'}).join('')+'</div>';
 }
 function activityRows(acts){
  if(!acts.length)return '<div class="empty">As ações feitas pelo PRISMA aparecerão aqui.</div>';
  return '<div class="flow-list">'+acts.map(function(a){return '<div class="flow-row"><div><strong>'+esc(a.label)+'</strong><small>'+esc(a.type)+' • '+esc(dt(a.at))+'</small></div><div class="actions">'+activityAction(a)+'</div></div>'}).join('')+'</div>';
 }
 function activityAction(a){
  var m=a.meta||{};if(Number.isInteger(m.point))return '<button data-flow-360="'+m.point+'">Continuar</button>';
  if(Number.isInteger(m.machine))return '<button data-flow-open-machine="'+m.machine+'">Abrir</button>';
  if(Number.isInteger(m.ticket))return '<button data-flow-open-ticket="'+m.ticket+'">Abrir</button>';
  if(Number.isInteger(m.group))return '<button data-flow-open-group="'+m.group+'">Abrir</button>';
  return '';
 }
 async function openTaskEditor(id,prefill){
  var t=id?await DB.get('tasks',id):null;t=t||Object.assign({id:DB.uid('task'),title:'',status:'Fazer',priority:'Média',notes:'',pointIndex:null,pointCode:'',machineId:'',ticket:'',dueAt:'',createdAt:new Date().toISOString()},prefill||{});
  modal('<h3>'+(id?'Editar tarefa':'Nova tarefa')+'</h3><div class="flow-formgrid"><div class="full"><label>Título</label><input id="flowTaskTitle" value="'+esc(t.title||'')+'"></div><div><label>Status</label><select id="flowTaskStatus">'+STATUS.map(function(s){return '<option '+(t.status===s?'selected':'')+'>'+esc(s)+'</option>'}).join('')+'</select></div><div><label>Prioridade</label><select id="flowTaskPriority"><option '+(t.priority==='Baixa'?'selected':'')+'>Baixa</option><option '+(t.priority==='Média'?'selected':'')+'>Média</option><option '+(t.priority==='Alta'?'selected':'')+'>Alta</option></select></div><div><label>Código do ponto</label><input id="flowTaskPoint" value="'+esc(t.pointCode||'')+'"></div><div><label>ID máquina</label><input id="flowTaskMachine" value="'+esc(t.machineId||'')+'"></div><div><label>Chamado</label><input id="flowTaskTicket" value="'+esc(t.ticket||'')+'"></div><div><label>Prazo</label><input id="flowTaskDue" type="datetime-local" value="'+esc(t.dueAt||'')+'"></div><div class="full"><label>Notas</label><textarea id="flowTaskNotes">'+esc(t.notes||'')+'</textarea></div></div><div class="actions" style="margin-top:10px"><button data-flow-modal-close>Cancelar</button><button class="primary" id="flowTaskSave">Salvar</button>'+(id?'<button id="flowTaskDelete">Excluir</button>':'')+'</div>');
  document.getElementById('flowTaskSave').onclick=async function(){
   t.title=document.getElementById('flowTaskTitle').value.trim()||'Tarefa sem título';t.status=document.getElementById('flowTaskStatus').value;t.priority=document.getElementById('flowTaskPriority').value;t.pointCode=document.getElementById('flowTaskPoint').value.trim();t.machineId=document.getElementById('flowTaskMachine').value.trim();t.ticket=document.getElementById('flowTaskTicket').value.trim();t.dueAt=document.getElementById('flowTaskDue').value;t.notes=document.getElementById('flowTaskNotes').value.trim();t.updatedAt=new Date().toISOString();if(t.status==='Concluído'&&!t.completedAt)t.completedAt=t.updatedAt;await DB.put('tasks',t);await V.log('tarefa',id?'Tarefa atualizada: '+t.title:'Tarefa criada: '+t.title,{task:t.id,point:t.pointIndex});closeModal();renderToday(V.turnFilter);V.toast('Tarefa salva');
  };
  if(id)document.getElementById('flowTaskDelete').onclick=async function(){if(!confirm('Excluir esta tarefa?'))return;await DB.delete('tasks',t.id);V.log('tarefa','Tarefa excluída: '+t.title,{task:t.id});closeModal();renderToday(V.turnFilter)};
 }
 async function advanceTask(id){
  var t=await DB.get('tasks',id);if(!t)return;var i=STATUS.indexOf(t.status);t.status=STATUS[Math.min(STATUS.length-1,i+1)];t.updatedAt=new Date().toISOString();if(t.status==='Concluído')t.completedAt=t.updatedAt;await DB.put('tasks',t);V.log('tarefa','Tarefa avançou para '+t.status+': '+t.title,{task:t.id,point:t.pointIndex});renderToday(V.turnFilter)
 }
 function openCapture(){
  modal('<h3>Captura rápida • sem IA inventando contexto</h3><p class="flow-tip">Cole a anotação como ela veio. O texto original é preservado. O PRISMA apenas procura entidades reais na base e você confirma antes de salvar.</p><textarea id="flowCaptureText" style="width:100%;min-height:150px;margin-top:9px" placeholder="Ex.: Chronos 14122 validar ativos amanhã"></textarea><div class="actions" style="margin-top:9px"><button data-flow-modal-close>Cancelar</button><button class="primary" id="flowCaptureAnalyze">ORGANIZAR</button></div><div id="flowCaptureResult"></div>');
  document.getElementById('flowCaptureAnalyze').onclick=async function(){
   var raw=document.getElementById('flowCaptureText').value.trim();if(!raw){V.toast('Escreva a anotação primeiro');return}
   var res=await V.search(raw,8),best=res.find(function(r){return ['point','machine','ticket'].indexOf(r.t)>=0});
   var box=document.getElementById('flowCaptureResult'),entity=best?(best.primary+' '+best.secondary):'Nenhuma entidade identificada com segurança';
   box.innerHTML='<div class="flow-actioncard" style="margin-top:10px"><h4>Interpretação local</h4><p><b>Texto original:</b> '+esc(raw)+'</p><p style="margin-top:5px"><b>Entidade encontrada:</b> '+esc(entity)+'</p><div class="actions" style="margin-top:8px"><button class="primary" id="flowCaptureSave">Salvar como tarefa</button>'+(best&&best.t==='point'?'<button data-flow-360="'+best.i+'">Abrir 360º</button>':'')+'</div></div>';
   document.getElementById('flowCaptureSave').onclick=function(){
    var pre={title:raw.split(/\r?\n/)[0].slice(0,120),notes:'Texto original:\n'+raw,status:'Validar',priority:'Média'};
    if(best&&best.t==='point'){pre.pointIndex=best.i;pre.pointCode=V.pointCode(best.i)}
    if(best&&best.t==='machine'){pre.machineId=String((M[best.i]||[])[0]||'');var pi=V.machinePoint(best.i);if(Number.isInteger(pi)){pre.pointIndex=pi;pre.pointCode=V.pointCode(pi)}}
    if(best&&best.t==='ticket')pre.ticket=String((WA.tickets[best.i]||[])[0]||'');
    closeModal();openTaskEditor(null,pre);
   };
  };
 }

 function classifyIssue(pi){
  var refs=V.messagesForPoint(pi).sort(function(a,b){return Number((WA.messages[b.i]||[])[1]||0)-Number((WA.messages[a.i]||[])[1]||0)}).slice(0,40),text=norm(refs.map(function(r){var m=WA.messages[r.i]||[];return m[6]||m[10]||''}).join(' '));
  var groups=V.groupStats(pi),g=groups[0],lev=V.evidenceLevel(g?g.count:0,g?g.strong:0,g?g.medium:0),type='other',title='Validar contexto antes de agir',body='A base não tem evidência suficiente para recomendar uma ação específica. Confirme ponto, máquina e situação antes de encaminhar.';
  if(/\b(tela apagada|tela preta|fonte|cabo|energia|hardware|display|monitor|placa|modulo|módulo|troca)\b/.test(text)){type='hardware';title='Provável intervenção física';body='Há histórico de sinais físicos. Valide o básico remoto sem prolongar tentativa e, se persistir, encaminhe para manutenção/campo com o que já foi testado.'}
  else if(/\b(offline|sem acesso|inacessivel|inacessível|internet|rede|conectividade|sem mídia|sem midia|player|loop)\b/.test(text)){type='remote';title='Comece por validação remota rápida';body='O histórico aponta acesso, rede ou mídia. Valide online/conectividade/player e reinício controlado quando aplicável. Se não normalizar, encaminhe usando o grupo sustentado pela evidência.'}
  else if(/\b(chamado|ticket|protocolo)\b/.test(text)){type='ticket';title='Acompanhe pelo chamado';body='O histórico deste ponto referencia tratativas por chamado. Abra os chamados relacionados e confira a timeline antes de novo acionamento.'}
  if(g)body+=' Grupo com maior associação histórica: '+((WA.groups[g.group]||{}).name||'—')+'.';
  return {type:type,title:title,body:body,level:lev,group:g,refs:refs};
 }
 function composeForPoint(pi){
  if(window.PRISMA&&window.PRISMA.compose){window.PRISMA.compose.point=pi;window.PRISMA.compose.machine=null;var gs=V.groupStats(pi);if(gs[0])window.PRISMA.compose.group=gs[0].group}
  var b=document.querySelector('.navbtn[data-page="prismaMessages"]');if(b)b.click();else V.toast('Abra Mensagens no menu PRISMA');
  V.log('mensagem','Iniciou mensagem para '+V.pointLabel(pi),{point:pi});
 }
 async function isFav(pi){var a=await DB.all('favorites');return a.find(function(f){return f.kind==='point'&&Number(f.index)===pi})||null}
 async function toggleFav(pi){
  var f=await isFav(pi);if(f){await DB.delete('favorites',f.id);V.toast('Removido dos favoritos');V.log('favorito','Removeu favorito '+V.pointLabel(pi),{point:pi})}
  else{await DB.put('favorites',{id:'point_'+pi,kind:'point',index:pi,key:V.pointCode(pi),label:V.pointLabel(pi),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});V.toast('Ponto favoritado');V.log('favorito','Favoritou '+V.pointLabel(pi),{point:pi})}
  render360(pi);
 }

 async function render360(pi){
  var sec=document.getElementById('flow360');if(Number.isInteger(pi))V.currentPoint=pi;pi=V.currentPoint;
  if(!Number.isInteger(pi)||!P[pi]){
   sec.innerHTML='<div class="flow-hero"><h3>PONTO <b>360º</b></h3><p>Uma tela para entender o ponto, ver relações, decidir a próxima ação e sair direto para o sistema certo.</p><div class="flow-command"><input id="flow360Search" placeholder="Código, nome do ponto ou ID/nome da máquina…"><span>ENTER</span></div></div><div id="flow360SearchOut" style="margin-top:10px"></div>';bind360Search();return;
  }
  var p=P[pi]||[],machines=V.machinesForPoint(pi),tickets=V.ticketsForPoint(pi),assets=V.assetsForPoint(pi),refs=V.messagesForPoint(pi).sort(function(a,b){return Number((WA.messages[b.i]||[])[1]||0)-Number((WA.messages[a.i]||[])[1]||0)}),groups=V.groupStats(pi),rec=classifyIssue(pi),fav=await isFav(pi);
  var topg=groups[0],gname=topg?((WA.groups[topg.group]||{}).name||'—'):'Nenhum grupo sustentado';
  sec.innerHTML=
   '<div class="card section" style="margin-top:0"><div class="body"><div class="flow-360head"><div><div class="flow-360code">PONTO '+esc(p[1]||'—')+' • ID Operações '+esc(p[0]||'—')+'</div><h2>'+esc(p[2]||'')+'</h2><p>'+esc(p[3]||'')+' • '+esc(p[10]||p[6]||'')+' • '+esc(p[6]||'')+'</p></div><div class="actions"><a href="'+esc(V.pointOps(pi))+'" target="_blank" rel="noopener">Operações ↗</a><button id="flowFavPoint">'+(fav?'★ Favorito':'☆ Favoritar')+'</button><button class="primary" id="flowComposePoint">Criar mensagem</button></div></div></div></div>'+
   '<div data-newbie-only class="flow-tip"><b>Como ler esta tela:</b> código do ponto é o identificador operacional; ID Operações é o número interno usado no link. Grupo recomendado é histórico/evidência, não um cadastro oficial.</div>'+
   '<div class="flow-grid2"><div class="card section"><div class="shead"><h3>O que eu faço agora? '+help('Recomendação','Regra determinística baseada em evidências do próprio ponto. Não usa IA para inventar rota ou diagnóstico.')+'</h3><span>'+rec.level.label+'</span></div><div class="body"><div class="flow-recommend '+(rec.level.className==='warn'?'warn':rec.level.className==='bad'?'bad':'')+'"><h4>'+esc(rec.title)+'</h4><p>'+esc(rec.body)+'</p><div class="actions" style="margin-top:8px">'+(topg?'<button data-flow-open-group="'+topg.group+'">Abrir '+esc(gname)+'</button><button data-flow-group-routes="'+topg.group+'">Ver rotas</button>':'')+'<button id="flowAddTaskPoint">Adicionar ao Meu Turno</button></div></div></div></div>'+
   '<div class="card section"><div class="shead"><h3>Confiança e evidência</h3><span>'+fmt(refs.length)+' mensagens vinculadas</span></div><div class="body"><div class="flow-grid3"><div class="flow-actioncard"><h4>Grupo principal</h4><p>'+esc(gname)+'</p></div><div class="flow-actioncard"><h4>Nível</h4><p>'+esc(rec.level.label)+'</p></div><div class="flow-actioncard"><h4>Evidências fortes</h4><p>'+fmt(refs.filter(function(x){return x.confidence>=.9}).length)+'</p></div></div></div></div></div>'+
   '<div class="card section"><div class="shead"><h3>Relações do ponto</h3><span>Ponto ⇄ Máquina ⇄ Chamado ⇄ Grupo ⇄ Mensagem ⇄ Ativo</span></div><div class="body"><div class="flow-rel">'+
   relMachines(machines)+relTickets(tickets)+relGroups(groups)+relMessages(refs)+relAssets(assets)+relOps(pi,machines,tickets)+'</div></div></div>'+
   '<div class="card section"><div class="shead"><h3>Linha do tempo recente</h3><span>evidência original</span></div><div class="body"><div class="timeline">'+refs.slice(0,15).map(function(r){var m=WA.messages[r.i]||[],g=WA.groups[m[4]]||{};return '<div class="titem"><div class="meta"><span>'+esc((m[2]||'')+' '+(m[3]||'')+' • '+(g.name||''))+'</span><span>'+esc(Math.round(r.confidence*100)+'% vínculo')+'</span></div><div class="text">'+esc(m[6]||m[10]||'(sem texto)')+'</div><div class="actions" style="margin-top:6px"><button data-flow-open-msg="'+r.i+'">Abrir evidência</button></div></div>'}).join('')+'</div></div></div>';
  document.getElementById('flowFavPoint').onclick=function(){toggleFav(pi)};
  document.getElementById('flowComposePoint').onclick=function(){composeForPoint(pi)};
  document.getElementById('flowAddTaskPoint').onclick=function(){openTaskEditor(null,{title:'Acompanhar '+V.pointLabel(pi),pointIndex:pi,pointCode:V.pointCode(pi),status:'Fazer',priority:'Média',notes:'Criado pelo Ponto 360º.'})};
  V.log('ponto_360','Abriu 360º de '+V.pointLabel(pi),{point:pi});
 }
 function relMachines(ids){return '<div class="flow-relbox"><h4>Máquinas <span class="count">'+fmt(ids.length)+'</span></h4>'+(ids.slice(0,8).map(function(i){var m=M[i]||[];return '<button class="flow-relitem" data-flow-open-machine="'+i+'"><b>'+esc('['+(m[0]||'')+'] '+(m[2]||''))+'</b><small>'+esc((m[6]||'')+' • '+(m[7]||''))+'</small></button>'}).join('')||'<span class="muted small">Nenhuma</span>')+'</div>'}
 function relTickets(ids){return '<div class="flow-relbox"><h4>Chamados <span class="count">'+fmt(ids.length)+'</span></h4>'+(ids.slice(0,8).map(function(i){var t=WA.tickets[i]||[];return '<button class="flow-relitem" data-flow-open-ticket="'+i+'"><b>'+esc(t[0]||'')+'</b><small>'+fmt((t[1]||[]).length)+' ocorrência(s)</small></button>'}).join('')||'<span class="muted small">Nenhum</span>')+'</div>'}
 function relGroups(gs){return '<div class="flow-relbox"><h4>Grupos <span class="count">'+fmt(gs.length)+'</span></h4>'+(gs.slice(0,8).map(function(s){var g=WA.groups[s.group]||{},l=V.evidenceLevel(s.count,s.strong,s.medium);return '<button class="flow-relitem" data-flow-open-group="'+s.group+'"><b>'+esc(g.name||'')+'</b><small>'+fmt(s.count)+' evidência(s) • '+esc(l.label)+'</small></button>'}).join('')||'<span class="muted small">Nenhum sustentado</span>')+'</div>'}
 function relMessages(refs){return '<div class="flow-relbox"><h4>Mensagens <span class="count">'+fmt(refs.length)+'</span></h4>'+(refs.slice(0,6).map(function(r){var m=WA.messages[r.i]||[],g=WA.groups[m[4]]||{};return '<button class="flow-relitem" data-flow-open-msg="'+r.i+'"><b>'+esc(g.name||'WhatsApp')+'</b><small>'+esc(String(m[6]||m[10]||'').slice(0,80))+'</small></button>'}).join('')||'<span class="muted small">Nenhuma</span>')+'</div>'}
 function relAssets(ids){return '<div class="flow-relbox"><h4>Ativos <span class="count">'+fmt(ids.length)+'</span></h4>'+(ids.slice(0,8).map(function(i){var a=WA.assets[i]||[];return '<div class="flow-relitem"><b>'+esc(a[0]||'Ativo')+'</b><small>'+fmt((a[1]||[]).length)+' ocorrência(s)</small></div>'}).join('')||'<span class="muted small">Nenhum rotulado</span>')+'</div>'}
 function relOps(pi,machines,tickets){return '<div class="flow-relbox"><h4>Acessos</h4><a class="flow-relitem" href="'+esc(V.pointOps(pi))+'" target="_blank" rel="noopener"><b>Abrir ponto no Operações ↗</b><small>ID interno '+esc((P[pi]||[])[0]||'')+'</small></a>'+(machines[0]?'<a class="flow-relitem" href="'+esc(V.machineOps(machines[0]))+'" target="_blank" rel="noopener"><b>Abrir primeira máquina ↗</b><small>ID '+esc((M[machines[0]]||[])[0]||'')+'</small></a>':'')+'<button class="flow-relitem" data-flow-go-messages="'+pi+'"><b>Montar mensagem</b><small>Com dados deste ponto</small></button></div>'}
 function bind360Search(){
  var q=document.getElementById('flow360Search'),out=document.getElementById('flow360SearchOut'),timer;if(!q)return;
  q.oninput=function(){clearTimeout(timer);timer=setTimeout(async function(){var v=q.value.trim();if(!v){out.innerHTML='';return}var r=(await V.search(v,20)).filter(function(x){return x.t==='point'||x.t==='machine'}).slice(0,10);out.innerHTML='<div class="flow-list">'+r.map(function(x){var pi=x.t==='point'?x.i:V.machinePoint(x.i);return '<div class="flow-row"><div><strong>'+esc(x.primary+' '+x.secondary)+'</strong><small>'+esc(x.t==='point'?'Ponto':'Máquina')+'</small></div><div class="actions">'+(Number.isInteger(pi)?'<button class="primary" data-flow-360="'+pi+'">Abrir 360º</button>':'')+'</div></div>'}).join('')+'</div>'},120)};
  q.onkeydown=function(e){if(e.key==='Enter'){var b=out.querySelector('[data-flow-360]');if(b)b.click()}};
  setTimeout(function(){q.focus()},20);
 }

 async function renderRelations(){
  var sec=document.getElementById('flowRelations'),pi=V.currentPoint;
  if(!Number.isInteger(pi)){sec.innerHTML='<div class="flow-hero"><h3>MAPA DE <b>RELAÇÕES</b></h3><p>Navegue de uma entidade para as outras sem procurar em módulos separados.</p><div class="actions" style="margin-top:10px"><button class="primary" id="flowRelationsChoose">Escolher ponto</button></div></div>';document.getElementById('flowRelationsChoose').onclick=function(){V.activate('flow360')};return}
  var machines=V.machinesForPoint(pi),tickets=V.ticketsForPoint(pi),groups=V.groupStats(pi),refs=V.messagesForPoint(pi),assets=V.assetsForPoint(pi);
  sec.innerHTML='<div class="flow-hero"><h3>'+esc(V.pointLabel(pi))+'</h3><p>'+esc(V.pointAddress(pi))+'</p><div class="actions" style="margin-top:8px"><button data-flow-360="'+pi+'">Abrir Ponto 360º</button><a href="'+esc(V.pointOps(pi))+'" target="_blank" rel="noopener">Operações ↗</a></div></div><div class="card section"><div class="shead"><h3>Relações navegáveis</h3><span>evidência preservada</span></div><div class="body"><div class="flow-rel">'+relMachines(machines)+relTickets(tickets)+relGroups(groups)+relMessages(refs)+relAssets(assets)+relOps(pi,machines,tickets)+'</div></div></div>';
 }

 async function openTask(id){var t=await DB.get('tasks',id);if(t)openTaskEditor(id)}
 document.addEventListener('click',async function(e){
  var b=e.target.closest('[data-flow-status],[data-flow-task-open],[data-flow-task-next],[data-flow-unfav],[data-flow-go-messages],[data-flow-modal-close]');
  if(!b)return;
  if(b.dataset.flowStatus!=null){renderToday(b.dataset.flowStatus);return}
  if(b.dataset.flowTaskOpen!=null){openTask(b.dataset.flowTaskOpen);return}
  if(b.dataset.flowTaskNext!=null){advanceTask(b.dataset.flowTaskNext);return}
  if(b.dataset.flowUnfav!=null){await DB.delete('favorites',b.dataset.flowUnfav);renderToday(V.turnFilter);return}
  if(b.dataset.flowGoMessages!=null){composeForPoint(Number(b.dataset.flowGoMessages));return}
  if(b.hasAttribute('data-flow-modal-close')){closeModal();return}
 });

 V.renderToday=renderToday;V.render360=render360;V.renderRelations=renderRelations;V.openTaskEditor=openTaskEditor;V.openCapture=openCapture;V.composeForPoint=composeForPoint;
 V.registerPage('flowToday',function(){return renderToday(V.turnFilter)});
 V.registerPage('flow360',function(){return render360(V.currentPoint)});
 V.registerPage('flowRelations',renderRelations);
}
if(window.PRISMA_V11&&window.PRISMA_V11.ready)start();else document.addEventListener('prisma-v11-ready',start,{once:true});
})();