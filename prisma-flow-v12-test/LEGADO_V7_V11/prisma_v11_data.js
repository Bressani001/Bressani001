(function(){
'use strict';
function start(){
 var V=window.PRISMA_V11;if(!V||V.dataInstalled)return;V.dataInstalled=true;
 var esc=V.esc,fmt=V.fmt,dt=V.dt,DB=window.PRISMA_DB;
 var pending=null;

 function daysBetween(a,b){return Math.floor((b-a)/86400000)}
 function latestMessageDate(){
  var max=0;for(var i=0;i<(WA.messages||[]).length;i++){var x=Number(WA.messages[i][1])||0;if(x>max)max=x}
  if(max>1e12)return new Date(max);
  for(i=0;i<(WA.messages||[]).length;i++){var m=WA.messages[i]||[],d=String(m[2]||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);if(d){var z=new Date(Number(d[3]),Number(d[2])-1,Number(d[1]));if(z.getTime()>max)max=z.getTime()}}
  return max?new Date(max):null;
 }
 function healthLabel(age){
  if(age==null)return {label:'SEM DATA',cls:'warn',text:'Não foi possível determinar a data mais recente.'};
  if(age<=2)return {label:'ATUAL',cls:'ok',text:'Há evidência recente na base.'};
  if(age<=7)return {label:'ATENÇÃO',cls:'warn',text:'A base ainda é útil, mas merece atualização em breve.'};
  return {label:'DESATUALIZADA',cls:'bad',text:'Atualize antes de tratar ausência de informação como verdade.'};
 }
 function size(n){var u=['B','KB','MB','GB'],i=0,x=Number(n||0);while(x>=1024&&i<u.length-1){x/=1024;i++}return x.toFixed(i?1:0)+' '+u[i]}
 function digestHex(buf){return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0')}).join('')}
 async function sha256(buffer){if(crypto&&crypto.subtle){return digestHex(await crypto.subtle.digest('SHA-256',buffer))}return 'sha256-indisponivel'}

 function renderHealth(){
  var sec=document.getElementById('flowHealth'),last=latestMessageDate(),age=last?daysBetween(last,new Date()):null,h=healthLabel(age),imports=V.overlays||[],audit=WA.audit||{},base=audit.baseAudit||{};
  sec.innerHTML=
   '<div class="flow-hero"><h3>SAÚDE DAS <b>BASES</b></h3><p>O PRISMA separa “não encontrei” de “não existe”. Aqui você vê a idade e a cobertura antes de confiar numa ausência.</p></div>'+
   '<div data-newbie-only class="flow-tip" style="margin-top:9px"><b>Por que isso importa?</b> Um ponto sem mensagem numa coleta antiga não significa que nunca houve ocorrência. Sempre olhe a idade e a cobertura da fonte.</div>'+
   '<div class="flow-health" style="margin-top:10px">'+
    healthCard('WhatsApp',fmt(WA.messages.length)+' mensagens',last?last.toLocaleString('pt-BR'):'—',h)+
    healthCard('Pontos',fmt(P.length)+' registros','Pacote mestre '+V.packageDate,{label:'PACOTE',cls:'blue',text:'Data do pacote, não necessariamente do cadastro de cada ponto.'})+
    healthCard('Máquinas',fmt(M.length)+' máquinas','Pacote mestre '+V.packageDate,{label:'PACOTE',cls:'blue',text:'Data do pacote, não equivale ao campo “Última Atualização”, que continua excluído.'})+
    healthCard('Overlays locais',fmt(imports.length)+' importação(ões)',imports[0]?dt(imports.slice().sort(function(a,b){return String(b.importedAt).localeCompare(String(a.importedAt))})[0].importedAt):'Nenhum',{label:imports.length?'ATIVO':'VAZIO',cls:imports.length?'ok':'blue',text:'Atualizações importadas na camada FLOW deste navegador.'})+
   '</div>'+
   '<div class="flow-grid2"><div class="card section"><div class="shead"><h3>Cobertura conhecida</h3><span>auditoria</span></div><div class="body"><div class="flow-list">'+
    row('Grupos inventariados',fmt(audit.groupsTotal||WA.groups.length))+
    row('Grupos completos',fmt(audit.groupsComplete||0))+
    row('Com gaps de mídia',fmt(audit.groupsCompleteWithMediaGaps||0))+
    row('Precisam revisão / falharam',fmt((audit.groupsNeedsReview||0)+(audit.groupsFailed||0)))+
    row('Mensagens ligadas a entidade',fmt(audit.messagesLinkedAny||0))+
   '</div></div></div>'+
   '<div class="card section"><div class="shead"><h3>Motor FLOW</h3><span>diagnóstico local</span></div><div class="body"><div class="flow-list">'+
    row('Web Worker',V.workerReady?'Ativo':'Fallback local')+
    row('Índice universal',fmt((V.fallbackRecords||[]).length)+' registros compactos')+
    row('IndexedDB',DB?'Ativo':'Indisponível')+
    row('Modo Novo no NOC',document.body.classList.contains('newbie')?'Ligado':'Desligado')+
    row('Versão','PRISMA FLOW '+V.version)+
   '</div><div class="actions" style="margin-top:10px"><button id="flowExportBackup">Exportar backup FLOW</button><button id="flowImportBackup">Importar backup FLOW</button><input id="flowBackupFile" type="file" accept=".json,application/json" style="display:none"></div></div></div></div>'+
   '<div class="card section"><div class="shead"><h3>Importações ativas</h3><span>overlay local</span></div><div class="body">'+importRows(imports)+'</div></div>';
  document.getElementById('flowExportBackup').onclick=exportBackup;
  document.getElementById('flowImportBackup').onclick=function(){document.getElementById('flowBackupFile').click()};
  document.getElementById('flowBackupFile').onchange=importBackup;
 }
 function healthCard(title,count,date,h){return '<div class="flow-healthcard"><span class="flow-chip '+esc(h.cls)+'">'+esc(h.label)+'</span><b style="margin-top:7px">'+esc(count)+'</b><span>'+esc(title)+'<br>'+esc(date)+'<br>'+esc(h.text)+'</span></div>'}
 function row(a,b){return '<div class="flow-row"><div><strong>'+esc(a)+'</strong></div><div>'+esc(b)+'</div></div>'}
 function importRows(imports){
  if(!imports.length)return '<div class="empty">Nenhuma base adicional importada. A V11 está usando somente o pacote mestre.</div>';
  return '<div class="flow-list">'+imports.slice().sort(function(a,b){return String(b.importedAt).localeCompare(String(a.importedAt))}).map(function(im){return '<div class="flow-row"><div><strong>'+esc(im.name||im.id)+'</strong><small>'+esc(im.kind||'unknown')+' • '+fmt((im.records||[]).length)+' registros • '+esc(dt(im.importedAt))+' • SHA-256 '+esc(String(im.digest||'').slice(0,16))+'…</small></div><div class="actions"><button data-flow-import-toggle="'+esc(im.id)+'">'+(im.active===false?'Ativar':'Desativar')+'</button><button data-flow-import-delete="'+esc(im.id)+'">Excluir</button></div></div>'}).join('')+'</div>';
 }

 function renderUpdate(){
  var sec=document.getElementById('flowUpdate');sec.innerHTML=
   '<div class="flow-hero"><h3>ATUALIZAR <b>BASES</b></h3><p>Importe CSV ou JSON, valide estrutura, veja o diff e só depois confirme. O arquivo original não altera a evidência estática do pacote: a V11 cria um overlay versionado e reversível.</p></div>'+
   '<div data-newbie-only class="flow-tip" style="margin-top:9px"><b>Overlay:</b> é uma camada local mais nova. Você pode desativá-la ou excluí-la sem tocar nos arquivos originais do PRISMA.</div>'+
   '<div class="card section"><div class="body"><div id="flowDrop" class="flow-drop"><h3 style="margin:0">Arraste CSV/JSON aqui</h3><p class="muted small">ou escolha o arquivo. Limite de segurança: 80 MB.</p><div class="actions" style="justify-content:center;margin-top:8px"><button class="primary" id="flowChooseImport">Escolher arquivo</button><input id="flowImportFile" type="file" accept=".csv,.json,text/csv,application/json" style="display:none"></div><label class="flow-chip" style="margin-top:10px"><input id="flowImportComplete" type="checkbox"> Este arquivo representa a base completa</label></div><div id="flowImportPreview"></div></div></div>';
  var input=document.getElementById('flowImportFile'),drop=document.getElementById('flowDrop');
  document.getElementById('flowChooseImport').onclick=function(){input.click()};
  input.onchange=function(){if(input.files&&input.files[0])analyzeFile(input.files[0])};
  ['dragenter','dragover'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('drag')})});
  ['dragleave','drop'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('drag')})});
  drop.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)analyzeFile(f)});
 }
 async function analyzeFile(file){
  if(file.size>80*1024*1024){V.toast('Arquivo maior que 80 MB. Divida a importação.');return}
  var prev=document.getElementById('flowImportPreview');prev.innerHTML='<div class="empty">Lendo e validando '+esc(file.name)+'…</div>';
  try{
   var buffer=await file.arrayBuffer(),hash=await sha256(buffer),text=new TextDecoder('utf-8').decode(buffer),complete=document.getElementById('flowImportComplete').checked;
   if(!V.workerReady)throw new Error('O Web Worker precisa estar ativo para validar importações grandes com segurança.');
   var res=await V.rpc('PARSE_IMPORT',{name:file.name,text:text,complete:complete});
   pending={id:'imp_'+Date.now().toString(36),name:file.name,size:file.size,digest:hash,kind:res.kind,headers:res.headers||[],delimiter:res.delimiter||'',summary:res.summary,records:res.records||[],importedAt:new Date().toISOString(),active:true,complete:complete};
   renderImportPreview(pending,res.sample||[]);
  }catch(e){prev.innerHTML='<div class="routewarn bad"><b>Importação bloqueada.</b><br>'+esc(e.message||e)+'</div>';pending=null}
 }
 function renderImportPreview(im,sample){
  var s=im.summary||{},prev=document.getElementById('flowImportPreview'),safe=s.kind!=='unknown'&&s.kind!=='generic'&&s.valid>0;
  prev.innerHTML='<div class="card section"><div class="shead"><h3>Pré-validação</h3><span>'+esc(im.name)+'</span></div><div class="body"><div class="flow-grid4">'+
   stat('Tipo detectado',s.kind||im.kind,'blue')+stat('Válidos',fmt(s.valid||0),'ok')+stat('Novos',fmt(s.added||0),'ok')+stat('Alterados',fmt(s.changed||0),'warn')+
   stat('Iguais',fmt(s.same||0),'blue')+stat('Duplicados',fmt(s.duplicates||0),s.duplicates?'warn':'blue')+stat('Inválidos',fmt(s.invalid||0),s.invalid?'bad':'blue')+stat('Removidos',s.complete?fmt(s.removed||0):'não calculado',s.removed?'bad':'blue')+
   '</div><div class="flow-tip" style="margin-top:9px">SHA-256: '+esc(im.digest)+'<br>O PRISMA não executa HTML, scripts ou fórmulas importadas. Os valores são tratados como dados e escapados na interface.</div>'+
   '<div class="actions" style="margin-top:10px"><button id="flowCancelImport">Cancelar</button><button class="primary" id="flowConfirmImport" '+(safe?'':'disabled')+'>Confirmar overlay</button></div></div></div>'+
   '<div class="card section"><div class="shead"><h3>Amostra normalizada</h3><span>'+fmt(sample.length)+' registro(s)</span></div><div class="body flow-import-sample">'+sampleTable(sample)+'</div></div>';
  document.getElementById('flowCancelImport').onclick=function(){pending=null;renderUpdate()};
  if(safe)document.getElementById('flowConfirmImport').onclick=confirmImport;
 }
 function stat(a,b,c){return '<div class="flow-actioncard"><span class="flow-chip '+c+'">'+esc(a)+'</span><h4 style="margin-top:7px">'+esc(b)+'</h4></div>'}
 function sampleTable(sample){
  if(!sample.length)return '<div class="empty">Sem amostra.</div>';
  return '<table><thead><tr><th>Chave</th><th>Rótulo</th><th>Dados normalizados</th></tr></thead><tbody>'+sample.map(function(r){return '<tr><td class="mono">'+esc(r.key)+'</td><td>'+esc(r.label)+'</td><td class="msgtext">'+esc(JSON.stringify(r.data))+'</td></tr>'}).join('')+'</tbody></table>';
 }
 async function confirmImport(){
  if(!pending)return;var im=pending;pending=null;await DB.put('imports',im);V.overlays=await DB.all('imports');V.overlays=V.overlays.filter(function(x){return x.active!==false});await refreshOverlayIndex();V.log('importacao','Base importada: '+im.name,{importId:im.id,kind:im.kind,summary:im.summary});V.toast('Overlay ativado');renderUpdate()
 }
 function localOverlayRecords(imports){
  var out=[];(imports||[]).forEach(function(im){(im.records||[]).forEach(function(r,idx){var d=r.data||{},primary=r.label||r.key,secondary='';if(im.kind==='point')secondary=[d.address,d.area,d.square].filter(Boolean).join(' • ');if(im.kind==='machine')secondary=[d.pointCode,d.square,d.ip].filter(Boolean).join(' • ');out.push({t:im.kind==='point'?'point':im.kind==='machine'?'machine':im.kind==='ticket'?'ticket':im.kind==='message'?'message':'generic',i:-1,k:r.key,primary:primary,secondary:secondary,s:V.norm([r.key,primary,secondary,JSON.stringify(d)].join(' ')),overlay:true,importId:im.id,overlayIndex:idx})})});return out;
 }
 async function refreshOverlayIndex(){
  var all=await DB.all('imports');V.overlays=all.filter(function(x){return x.active!==false});
  if(V.workerReady)await V.rpc('OVERLAY_SET',{imports:V.overlays}).catch(function(){});
  V.fallbackRecords=(V.fallbackRecords||[]).filter(function(r){return !r.overlay}).concat(localOverlayRecords(V.overlays));
 }
 async function toggleImport(id){
  var im=await DB.get('imports',id);if(!im)return;im.active=im.active===false?true:false;await DB.put('imports',im);await refreshOverlayIndex();renderHealth();V.toast(im.active?'Overlay ativado':'Overlay desativado')
 }
 async function deleteImport(id){
  if(!confirm('Excluir esta importação local? Os arquivos originais do PRISMA não serão alterados.'))return;await DB.delete('imports',id);await refreshOverlayIndex();renderHealth();V.toast('Importação removida')
 }

 async function exportBackup(){
  var data=await DB.exportAll(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='PRISMA_FLOW_V11_BACKUP_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},600);V.log('backup','Backup FLOW exportado')
 }
 function importBackup(e){
  var f=e.target.files&&e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=async function(){try{var data=JSON.parse(rd.result);if(!data||data.product!=='PRISMA FLOW')throw new Error('Arquivo não é um backup PRISMA FLOW.');var replace=confirm('OK = substituir dados FLOW locais.\nCancelar = mesclar com os dados atuais.');await DB.importAll(data,replace);await refreshOverlayIndex();V.toast('Backup importado');renderHealth();V.log('backup','Backup FLOW importado',{replace:replace})}catch(x){alert('Backup inválido: '+(x.message||x))}};rd.readAsText(f)
 }

 V.openOverlay=async function(importId,index,kind){
  var im=await DB.get('imports',importId),r=im&&im.records&&im.records[index];if(!r){V.toast('Registro importado não encontrado');return}
  var d=r.data||{},core=null;
  if(kind==='point'||im.kind==='point'){var code=String(d.code||'');for(var i=0;i<P.length;i++)if(String(P[i][1]||'')===code){core=i;break}}
  var m=document.getElementById('flowModal'),b=document.getElementById('flowModalBack');
  m.innerHTML='<h3>Registro importado • '+esc(im.name)+'</h3><p class="flow-tip">Esta informação pertence ao overlay local da V11. A evidência estática do pacote original permanece intacta.</p><div class="fieldgrid" style="margin-top:9px">'+Object.keys(d).map(function(k){return '<div class="field"><label>'+esc(k)+'</label><div>'+esc(d[k])+'</div></div>'}).join('')+'</div><div class="actions" style="margin-top:10px"><button data-flow-modal-close>Fechar</button>'+(Number.isInteger(core)?'<button class="primary" data-flow-360="'+core+'">Abrir ponto 360º correspondente</button>':'')+'</div>';
  b.classList.add('open')
 };

 document.addEventListener('click',function(e){
  var b=e.target.closest('[data-flow-import-toggle],[data-flow-import-delete]');
  if(!b)return;
  if(b.dataset.flowImportToggle!=null)toggleImport(b.dataset.flowImportToggle);
  if(b.dataset.flowImportDelete!=null)deleteImport(b.dataset.flowImportDelete);
 });

 V.renderHealth=renderHealth;V.renderUpdate=renderUpdate;V.refreshOverlayIndex=refreshOverlayIndex;V.exportBackup=exportBackup;
 V.registerPage('flowHealth',renderHealth);V.registerPage('flowUpdate',renderUpdate);
 refreshOverlayIndex().catch(function(){});
}
if(window.PRISMA_V11&&window.PRISMA_V11.ready)start();else document.addEventListener('prisma-v11-ready',start,{once:true});
})();