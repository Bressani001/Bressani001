(function(){
'use strict';
const C=()=>window.PrismaCore,S=()=>C().S,DB=()=>window.PrismaDB;
const esc=v=>C().esc(v),fmt=n=>C().fmt(n),norm=v=>C().norm(v);
const state={pointKey:null,machineKey:null,group:null,ticket:'',mention:'',obs:'',template:'verificacao'};

const DEFAULTS=[
{id:'verificacao',title:'Solicitar verificação',body:'Boa tarde, pessoal.\n\nIdentificamos uma ocorrência[[ no ponto {COD_PONTO} - {PONTO}]][[ na máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem verificar, por favor?[[\n\nObservação: {OBS}]]'},
{id:'sem_midia',title:'Sem mídia / conteúdo',body:'Boa tarde, pessoal.\n\nIdentificamos o ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]] sem mídia ou com conteúdo fora do esperado.[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem verificar, por favor?[[\n\nObservação: {OBS}]]'},
{id:'offline',title:'Offline / sem acesso',body:'Boa tarde, pessoal.\n\nO ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]] está sem acesso/offline no momento.[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem validar, por favor?[[\n\nObservação: {OBS}]]'},
{id:'hardware',title:'Tela / hardware / energia',body:'Boa tarde, pessoal.\n\nPrecisamos de verificação física no ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem verificar tela, energia, cabeamento e equipamento, por favor?[[\n\nObservação: {OBS}]]'},
{id:'rede',title:'Rede / internet',body:'Boa tarde, pessoal.\n\nIdentificamos possível indisponibilidade de rede no ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem validar a conectividade, por favor?[[\n\nObservação: {OBS}]]'},
{id:'retorno',title:'Cobrança de retorno',body:'Boa tarde, pessoal.\n\nConseguem nos atualizar sobre a tratativa[[ do ponto {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]][[ / chamado {CHAMADO}]]?[[\n\n{MENCION}, consegue nos apoiar com um retorno?]][[\n\nObservação: {OBS}]]'},
{id:'normalizado',title:'Normalizado / restabelecido',body:'Boa tarde, pessoal.\n\nO ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]] voltou a operar normalmente.[[\nChamado: {CHAMADO}.]][[\n\nObservação: {OBS}]]'},
{id:'tecnico',title:'Acionamento técnico',body:'Boa tarde, pessoal.\n\nSolicitamos apoio técnico para o ponto[[ {COD_PONTO} - {PONTO}]][[ / máquina {ID_MAQUINA} - {MAQUINA}]].[[\nEndereço: {ENDERECO}.]][[\nChamado: {CHAMADO}.]]\n\n[[{MENCION}, ]]podem seguir com a tratativa, por favor?[[\n\nObservação: {OBS}]]'}
];
async function ensureDefaults(){const t=await DB().all('templates');if(!t.length)await DB().bulkPut('templates',DEFAULTS.map(x=>Object.assign({},x,{updatedAt:new Date().toISOString()})),50);}
function tokenContext(){
  const p=state.pointKey?C().getPoint(state.pointKey):null,m=state.machineKey?C().getMachine(state.machineKey):null,g=Number.isInteger(state.group)?S().groups[state.group]:null;
  const now=new Date();
  return {PONTO:p?.name||'',COD_PONTO:p?.code||'',MAQUINA:m?.name||'',ID_MAQUINA:m?.id||'',ENDERECO:p?.address||m?.address||'',PRACA:p?.square||m?.square||'',CHAMADO:state.ticket||'',GRUPO:g?.name||'',MENCION:state.mention||'',OBS:state.obs||'',DATA:now.toLocaleDateString('pt-BR'),HORA:now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
}
function renderTemplate(body,ctx){
  let out=String(body||'');
  out=out.replace(/\[\[([\s\S]*?)\]\]/g,(full,inner)=>{
    const vars=[...inner.matchAll(/\{([A-Z_]+)\}/g)].map(m=>m[1]);
    if(vars.some(k=>!String(ctx[k]||'').trim()))return '';
    return inner.replace(/\{([A-Z_]+)\}/g,(_,k)=>ctx[k]||'');
  });
  out=out.replace(/\{([A-Z_]+)\}/g,(_,k)=>ctx[k]||'');
  return out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
async function templates(){await ensureDefaults();return DB().all('templates')}
async function destinations(kind){const all=await DB().all('destinations');return kind?all.filter(x=>x.kind===kind):all}
async function contacts(){return DB().all('contacts')}
function safeOpen(url){if(url)window.open(url,'_blank','noopener,noreferrer')}
async function copyText(text,msg){try{await navigator.clipboard.writeText(text);C().toast(msg||'Copiado')}catch(e){prompt('Copie:',text)}}
function pointOptions(){
  const q=norm(document.getElementById('msgPointSearch')?.value||'');if(!q)return [];
  return S().points.filter(p=>norm([p.code,p.name,p.address,p.city,p.square].join(' ')).includes(q)).slice(0,12);
}
function fillMachines(){
  const sel=document.getElementById('msgMachine');if(!sel)return;const p=state.pointKey?C().getPoint(state.pointKey):null,ms=p?C().machinesForPoint(p):[];
  sel.innerHTML='<option value="">Máquina (opcional)</option>'+ms.map(m=>'<option value="'+esc(m._key)+'">'+esc('['+m.id+'] '+m.name)+'</option>').join('');
  if(state.machineKey&&ms.some(m=>m._key===state.machineKey))sel.value=state.machineKey;else if(state.machineKey){const m=C().getMachine(state.machineKey);if(m)sel.insertAdjacentHTML('beforeend','<option value="'+esc(m._key)+'">'+esc('['+m.id+'] '+m.name)+'</option>'),sel.value=m._key;}
}
async function refreshPreview(){
  const ts=await templates(),t=ts.find(x=>x.id===state.template)||ts[0];if(!t)return;
  const pv=document.getElementById('msgPreview');if(pv)pv.value=renderTemplate(t.body,tokenContext());
  const p=state.pointKey?C().getPoint(state.pointKey):null,m=state.machineKey?C().getMachine(state.machineKey):null,g=Number.isInteger(state.group)?S().groups[state.group]:null,ctx=document.getElementById('msgContext');
  if(ctx)ctx.innerHTML='<b>Contexto real</b><small>'+esc([p&&(p.code+' • '+p.name),m&&('Máq '+m.id+' • '+m.name),g&&('Grupo '+g.name),state.ticket&&('Chamado '+state.ticket)].filter(Boolean).join(' | ')||'Nenhuma entidade selecionada')+'</small>';
}
async function fillControls(){
  const ts=await templates(),wa=await destinations('whatsapp'),sl=await destinations('slack'),ct=await contacts();
  const tsel=document.getElementById('msgTemplate');if(tsel){tsel.innerHTML=ts.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.title)+'</option>').join('');tsel.value=state.template||ts[0]?.id||'';}
  const gsel=document.getElementById('msgGroup');if(gsel){gsel.innerHTML='<option value="">Grupo WhatsApp (opcional)</option>'+S().groups.map((g,i)=>'<option value="'+i+'">'+esc(g.name||('Grupo '+i))+'</option>').join('');if(Number.isInteger(state.group))gsel.value=String(state.group);}
  const ssel=document.getElementById('msgSlack');if(ssel)ssel.innerHTML='<option value="">Canal Slack (opcional)</option>'+sl.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
  const dl=document.getElementById('msgContacts');if(dl)dl.innerHTML=ct.map(x=>'<option value="'+esc(x.mention||x.name||'')+'">'+esc(x.name||'')+'</option>').join('');
  fillMachines();await refreshPreview();
}
function bindCompose(){
  const point=document.getElementById('msgPointSearch'),suggest=document.getElementById('msgPointSuggest');
  point.oninput=()=>{const rows=pointOptions();suggest.innerHTML=rows.map(p=>'<button data-pick-point="'+esc(p._key)+'"><b>'+esc((p.code?p.code+' • ':'')+p.name)+'</b><small>'+esc([p.address,p.city,p.square].filter(Boolean).join(' • '))+'</small></button>').join('');suggest.classList.toggle('open',!!rows.length);suggest.querySelectorAll('[data-pick-point]').forEach(b=>b.onclick=()=>{state.pointKey=b.dataset.pickPoint;const p=C().getPoint(state.pointKey);point.value=(p.code?p.code+' • ':'')+p.name;suggest.classList.remove('open');state.machineKey=null;fillMachines();refreshPreview()})};
  document.getElementById('msgTemplate').onchange=e=>{state.template=e.target.value;refreshPreview()};
  document.getElementById('msgGroup').onchange=e=>{state.group=e.target.value===''?null:Number(e.target.value);refreshPreview()};
  document.getElementById('msgMachine').onchange=e=>{state.machineKey=e.target.value||null;refreshPreview()};
  document.getElementById('msgTicket').oninput=e=>{state.ticket=e.target.value;refreshPreview()};
  document.getElementById('msgMention').oninput=e=>{state.mention=e.target.value;refreshPreview()};
  document.getElementById('msgObs').oninput=e=>{state.obs=e.target.value;refreshPreview()};
  document.getElementById('msgRegen').onclick=refreshPreview;
  document.getElementById('msgCopy').onclick=()=>copyText(document.getElementById('msgPreview').value,'Mensagem copiada');
  document.getElementById('msgWhats').onclick=()=>review('whatsapp');
  document.getElementById('msgSlackBtn').onclick=()=>review('slack');
}
async function review(kind){
  const text=document.getElementById('msgPreview').value.trim();if(!text){C().toast('Mensagem vazia');return}
  let targetName='',url='';
  if(kind==='whatsapp'){
    const g=Number.isInteger(state.group)?S().groups[state.group]:null;targetName=g?.name||'WhatsApp Web';
    const all=await destinations('whatsapp'),d=all.find(x=>Number(x.groupIndex)===Number(state.group)||norm(x.name)===norm(g?.name||''));url=d?.url||'https://web.whatsapp.com/';
  }else{
    const id=document.getElementById('msgSlack').value,all=await destinations('slack'),d=all.find(x=>x.id===id);targetName=d?.name||'Slack';const raw=String(d?.url||'').trim();url=raw?( /^https?:\/\//i.test(raw)?raw:'https://slack.com/app_redirect?channel='+encodeURIComponent(raw) ):'https://app.slack.com/client';
  }
  PrismaApp.showModal('<h3 style="margin-top:0">Revisão obrigatória</h3><p class="muted">Nada será enviado automaticamente. Confira o texto e o destino.</p><div class="field"><label>Destino</label><div>'+esc(targetName)+'</div></div><textarea id="reviewText" style="min-height:240px;margin-top:10px">'+esc(text)+'</textarea><div class="actions" style="margin-top:10px"><button data-modal-close>Cancelar</button><button id="reviewCopy">Copiar</button><button id="reviewOpen" class="primary">Copiar e abrir '+esc(kind==='whatsapp'?'WhatsApp':'Slack')+'</button></div>');
  document.getElementById('reviewCopy').onclick=()=>copyText(document.getElementById('reviewText').value,'Mensagem copiada');
  document.getElementById('reviewOpen').onclick=async()=>{await copyText(document.getElementById('reviewText').value,'Mensagem copiada');if(url)safeOpen(url);else C().toast('Cadastre o link do canal Slack em Destinos');};
  document.querySelector('[data-modal-close]').onclick=PrismaApp.closeModal;
}
async function renderCompose(host){
  host.innerHTML='<div class="message-grid"><div class="card"><div class="card-body"><div class="form-grid"><label>Modelo<select id="msgTemplate"></select></label><label>Destino WhatsApp<select id="msgGroup"></select></label><label class="full relative">Ponto<input id="msgPointSearch" autocomplete="off" placeholder="Código, nome ou endereço…"><div id="msgPointSuggest" class="suggest"></div></label><label>Máquina<select id="msgMachine"></select></label><label>Chamado<input id="msgTicket" value="'+esc(state.ticket)+'" placeholder="Número ELT"></label><label>@ responsável<input id="msgMention" list="msgContacts" value="'+esc(state.mention)+'" placeholder="@nome"><datalist id="msgContacts"></datalist></label><label>Canal Slack<select id="msgSlack"></select></label><label class="full">Observação<input id="msgObs" value="'+esc(state.obs)+'" placeholder="Opcional"></label></div><div id="msgContext" class="context-box"></div></div></div><div class="card"><div class="card-head"><h3>Prévia editável</h3><small>revise antes de abrir qualquer canal</small></div><div class="card-body"><textarea id="msgPreview" style="min-height:300px"></textarea><div class="actions" style="margin-top:10px"><button id="msgRegen">Regerar</button><button id="msgCopy">Copiar</button><button id="msgWhats" class="primary">Revisar → WhatsApp</button><button id="msgSlackBtn">Revisar → Slack</button></div></div></div></div>';
  if(state.pointKey){const p=C().getPoint(state.pointKey);if(p)setTimeout(()=>{const x=document.getElementById('msgPointSearch');if(x)x.value=(p.code?p.code+' • ':'')+p.name},0);}
  await fillControls();bindCompose();
}
async function renderTemplates(host){
  const ts=await templates();
  host.innerHTML='<div class="card"><div class="card-head"><h3>Modelos</h3><div class="actions"><button id="restoreTemplates">Restaurar padrões</button><button id="newTemplate" class="primary">Novo modelo</button></div></div><div class="card-body">'+ts.map(t=>'<div class="source-row"><div><b>'+esc(t.title)+'</b><small>'+esc(t.body.slice(0,150))+'</small></div><div class="actions"><button data-edit-template="'+esc(t.id)+'">Editar</button><button data-dup-template="'+esc(t.id)+'">Duplicar</button><button class="danger" data-del-template="'+esc(t.id)+'">Excluir</button></div></div>').join('')+'</div></div>';
  document.getElementById('newTemplate').onclick=()=>editTemplate(null);document.getElementById('restoreTemplates').onclick=async()=>{if(!confirm('Restaurar os modelos padrão? Os modelos atuais serão substituídos.'))return;await DB().clear('templates');await DB().bulkPut('templates',DEFAULTS.map(x=>Object.assign({},x,{updatedAt:new Date().toISOString()})),50);state.template='verificacao';C().toast('Modelos padrão restaurados');renderTemplates(host)};
  host.querySelectorAll('[data-edit-template]').forEach(b=>b.onclick=()=>editTemplate(b.dataset.editTemplate));
  host.querySelectorAll('[data-dup-template]').forEach(b=>b.onclick=async()=>{const t=await DB().get('templates',b.dataset.dupTemplate);if(t){t.id=DB().uid('tpl');t.title+=' (cópia)';await DB().put('templates',t);renderTemplates(host)}});
  host.querySelectorAll('[data-del-template]').forEach(b=>b.onclick=async()=>{if(confirm('Excluir este modelo?')){await DB().delete('templates',b.dataset.delTemplate);renderTemplates(host)}});
}
async function editTemplate(id){
  const t=id?await DB().get('templates',id):{id:DB().uid('tpl'),title:'Novo modelo',body:''};
  PrismaApp.showModal('<h3 style="margin-top:0">Modelo de mensagem</h3><label>Título<input id="tplTitle" value="'+esc(t.title||'')+'"></label><label style="display:block;margin-top:10px">Texto<textarea id="tplBody" style="min-height:260px">'+esc(t.body||'')+'</textarea></label><p class="muted">Variáveis: {PONTO}, {COD_PONTO}, {MAQUINA}, {ID_MAQUINA}, {ENDERECO}, {PRACA}, {CHAMADO}, {GRUPO}, {MENCION}, {OBS}, {DATA}, {HORA}. Use [[ trecho ]] para ocultar quando alguma variável do trecho estiver vazia.</p><div class="actions"><button data-modal-close>Cancelar</button><button id="tplSave" class="primary">Salvar</button></div>');
  document.querySelector('[data-modal-close]').onclick=PrismaApp.closeModal;document.getElementById('tplSave').onclick=async()=>{t.title=document.getElementById('tplTitle').value.trim()||'Sem título';t.body=document.getElementById('tplBody').value;t.updatedAt=new Date().toISOString();await DB().put('templates',t);PrismaApp.closeModal();C().toast('Modelo salvo');renderPage('templates')};
}
async function renderDestinations(host){
  const ds=await destinations(),ct=await contacts(),tm=await DB().all('ticketMap');
  host.innerHTML='<div class="grid2"><div class="card"><div class="card-head"><h3>Destinos</h3><button id="newDestination" class="primary">Adicionar</button></div><div class="card-body">'+(ds.length?ds.map(d=>'<div class="source-row"><div><b>'+esc((d.kind==='whatsapp'?'WhatsApp: ':'Slack: ')+(d.name||''))+'</b><small>'+esc(d.url||'sem link')+'</small></div><button class="danger" data-del-dest="'+esc(d.id)+'">Excluir</button></div>').join(''):'<div class="empty">Nenhum destino cadastrado.</div>')+'</div></div><div><div class="card"><div class="card-head"><h3>Contatos / @</h3><button id="newContact">Adicionar</button></div><div class="card-body">'+(ct.length?ct.map(x=>'<div class="source-row"><div><b>'+esc(x.name)+'</b><small>'+esc(x.mention||'')+'</small></div><button class="danger" data-del-contact="'+esc(x.id)+'">Excluir</button></div>').join(''):'<div class="empty">Nenhum contato.</div>')+'</div></div><div class="card" style="margin-top:12px"><div class="card-head"><h3>Chamado → ID Operações</h3><button id="newTicketMap">Mapear</button></div><div class="card-body">'+(tm.length?tm.map(x=>'<div class="source-row"><div><b>'+esc(x.ticket)+'</b><small>ID interno '+esc(x.internalId)+'</small></div><button class="danger" data-del-ticketmap="'+esc(x.id)+'">Excluir</button></div>').join(''):'<div class="empty">Nenhum chamado mapeado.</div>')+'</div></div></div></div>';
  document.getElementById('newDestination').onclick=()=>destinationModal();document.getElementById('newContact').onclick=()=>contactModal();document.getElementById('newTicketMap').onclick=()=>ticketMapModal();
  host.querySelectorAll('[data-del-dest]').forEach(b=>b.onclick=async()=>{await DB().delete('destinations',b.dataset.delDest);renderDestinations(host)});
  host.querySelectorAll('[data-del-contact]').forEach(b=>b.onclick=async()=>{await DB().delete('contacts',b.dataset.delContact);renderDestinations(host)});
  host.querySelectorAll('[data-del-ticketmap]').forEach(b=>b.onclick=async()=>{await DB().delete('ticketMap',b.dataset.delTicketmap);renderDestinations(host)});
}
function destinationModal(){
  PrismaApp.showModal('<h3 style="margin-top:0">Adicionar destino</h3><label>Tipo<select id="destKind"><option value="whatsapp">WhatsApp</option><option value="slack">Slack</option></select></label><label style="display:block;margin-top:8px">Nome / grupo<input id="destName" placeholder="Nome exato do grupo/canal"></label><label style="display:block;margin-top:8px">Link<input id="destUrl" placeholder="https://..."></label><label id="destGroupLabel" style="display:block;margin-top:8px">Grupo da base<select id="destGroup"><option value="">Associar pelo nome</option>'+S().groups.map((g,i)=>'<option value="'+i+'">'+esc(g.name)+'</option>').join('')+'</select></label><div class="actions" style="margin-top:10px"><button data-modal-close>Cancelar</button><button id="destSave" class="primary">Salvar</button></div>');
  document.querySelector('[data-modal-close]').onclick=PrismaApp.closeModal;document.getElementById('destSave').onclick=async()=>{const kind=document.getElementById('destKind').value,gi=document.getElementById('destGroup').value,name=document.getElementById('destName').value.trim()||(gi!==''?S().groups[Number(gi)]?.name:'');await DB().put('destinations',{id:DB().uid(kind==='whatsapp'?'wa':'sl'),kind,name,url:document.getElementById('destUrl').value.trim(),groupIndex:gi===''?null:Number(gi),updatedAt:new Date().toISOString()});PrismaApp.closeModal();renderPage('destinations')};
}
function contactModal(){
  PrismaApp.showModal('<h3 style="margin-top:0">Adicionar contato</h3><label>Nome<input id="ctName"></label><label style="display:block;margin-top:8px">@ / menção<input id="ctMention" placeholder="@nome"></label><div class="actions"><button data-modal-close>Cancelar</button><button id="ctSave" class="primary">Salvar</button></div>');document.querySelector('[data-modal-close]').onclick=PrismaApp.closeModal;document.getElementById('ctSave').onclick=async()=>{await DB().put('contacts',{id:DB().uid('ct'),name:document.getElementById('ctName').value.trim(),mention:document.getElementById('ctMention').value.trim()});PrismaApp.closeModal();renderPage('destinations')};
}
function ticketMapModal(){
  PrismaApp.showModal('<h3 style="margin-top:0">Mapear chamado</h3><label>Número ELT<input id="tmTicket"></label><label style="display:block;margin-top:8px">ID interno Operações<input id="tmInternal"></label><div class="actions"><button data-modal-close>Cancelar</button><button id="tmSave" class="primary">Salvar</button></div>');document.querySelector('[data-modal-close]').onclick=PrismaApp.closeModal;document.getElementById('tmSave').onclick=async()=>{const ticket=document.getElementById('tmTicket').value.trim(),internalId=document.getElementById('tmInternal').value.trim();if(!ticket||!internalId)return;await DB().put('ticketMap',{id:'ticket:'+ticket,ticket,internalId});PrismaApp.closeModal();renderPage('destinations')};
}
async function renderPage(tab){
  const host=document.getElementById('page-messages');if(!host)return;await ensureDefaults();
  host.innerHTML='<div class="hero"><h2>MENSAGENS <b>PRISMA</b></h2><p>Modelo → contexto real → revisão → destino. Nada é enviado automaticamente.</p></div><div class="tabs"><button data-msg-tab="compose">Compor</button><button data-msg-tab="templates">Modelos</button><button data-msg-tab="destinations">Destinos</button></div><div id="msgPane"></div>';
  host.querySelectorAll('[data-msg-tab]').forEach(b=>b.onclick=()=>renderPage(b.dataset.msgTab));const pane=document.getElementById('msgPane');tab=tab||'compose';host.querySelector('[data-msg-tab="'+tab+'"]')?.classList.add('active');if(tab==='compose')await renderCompose(pane);else if(tab==='templates')await renderTemplates(pane);else await renderDestinations(pane);
}
function prefill(x){
  x=x||{};if(x.group!=null)state.group=Number(x.group);if(x.pointKey)state.pointKey=x.pointKey;if(x.machineKey)state.machineKey=x.machineKey;if(x.ticket!=null)state.ticket=String(x.ticket);if(x.mention!=null)state.mention=String(x.mention);if(x.obs!=null)state.obs=String(x.obs);if(document.getElementById('page-messages')?.classList.contains('active'))renderPage('compose');
}
window.PrismaMessages={renderPage,prefill,renderTemplate,ensureDefaults};
})();