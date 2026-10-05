(function(){
'use strict';

var N8 = {
  version: '8.0.0-ultimate',
  state: 'idle',
  enginePromise: null,
  engine: null,
  selectedGroup: null,
  feedbackKey: 'eletromidia_route_feedback_v8',
  lastGroupKey: 'eletromidia_router_last_group_v8',
  feedback: {positive:{},negative:{}},
  builtInConfirmed: [
    ['elt rp','manutencao iguatemi elt'],
    ['manutencao iguatemi elt','elt rp']
  ]
};

function n8Esc(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function n8Norm(v){
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').trim();
}
function n8Compact(v){ return n8Norm(v).replace(/[^a-z0-9]+/g,''); }
function n8Fmt(v){ return Number(v || 0).toLocaleString('pt-BR'); }
function n8Clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function n8Now(){ return Date.now(); }
function n8DataReady(){
  try{
    return typeof WA !== 'undefined' && WA && Array.isArray(WA.messages) && Array.isArray(WA.groups) && WA.messages.length > 0;
  }catch(e){ return false; }
}
function n8SafeStorageGet(k, fallback){
  try{
    var x = JSON.parse(localStorage.getItem(k) || '');
    return x && typeof x === 'object' ? x : fallback;
  }catch(e){ return fallback; }
}
function n8SafeStorageSet(k,v){
  try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){}
}
function n8Toast(s){
  try{
    if(typeof toast === 'function'){ toast(s); return; }
  }catch(e){}
  var t=document.getElementById('noc8Toast');
  if(!t){t=document.createElement('div');t.id='noc8Toast';t.className='noc8-toast';document.body.appendChild(t);}
  t.textContent=s;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},1600);
}
function n8Copy(text){
  function fallback(){
    var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');n8Toast('Copiado');}catch(e){prompt('Copie:',text);}
    ta.remove();
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){n8Toast('Copiado');}).catch(fallback);
  }else fallback();
}
function n8Yield(){ return new Promise(function(resolve){ setTimeout(resolve,0); }); }

var N8_STOP = new Set([
  'a','o','os','as','um','uma','uns','umas','de','da','do','das','dos','e','ou','em','no','na','nos','nas',
  'por','para','pra','pro','com','sem','que','qual','quais','como','quando','onde','se','ao','aos','ate','até',
  'esse','essa','isso','isto','aquele','aquela','aqui','ali','la','lá','ja','já','mais','menos','muito','muita',
  'bom','boa','dia','tarde','noite','pessoal','galera','favor','pf','porfavor','obrigado','obrigada','valeu',
  'mano','gente','pode','podem','vamos','vou','vai','foi','esta','está','estao','estão','ser','ter','tem','tinha',
  'ele','ela','eles','elas','me','te','nos','lhe','meu','minha','seu','sua','nosso','nossa','dois','duas'
]);
var N8_GENERIC = [
  /^bom dia[.! ]*$/i,/^boa tarde[.! ]*$/i,/^boa noite[.! ]*$/i,/^obrigad[oa][.! ]*$/i,/^valeu[.! ]*$/i,
  /^ok[.! ]*$/i,/^blz[.! ]*$/i,/^beleza[.! ]*$/i,/^vamos verificar[.! ]*$/i,/^vou verificar[.! ]*$/i,
  /^verificando[.! ]*$/i,/^de volta[.! ]*$/i,/^restabelecido[.! ]*$/i,/^normalizado[.! ]*$/i
];
function n8Tokens(text){
  var s=n8Norm(text).replace(/https?:\/\/\S+/g,' ').replace(/[^a-z0-9_-]+/g,' ');
  var a=s.split(/\s+/).filter(Boolean), out=[], seen=new Set();
  for(var i=0;i<a.length;i++){
    var t=a[i];
    if(t.length<3 && !/^\d+$/.test(t)) continue;
    if(N8_STOP.has(t)) continue;
    if(!seen.has(t)){ seen.add(t); out.push(t); }
  }
  return out;
}
function n8Meaningful(text,tokens){
  var s=n8Norm(text);
  if(s.length<10) return false;
  for(var i=0;i<N8_GENERIC.length;i++) if(N8_GENERIC[i].test(s)) return false;
  return tokens.length>=2 || /\d{4,}/.test(s);
}
function n8Jaccard(a,b){
  if(!a || !b || !a.size || !b.size) return 0;
  var small=a.size<=b.size?a:b, big=a.size<=b.size?b:a, inter=0;
  small.forEach(function(x){if(big.has(x))inter++;});
  var union=a.size+b.size-inter;
  return union?inter/union:0;
}
function n8Containment(a,b){
  if(!a || !b || !a.size || !b.size) return 0;
  var small=a.size<=b.size?a:b, big=a.size<=b.size?b:a, inter=0;
  small.forEach(function(x){if(big.has(x))inter++;});
  return small.size?inter/small.size:0;
}
function n8TextSimilarity(meta, queryTokens){
  if(!meta || !queryTokens || !queryTokens.length) return 0;
  var q=new Set(queryTokens), j=n8Jaccard(meta.tokenSet,q), c=n8Containment(meta.tokenSet,q);
  return Math.max(j,c*0.9);
}
function n8ParseTs(m,i){
  var n=Number(m && m[1]);
  if(Number.isFinite(n) && n>1000000000000) return n;
  if(Number.isFinite(n) && n>1000000000) return n*1000;
  var d=String(m && m[2] || ''), h=String(m && m[3] || '');
  var dm=d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/), hm=h.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(dm){
    var hh=hm?Number(hm[1]):0, mm=hm?Number(hm[2]):0, ss=hm&&hm[3]?Number(hm[3]):0;
    return Date.UTC(Number(dm[3]),Number(dm[2])-1,Number(dm[1]),hh,mm,ss);
  }
  return i;
}
function n8FmtDelta(ms){
  ms=Math.abs(Number(ms)||0);
  var min=Math.round(ms/60000);
  if(min<1) return '<1 min';
  if(min<60) return min+' min';
  var h=Math.floor(min/60), r=min%60;
  if(h<48) return h+'h'+(r?(' '+r+'min'):'');
  return Math.floor(h/24)+' dia(s)';
}

var N8_TOPICS = [
  {id:'MIDIA_CONTEUDO',label:'Mídia / conteúdo',rx:/\b(sem midia|sem mídia|midia|mídia|conteudo|conteúdo|campanha|loop|grade|player|veiculacao|veiculação|criativo)\b/i},
  {id:'OFFLINE_DESLIGADO',label:'Offline / desligado',rx:/\b(offline|off line|desligad[oa]|fora do ar|sem sinal|inoperante|apagou|apagada|apagado|nao liga|não liga)\b/i},
  {id:'HARDWARE_TELA',label:'Hardware / tela',rx:/\b(tela quebrad|display|monitor|modulo|módulo|fonte|placa|hardware|avaria|trincad|queimad|led|painel)\b/i},
  {id:'ENERGIA',label:'Energia',rx:/\b(energia|eletric|disjuntor|tomada|alimentacao|alimentação|sem energia|queda de energia)\b/i},
  {id:'REDE_CONECTIVIDADE',label:'Rede / conectividade',rx:/\b(internet|modem|roteador|router|4g|5g|rede|conexao|conexão|conectividade|ping|chip|simcard|sim card|vpn)\b/i},
  {id:'ACESSO',label:'Acesso / liberação',rx:/\b(acesso|chave|portaria|autoriz|liberar|liberacao|liberação|entrada|credencial)\b/i},
  {id:'ATIVACAO',label:'Ativação / instalação',rx:/\b(ativacao|ativação|instalacao|instalação|implantacao|implantação|novo ponto|nova tela|instalar)\b/i},
  {id:'CONFIGURACAO',label:'Configuração / ajuste',rx:/\b(configur|resolucao|resolução|orientacao|orientação|sincron|ajuste|ajustar|rotacao|rotação|invertid|parametr)\b/i},
  {id:'ATIVO_TROCA',label:'Ativo / troca',rx:/\b(troca|trocar|substitu|removido|retirado|instalado|ativo|patrimonio|patrimônio|equipamento novo)\b/i},
  {id:'CHAMADO',label:'Chamado / ticket',rx:/\b(chamado|ticket|hubspot|ordem de servico|ordem de serviço|os nº|os n)\b/i},
  {id:'MANUTENCAO',label:'Manutenção / visita',rx:/\b(manutencao|manutenção|tecnico|técnico|reparo|visita|deslocamento|atendimento em campo)\b/i}
];
function n8Topic(text){
  var s=n8Norm(text);
  for(var i=0;i<N8_TOPICS.length;i++) if(N8_TOPICS[i].rx.test(s)) return N8_TOPICS[i].id;
  return 'OUTROS';
}
function n8TopicLabel(id){
  if(id==='OUTROS') return 'Outros / não classificado';
  for(var i=0;i<N8_TOPICS.length;i++) if(N8_TOPICS[i].id===id) return N8_TOPICS[i].label;
  return id;
}
function n8TopicOptions(){
  var h='<option value="AUTO">Problema: detectar automaticamente</option>';
  for(var i=0;i<N8_TOPICS.length;i++) h+='<option value="'+N8_TOPICS[i].id+'">'+n8Esc(N8_TOPICS[i].label)+'</option>';
  h+='<option value="OUTROS">Outros / não classificado</option>';
  return h;
}
function n8FieldTopic(topic){
  return topic==='HARDWARE_TELA'||topic==='ENERGIA'||topic==='ATIVO_TROCA'||topic==='MANUTENCAO';
}
function n8RemoteFriendly(topic){
  return topic==='MIDIA_CONTEUDO'||topic==='CONFIGURACAO'||topic==='REDE_CONECTIVIDADE'||topic==='OFFLINE_DESLIGADO';
}
function n8HasResolution(text){
  return /\b(restabelecid|normalizad|voltou|de volta|resolvid|online|funcionando|ajustad|corrigid|reiniciad|reboot|sincronizad|atualizad|forcad[ao]|subiu|comunicando|operacional)\b/i.test(n8Norm(text));
}
function n8HasFieldSignal(text){
  return /\b(tecnico|técnico|visita|desloc|no local|troca|substitu|manutencao|manutenção|reparo|modulo|módulo|fonte|cabo|hardware)\b/i.test(n8Norm(text));
}

var N8_REASON_LABEL = {
  quote_cross_group:'mensagem citada entre grupos',
  same_media:'mesma mídia',
  same_ticket:'mesmo chamado/ticket',
  exact_text:'mesmo texto',
  same_asset:'mesmo ativo/patrimônio',
  near_text:'texto muito semelhante',
  same_machine_topic:'mesma máquina + mesmo problema',
  same_point_topic:'mesmo ponto + mesmo problema',
  operator_confirmed:'rota confirmada pelo operador'
};
function n8ReasonLabel(r){ return N8_REASON_LABEL[r] || r; }
function n8ConfRank(c){ return c==='CONFIRMADA'?4:c==='ALTA'?3:c==='MEDIA'?2:1; }
function n8ConfClass(c){ return c==='CONFIRMADA'?'confirmed':c==='ALTA'?'high':c==='MEDIA'?'medium':'hint'; }

function n8LoadFeedback(){
  var f=n8SafeStorageGet(N8.feedbackKey,{positive:{},negative:{}});
  if(!f.positive)f.positive={};if(!f.negative)f.negative={};
  N8.feedback=f;
}
function n8RouteKey(a,b){ return String(a)+'>'+String(b); }
function n8Feedback(a,b){
  var k=n8RouteKey(a,b);
  return {positive:N8.feedback.positive[k]||null,negative:N8.feedback.negative[k]||null};
}
function n8SetFeedback(a,b,type){
  var k=n8RouteKey(a,b);
  if(type==='positive'){
    N8.feedback.positive[k]={at:new Date().toISOString(),count:((N8.feedback.positive[k]&&N8.feedback.positive[k].count)||0)+1};
    delete N8.feedback.negative[k];
  }else if(type==='negative'){
    N8.feedback.negative[k]={at:new Date().toISOString(),count:((N8.feedback.negative[k]&&N8.feedback.negative[k].count)||0)+1};
    delete N8.feedback.positive[k];
  }else{
    delete N8.feedback.positive[k];delete N8.feedback.negative[k];
  }
  n8SafeStorageSet(N8.feedbackKey,N8.feedback);
  if(N8.engine){n8FinalizeRoutes(N8.engine);n8RefreshCurrentViews();}
}

function n8Styles(){
  if(document.getElementById('noc8Styles')) return;
  var s=document.createElement('style');s.id='noc8Styles';
  s.textContent=
  '.noc8-hero{border:1px solid #623019;background:linear-gradient(180deg,#15100d,#0e1013);border-radius:13px;padding:14px;margin-bottom:12px}'+
  '.noc8-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.noc8-title h3{margin:0;font-size:18px}.noc8-title h3 b{color:#ff5a13}.noc8-title p{margin:5px 0 0;color:#9ca3ad;font-size:10px;line-height:1.45}'+
  '.noc8-grid{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:9px;margin-top:12px}.noc8-grid textarea{width:100%;min-height:115px}.noc8-stack{display:flex;flex-direction:column;gap:7px}.noc8-stack select,.noc8-stack input{width:100%}'+
  '.noc8-primary{background:#ff5a13!important;border-color:#ff5a13!important;color:#fff!important;font-weight:800!important}.noc8-wide{width:100%}.noc8-note{font-size:9px;color:#858c96;line-height:1.45;margin-top:6px}'+
  '.noc8-result{margin-top:12px}.noc8-decision{border:1px solid #30343b;background:#0c0f12;border-radius:12px;padding:13px}.noc8-decision.confirmed{border-color:#267147;background:#0b1711}.noc8-decision.high{border-color:#315e4a}.noc8-decision.medium{border-color:#6c5725}.noc8-decision.hint{border-color:#693037}'+
  '.noc8-decision-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.noc8-decision-head small{font-size:8px;color:#8a929d;text-transform:uppercase;letter-spacing:.08em}.noc8-decision-head h3{margin:4px 0 0;font-size:20px;color:#ff6a28}.noc8-badge{display:inline-block;border:1px solid #454a52;border-radius:999px;padding:3px 7px;font-size:8px;font-weight:800}.noc8-badge.confirmed{color:#79e9b0;border-color:#2b7850}.noc8-badge.high{color:#9ee9c2;border-color:#35674f}.noc8-badge.medium{color:#ffd478;border-color:#6d5827}.noc8-badge.hint{color:#ff9ca1;border-color:#76343a}'+
  '.noc8-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.noc8-why{margin:10px 0 0;padding-left:18px;color:#d4d8dd;font-size:10px;line-height:1.55}.noc8-warn{border:1px solid #6d5725;background:#211b0d;color:#ffd478;border-radius:8px;padding:8px 10px;font-size:9px;margin-top:8px}.noc8-danger{border-color:#703036;background:#211013;color:#ff9ba0}.noc8-ok{border-color:#286b49;background:#0d1c14;color:#7ce8b2}'+
  '.noc8-flow{display:grid;grid-template-columns:1fr 44px 1fr 44px 1fr;gap:7px;align-items:stretch;margin-top:9px}.noc8-flowbox{border:1px solid #30343b;background:#0d1014;border-radius:9px;padding:10px;text-align:center;min-height:70px}.noc8-flowbox b{display:block;font-size:10px}.noc8-flowbox span{display:block;font-size:8px;color:#8e959f;margin-top:5px}.noc8-arrow{display:flex;align-items:center;justify-content:center;color:#ff5a13;font-size:19px}'+
  '.noc8-route-search{display:grid;grid-template-columns:minmax(220px,1fr) 150px 150px;gap:8px}.noc8-suggestions{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.noc8-suggestion{background:#14181d;border:1px solid #343941;color:#dce0e5;border-radius:999px;padding:5px 8px;font-size:9px;cursor:pointer}.noc8-suggestion:hover{border-color:#ff5a13}'+
  '.noc8-map{display:grid;grid-template-columns:minmax(0,1fr) 230px minmax(0,1fr);gap:10px;align-items:start;margin-top:12px}.noc8-mapcol{border:1px solid #30343b;background:#0d1014;border-radius:11px;overflow:hidden}.noc8-maphead{padding:9px 11px;background:#171a1f;border-bottom:1px solid #30343b;font-size:10px;font-weight:800}.noc8-center{border-color:#6a341d}.noc8-center .noc8-maphead{background:#1d120d;color:#ff8a55}.noc8-groupcenter{padding:18px 12px;text-align:center}.noc8-groupcenter strong{font-size:15px}.noc8-groupcenter small{display:block;color:#8f96a0;font-size:8px;margin-top:5px}'+
  '.noc8-route-card{padding:10px;border-bottom:1px solid #252a30;cursor:pointer}.noc8-route-card:last-child{border-bottom:0}.noc8-route-card:hover{background:#15191e}.noc8-rh{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.noc8-rh strong{font-size:10.5px}.noc8-rmeta{font-size:8px;color:#8d949e;margin-top:4px;line-height:1.45}.noc8-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.noc8-chip{border:1px solid #3a4048;border-radius:999px;padding:2px 5px;font-size:7.5px;color:#c7ccd2}.noc8-chip.orange{border-color:#6c351e;color:#ff9d72}.noc8-chip.green{border-color:#286b49;color:#7ce8b2}'+
  '.noc8-route-list{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.noc8-route-panel{border:1px solid #30343b;background:#0d1014;border-radius:11px;overflow:hidden}.noc8-route-panel h4{margin:0;padding:10px 12px;background:#171a1f;border-bottom:1px solid #30343b;font-size:11px}.noc8-empty{padding:24px;text-align:center;color:#858c96;font-size:10px}.noc8-statline{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'+
  '.noc8-modalback{display:none;position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:260;align-items:center;justify-content:center;padding:18px}.noc8-modalback.open{display:flex}.noc8-modal{width:min(1180px,98vw);max-height:92vh;overflow:auto;background:#0b0e11;border:1px solid #393e46;border-radius:13px;box-shadow:0 30px 90px #000}.noc8-modtop{position:sticky;top:0;z-index:3;background:#111419;border-bottom:1px solid #30343b;padding:11px 13px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.noc8-modtop h3{margin:0;font-size:15px}.noc8-modtop p{margin:4px 0 0;color:#8f96a0;font-size:9px}.noc8-modbody{padding:12px}'+
  '.noc8-proof{border:1px solid #2d3239;background:#0d1014;border-radius:10px;margin-bottom:8px;overflow:hidden}.noc8-proofhead{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:7px 9px;background:#15191e;border-bottom:1px solid #292e35;font-size:8px;color:#a2a9b2}.noc8-proofgrid{display:grid;grid-template-columns:1fr 64px 1fr;gap:7px;padding:9px}.noc8-msg{border:1px solid #292e35;background:#111419;border-radius:8px;padding:8px;min-width:0}.noc8-msg b{font-size:9px}.noc8-msg small{display:block;color:#8b929c;font-size:7.5px;margin-top:2px}.noc8-msg div{white-space:pre-wrap;font-size:9.5px;line-height:1.42;margin-top:6px;word-break:break-word}.noc8-proofarrow{display:flex;align-items:center;justify-content:center;text-align:center;color:#ff6a28;font-size:9px;font-weight:800}'+
  '.noc8-audit{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:10px}.noc8-kpi{border:1px solid #30343b;background:#0d1014;border-radius:9px;padding:9px}.noc8-kpi b{display:block;font-size:17px}.noc8-kpi span{display:block;color:#858c96;font-size:7.5px;margin-top:2px}.noc8-toast{display:none;position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:400;background:#20242a;border:1px solid #464b53;border-radius:8px;padding:8px 12px;font-size:10px}.noc8-toast.show{display:block}'+
  '@media(max-width:980px){.noc8-grid,.noc8-map,.noc8-route-list{grid-template-columns:1fr}.noc8-flow{grid-template-columns:1fr}.noc8-arrow{transform:rotate(90deg)}.noc8-proofgrid{grid-template-columns:1fr}.noc8-proofarrow{padding:4px}.noc8-audit{grid-template-columns:1fr 1fr}.noc8-route-search{grid-template-columns:1fr}}';
  document.head.appendChild(s);
}

function n8RouterHtml(){
  return '<div class="noc8-hero">'+
    '<div class="noc8-title"><div><h3>PARA ONDE EU MANDO <b>ISSO?</b></h3>'+
    '<p>Primeiro o sistema usa o grupo onde a reclamação chegou. Depois cruza as rotas reais de saída daquele grupo, o problema, entidades e evidências históricas. Palavra genérica sozinha não escolhe destino.</p></div>'+
    '<span class="noc8-badge confirmed">Roteador NOC v8</span></div>'+
    '<div class="noc8-grid"><div><textarea id="noc8Text" placeholder="Cole a mensagem do cliente/segurança. Pode usar também código, máquina, ponto, shopping, chamado ou qualquer trecho. Deixe vazio para ver apenas para onde este grupo costuma encaminhar."></textarea>'+
    '<div class="noc8-note"><b>Importante:</b> se o texto estiver vazio, o sistema mostra as rotas históricas de saída do grupo. Se houver texto, ele usa o conteúdo para priorizar a rota e avaliar remoto x campo.</div></div>'+
    '<div class="noc8-stack"><select id="noc8Origin"><option value="">Grupo onde a mensagem CHEGOU…</option></select>'+
    '<select id="noc8Problem">'+n8TopicOptions()+'</select>'+
    '<button id="noc8Analyze" class="noc8-primary noc8-wide">ANALISAR ROTA</button>'+
    '<button id="noc8SeeRoutes" class="noc8-wide">Ver todas as rotas deste grupo</button></div></div>'+
    '<div id="noc8RouterStatus" class="noc8-note">Carregando mapa histórico de rotas…</div>'+
    '<div id="noc8RouterResult" class="noc8-result"></div></div>';
}
function n8RoutesHtml(){
  return '<div class="card section"><div class="shead"><h3>ROTAS DOS GRUPOS</h3><span>de onde chega ← grupo → para onde vai</span></div>'+
    '<div class="body"><div class="noc8-route-search"><input id="noc8GroupQuery" placeholder="Digite qualquer grupo: ELT-RP, Manutenção, Shopping…">'+
    '<select id="noc8ConfFilter"><option value="ALL">Todas as evidências</option><option value="HIGH">Confirmada + Alta</option><option value="MEDIUM">Média ou melhor</option><option value="HINT">Incluir indícios</option></select>'+
    '<select id="noc8TopicFilter"><option value="ALL">Todos os problemas</option>'+N8_TOPICS.map(function(t){return '<option value="'+t.id+'">'+n8Esc(t.label)+'</option>';}).join('')+'<option value="OUTROS">Outros</option></select></div>'+
    '<div id="noc8Suggestions" class="noc8-suggestions"></div>'+
    '<div id="noc8GroupStatus" class="noc8-note">Digite o nome de qualquer grupo. O sistema mostra rotas direcionais comprovadas ou inferidas do histórico.</div>'+
    '<div id="noc8GroupMap"></div>'+
    '<div id="noc8Audit" class="noc8-audit"></div></div></div>';
}
function n8InstallShell(){
  n8Styles();
  var main=document.querySelector('.main')||document.querySelector('main');
  if(!main) return false;
  var router=document.getElementById('router');
  if(!router){
    var pages=Array.prototype.slice.call(document.querySelectorAll('.page'));
    router=pages.find(function(x){return /para onde eu mando/i.test(x.textContent||'')||/router/i.test(x.id||'');});
  }
  if(!router){
    router=document.createElement('section');router.id='router';router.className='page';main.appendChild(router);
  }
  router.innerHTML=n8RouterHtml();

  var routes=document.getElementById('groupRoutes');
  if(!routes){routes=document.createElement('section');routes.id='groupRoutes';routes.className='page';main.appendChild(routes);}
  routes.innerHTML=n8RoutesHtml();

  var navs=Array.prototype.slice.call(document.querySelectorAll('.navbtn[data-page]'));
  var routerNav=navs.find(function(b){return b.dataset.page==='router'||/roteador/i.test(b.textContent||'');});
  if(!routerNav){
    var groupsNav=navs.find(function(b){return b.dataset.page==='groups';});
    routerNav=document.createElement('button');routerNav.className='navbtn';routerNav.dataset.page='router';routerNav.textContent='Roteador NOC';
    if(groupsNav && groupsNav.parentNode) groupsNav.parentNode.insertBefore(routerNav,groupsNav);
    else{
      var ng=document.querySelector('.navgroup');if(ng)ng.appendChild(routerNav);
    }
  }else{
    routerNav.dataset.page='router';routerNav.textContent='Roteador NOC';
  }
  var routeNav=navs.find(function(b){return b.dataset.page==='groupRoutes';});
  if(!routeNav){
    routeNav=document.createElement('button');routeNav.className='navbtn';routeNav.dataset.page='groupRoutes';routeNav.textContent='Rotas dos Grupos';
    if(routerNav.parentNode) routerNav.parentNode.insertBefore(routeNav,routerNav.nextSibling);
  }
  function activate(id){
    document.querySelectorAll('.page').forEach(function(x){x.classList.toggle('active',x.id===id);});
    document.querySelectorAll('.navbtn[data-page]').forEach(function(x){x.classList.toggle('active',x.dataset.page===id);});
    if(id==='router') n8EnsureEngine().then(n8RenderRouterHome);
    if(id==='groupRoutes') n8EnsureEngine().then(function(){n8RenderAudit();if(N8.selectedGroup!=null)n8RenderGroupMap(N8.selectedGroup);});
  }
  routerNav.onclick=function(e){e.preventDefault();activate('router');};
  routeNav.onclick=function(e){e.preventDefault();activate('groupRoutes');};

  if(!document.getElementById('noc8Modal')){
    var mb=document.createElement('div');mb.id='noc8Modal';mb.className='noc8-modalback';
    mb.innerHTML='<div class="noc8-modal"><div class="noc8-modtop"><div><h3 id="noc8ModalTitle"></h3><p id="noc8ModalSub"></p></div><button id="noc8ModalClose">Fechar</button></div><div id="noc8ModalBody" class="noc8-modbody"></div></div>';
    document.body.appendChild(mb);
    document.getElementById('noc8ModalClose').onclick=function(){mb.classList.remove('open');};
    mb.addEventListener('click',function(e){if(e.target===mb)mb.classList.remove('open');});
  }

  document.getElementById('noc8Analyze').onclick=n8AnalyzeRouter;
  document.getElementById('noc8SeeRoutes').onclick=function(){
    var g=Number(document.getElementById('noc8Origin').value);
    if(!Number.isInteger(g)){n8Toast('Escolha o grupo de origem');return;}
    N8.selectedGroup=g;activate('groupRoutes');n8SetGroupQuery(g);
  };
  document.getElementById('noc8Origin').onchange=function(){
    var g=Number(this.value);if(Number.isInteger(g)){N8.selectedGroup=g;n8SafeStorageSet(N8.lastGroupKey,{g:g});}
  };
  document.getElementById('noc8GroupQuery').addEventListener('input',n8GroupSuggest);
  document.getElementById('noc8GroupQuery').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();n8PickGroupFromQuery();}});
  document.getElementById('noc8ConfFilter').onchange=function(){if(N8.selectedGroup!=null)n8RenderGroupMap(N8.selectedGroup);};
  document.getElementById('noc8TopicFilter').onchange=function(){if(N8.selectedGroup!=null)n8RenderGroupMap(N8.selectedGroup);};
  document.getElementById('noc8ModalBody').addEventListener('click',n8ModalClick);
  routes.addEventListener('click',n8RoutesClick);
  router.addEventListener('click',n8RouterClick);
  return true;
}

function n8WaitData(){
  return new Promise(function(resolve,reject){
    var start=n8Now(), timer=setInterval(function(){
      if(n8DataReady()){clearInterval(timer);resolve();}
      else if(n8Now()-start>30000){clearInterval(timer);reject(new Error('Base do WhatsApp não carregou em 30s.')); }
    },120);
  });
}
function n8FillGroups(){
  var origin=document.getElementById('noc8Origin');if(!origin||!n8DataReady())return;
  var arr=WA.groups.map(function(g,i){return {i:i,name:g.name||('Grupo '+i)};}).sort(function(a,b){return a.name.localeCompare(b.name,'pt-BR');});
  origin.innerHTML='<option value="">Grupo onde a mensagem CHEGOU…</option>'+arr.map(function(x){return '<option value="'+x.i+'">'+n8Esc(x.name)+'</option>';}).join('');
  var last=n8SafeStorageGet(N8.lastGroupKey,{});
  if(Number.isInteger(last.g)&&WA.groups[last.g]){origin.value=String(last.g);N8.selectedGroup=last.g;}
}

function n8MessageMeta(){
  var metas=new Array(WA.messages.length), tokenDf=new Map(), eventMap=new Map(), i,j;
  if(Array.isArray(WA.events)){
    for(i=0;i<WA.events.length;i++){
      var e=WA.events[i], mi=Number(e.m);
      if(!Number.isInteger(mi)||mi<0||mi>=WA.messages.length)continue;
      var rec=eventMap.get(mi);if(!rec){rec={tickets:new Set(),assets:new Set()};eventMap.set(mi,rec);}
      (e.tickets||[]).forEach(function(x){if(x!=null&&String(x).trim())rec.tickets.add(String(x).trim());});
      ['oldAssets','newAssets','outAssets','inAssets','assets'].forEach(function(k){(e[k]||[]).forEach(function(x){if(x!=null&&String(x).trim())rec.assets.add(String(x).trim());});});
    }
  }
  for(i=0;i<WA.messages.length;i++){
    var m=WA.messages[i]||[], text=String(m[6]||''), toks=n8Tokens(text), set=new Set(toks);
    set.forEach(function(t){tokenDf.set(t,(tokenDf.get(t)||0)+1);});
    var med=[];
    (m[14]||[]).forEach(function(mm){
      if(mm&&mm[0]&&(!mm[7]||mm[7]==='captured')) med.push(String(mm[0])+String(mm[1]||''));
    });
    med=Array.from(new Set(med));
    var pts=[],mac=[];
    (m[17]||[]).forEach(function(x){if(x&&Number.isInteger(Number(x[0])))pts.push(Number(x[0]));});
    (m[18]||[]).forEach(function(x){if(x&&Number.isInteger(Number(x[0])))mac.push(Number(x[0]));});
    var ev=eventMap.get(i)||{tickets:new Set(),assets:new Set()};
    metas[i]={
      i:i,id:String(m[0]||i),g:Number(m[4]),ts:n8ParseTs(m,i),date:String(m[2]||''),time:String(m[3]||''),
      author:String(m[5]||''),text:text,nt:n8Norm(text),tokens:toks,tokenSet:set,meaningful:n8Meaningful(text,toks),
      topic:n8Topic(text),media:med,points:Array.from(new Set(pts)),machines:Array.from(new Set(mac)),
      tickets:Array.from(ev.tickets),assets:Array.from(ev.assets),quoteId:m[11]?String(m[11]):''
    };
  }
  return {metas:metas,tokenDf:tokenDf};
}
function n8IndexPush(map,key,i){
  if(key==null||key==='')return;
  var a=map.get(key);if(!a){a=[];map.set(key,a);}a.push(i);
}
function n8PairNearest(list, metas, windowMs, cb, maxBack){
  list.sort(function(a,b){return metas[a].ts-metas[b].ts||a-b;});
  maxBack=maxBack||24;
  for(var x=1;x<list.length;x++){
    var bi=list[x], bm=metas[bi], seen=0;
    for(var y=x-1;y>=0&&seen<maxBack;y--,seen++){
      var ai=list[y], am=metas[ai], d=bm.ts-am.ts;
      if(d<0)continue;
      if(d>windowMs)break;
      if(am.g===bm.g)continue;
      cb(ai,bi,d);
      break;
    }
  }
}
function n8AddPair(engine,src,dst,reason,score,anchor,detail,directed){
  if(src===dst)return;
  var a=engine.metas[src],b=engine.metas[dst];if(!a||!b||a.g===b.g)return;
  if(!directed && a.ts>b.ts){var z=src;src=dst;dst=z;a=engine.metas[src];b=engine.metas[dst];}
  var key=src+'>'+dst,p=engine.pairs.get(key);
  if(!p){p={src:src,dst:dst,sg:a.g,dg:b.g,reasonScores:{},anchors:new Set(),details:[],score:0,reasons:[]};engine.pairs.set(key,p);}
  p.reasonScores[reason]=Math.max(p.reasonScores[reason]||0,score);
  if(anchor)p.anchors.add(anchor);
  if(detail&&p.details.indexOf(detail)<0)p.details.push(detail);
}
function n8BroadcastLike(list,metas){
  if(list.length<4)return false;
  var groups=new Set(),min=Infinity,max=-Infinity,authors=new Map();
  for(var i=0;i<list.length;i++){
    var m=metas[list[i]];groups.add(m.g);min=Math.min(min,m.ts);max=Math.max(max,m.ts);authors.set(n8Norm(m.author),(authors.get(n8Norm(m.author))||0)+1);
  }
  return groups.size>=3 && max-min<=5*60000;
}
function n8FinalizePairs(engine){
  engine.pairs.forEach(function(p,k){
    var vals=Object.keys(p.reasonScores).map(function(r){return p.reasonScores[r];}).sort(function(a,b){return b-a;});
    p.reasons=Object.keys(p.reasonScores).sort(function(a,b){return p.reasonScores[b]-p.reasonScores[a];});
    p.score=n8Clamp((vals[0]||0)+Math.min(18,Math.max(0,vals.length-1)*7),0,100);
    if(p.score<65 && p.reasons.length<2)engine.pairs.delete(k);
  });
}
function n8AnchorForPair(p,engine){
  var a=Array.from(p.anchors);
  var order=['ticket:','media:','asset:','machine:','point:','text:','near:'];
  for(var oi=0;oi<order.length;oi++){
    for(var i=0;i<a.length;i++)if(a[i].indexOf(order[oi])===0)return a[i];
  }
  return 'msg:'+engine.metas[p.src].id;
}
function n8Confidence(route){
  var fb=n8Feedback(route.sg,route.dg);
  if(fb.negative)return 'SUPRIMIDA';
  if(route.manualBuiltIn||fb.positive)return 'CONFIRMADA';
  var c=route.cases,strong=route.strong,avg=route.avgScore,cor=route.corroborated;
  if(strong>=3||(strong>=2&&c>=3)||(c>=5&&avg>=75))return 'CONFIRMADA';
  if(strong>=2||(c>=3&&avg>=68)||(cor>=3&&c>=3))return 'ALTA';
  if(c>=2&&avg>=58)return 'MEDIA';
  return 'INDICIO';
}
function n8FinalizeRoutes(engine){
  var routes=new Map();
  engine.pairs.forEach(function(p){
    var rk=n8RouteKey(p.sg,p.dg),r=routes.get(rk);
    if(!r){r={sg:p.sg,dg:p.dg,occ:new Map(),manualBuiltIn:false};routes.set(rk,r);}
    var anchor=n8AnchorForPair(p,engine),bucket=Math.floor(engine.metas[p.src].ts/(30*60000));
    var ok=anchor+'|'+bucket,prev=r.occ.get(ok);
    if(!prev||p.score>prev.score)r.occ.set(ok,p);
  });

  for(var bi=0;bi<N8.builtInConfirmed.length;bi++){
    var pair=N8.builtInConfirmed[bi],sg=n8FindGroupByTokens(pair[0]),dg=n8FindGroupByTokens(pair[1]);
    if(sg==null||dg==null||sg===dg)continue;
    var brk=n8RouteKey(sg,dg),br=routes.get(brk);
    if(!br){br={sg:sg,dg:dg,occ:new Map(),manualBuiltIn:true};routes.set(brk,br);}else br.manualBuiltIn=true;
  }

  var out=new Map(),inc=new Map(),list=[];
  routes.forEach(function(r){
    r.occurrences=Array.from(r.occ.values()).sort(function(a,b){return b.score-a.score;});
    r.cases=r.occurrences.length+(r.manualBuiltIn&&r.occurrences.length===0?1:0);
    r.strong=r.occurrences.filter(function(p){return p.score>=85||p.reasons.indexOf('quote_cross_group')>=0||p.reasons.indexOf('same_media')>=0||p.reasons.indexOf('same_ticket')>=0||p.reasons.indexOf('exact_text')>=0;}).length+(r.manualBuiltIn?1:0);
    r.corroborated=r.occurrences.filter(function(p){return p.reasons.length>=2;}).length;
    r.avgScore=r.occurrences.length?r.occurrences.reduce(function(s,p){return s+p.score;},0)/r.occurrences.length:(r.manualBuiltIn?100:0);
    r.topics={};r.reasons={};
    r.occurrences.forEach(function(p){
      var t=engine.metas[p.src].topic;r.topics[t]=(r.topics[t]||0)+1;
      p.reasons.forEach(function(x){r.reasons[x]=(r.reasons[x]||0)+1;});
    });
    if(r.manualBuiltIn)r.reasons.operator_confirmed=(r.reasons.operator_confirmed||0)+1;
    r.confidence=n8Confidence(r);
    r.suppressed=r.confidence==='SUPRIMIDA';
    list.push(r);
    if(!out.has(r.sg))out.set(r.sg,[]);out.get(r.sg).push(r);
    if(!inc.has(r.dg))inc.set(r.dg,[]);inc.get(r.dg).push(r);
  });
  function sort(a,b){
    var cr=n8ConfRank(b.confidence)-n8ConfRank(a.confidence);if(cr)return cr;
    return b.cases-a.cases||b.strong-a.strong||b.avgScore-a.avgScore;
  }
  out.forEach(function(a){a.sort(sort);});inc.forEach(function(a){a.sort(sort);});list.sort(sort);
  engine.routes=routes;engine.outByGroup=out;engine.inByGroup=inc;engine.routeList=list;
}
function n8FindGroupByTokens(needle){
  if(!n8DataReady())return null;
  var nn=n8Norm(needle),nc=n8Compact(needle);
  for(var i=0;i<WA.groups.length;i++){
    var gn=n8Norm(WA.groups[i].name||'');
    if(gn===nn||n8Compact(gn)===nc)return i;
  }
  var toks=nn.split(/[^a-z0-9]+/).filter(function(t){return t.length>=2;});
  var best=null,bestScore=-1,bestLen=999999;
  for(var j=0;j<WA.groups.length;j++){
    var nt=n8Norm(WA.groups[j].name||''),score=0;
    for(var k=0;k<toks.length;k++)if(nt.indexOf(toks[k])>=0)score++;
    if(toks.length&&score===toks.length){
      var len=nt.length;
      if(score>bestScore||(score===bestScore&&len<bestLen)){best=j;bestScore=score;bestLen=len;}
    }
  }
  return best;
}

async function n8BuildEngine(){
  var status=document.getElementById('noc8RouterStatus');if(status)status.textContent='Lendo as '+n8Fmt(WA.messages.length)+' mensagens sem alterar nenhuma fonte…';
  var mt=n8MessageMeta(),engine={metas:mt.metas,tokenDf:mt.tokenDf,pairs:new Map(),routes:new Map(),outByGroup:new Map(),inByGroup:new Map(),routeList:[],groupMsgs:new Map(),msgId:new Map()};
  var metas=engine.metas,i;
  for(i=0;i<metas.length;i++){
    var mm=metas[i];engine.msgId.set(mm.id,i);n8IndexPush(engine.groupMsgs,mm.g,i);
  }
  engine.groupMsgs.forEach(function(a){a.sort(function(x,y){return metas[x].ts-metas[y].ts||x-y;});});
  await n8Yield();

  if(status)status.textContent='Procurando citações e encaminhamentos explícitos…';
  for(i=0;i<metas.length;i++){
    var m=metas[i];
    if(m.quoteId&&engine.msgId.has(m.quoteId)){
      var qi=engine.msgId.get(m.quoteId),qm=metas[qi];
      if(qm.g!==m.g)n8AddPair(engine,qi,i,'quote_cross_group',100,'quote:'+m.quoteId,'Citação direta da mensagem '+m.quoteId,true);
    }
  }
  await n8Yield();

  if(status)status.textContent='Cruzando textos repetidos e comentários semelhantes…';
  var exact=new Map();
  for(i=0;i<metas.length;i++)if(metas[i].meaningful)n8IndexPush(exact,metas[i].nt,i);
  exact.forEach(function(list,key){
    if(list.length<2||list.length>80)return;
    var broadcast=n8BroadcastLike(list,metas);if(broadcast)return;
    n8PairNearest(list,metas,3*24*3600000,function(a,b){
      n8AddPair(engine,a,b,'exact_text',90,'text:'+key.slice(0,120),'Texto normalizado idêntico',false);
    },24);
  });
  await n8Yield();

  if(status)status.textContent='Cruzando fotos, vídeos e anexos idênticos entre grupos…';
  var media=new Map();
  for(i=0;i<metas.length;i++)metas[i].media.forEach(function(k){n8IndexPush(media,k,i);});
  media.forEach(function(list,key){
    if(list.length<2||list.length>60)return;
    var gs=new Set(list.map(function(x){return metas[x].g;}));if(gs.size<2||gs.size>8)return;
    if(n8BroadcastLike(list,metas))return;
    var score=gs.size<=2?97:gs.size<=4?91:82;
    n8PairNearest(list,metas,7*24*3600000,function(a,b){
      n8AddPair(engine,a,b,'same_media',score,'media:'+key,'Arquivo de mídia idêntico',false);
    },28);
  });
  await n8Yield();

  if(status)status.textContent='Cruzando chamados, ativos e patrimônios…';
  var ticket=new Map(),asset=new Map();
  for(i=0;i<metas.length;i++){
    metas[i].tickets.forEach(function(k){n8IndexPush(ticket,k,i);});
    metas[i].assets.forEach(function(k){n8IndexPush(asset,k,i);});
  }
  ticket.forEach(function(list,key){
    if(list.length<2||list.length>80)return;
    n8PairNearest(list,metas,14*24*3600000,function(a,b){n8AddPair(engine,a,b,'same_ticket',96,'ticket:'+key,'Chamado '+key,false);},30);
  });
  asset.forEach(function(list,key){
    if(list.length<2||list.length>80)return;
    n8PairNearest(list,metas,7*24*3600000,function(a,b){n8AddPair(engine,a,b,'same_asset',83,'asset:'+key,'Ativo '+key,false);},30);
  });
  await n8Yield();

  if(status)status.textContent='Ligando ponto/máquina ao mesmo tipo de ocorrência…';
  var ent=new Map();
  for(i=0;i<metas.length;i++){
    var em=metas[i];if(em.topic==='OUTROS')continue;
    em.machines.forEach(function(x){n8IndexPush(ent,'m:'+x+'|'+em.topic,i);});
    em.points.forEach(function(x){n8IndexPush(ent,'p:'+x+'|'+em.topic,i);});
  }
  ent.forEach(function(list,key){
    if(list.length<2||list.length>90)return;
    var isM=key.indexOf('m:')===0,id=key.split('|')[0].slice(2);
    n8PairNearest(list,metas,36*3600000,function(a,b){
      n8AddPair(engine,a,b,isM?'same_machine_topic':'same_point_topic',isM?70:66,(isM?'machine:':'point:')+id,'Mesma entidade e categoria de problema',false);
    },20);
  });
  await n8Yield();

  if(status)status.textContent='Comparando textos quase iguais sem fazer O(n²)…';
  var rareBuckets=new Map();
  for(i=0;i<metas.length;i++){
    var nm=metas[i];if(!nm.meaningful||nm.tokens.length<3)continue;
    var rare=nm.tokens.slice().sort(function(a,b){return (engine.tokenDf.get(a)||999999)-(engine.tokenDf.get(b)||999999);})
      .filter(function(t){return (engine.tokenDf.get(t)||0)<=500;}).slice(0,4);
    if(rare.length<2)continue;
    for(var a=0;a<rare.length;a++)for(var b=a+1;b<rare.length&&b<a+3;b++){
      var kk=[rare[a],rare[b]].sort().join('|');n8IndexPush(rareBuckets,kk,i);
    }
  }
  var bucketCount=0;
  rareBuckets.forEach(function(list,key){
    if(list.length<2||list.length>70)return;
    bucketCount++;
    n8PairNearest(list,metas,72*3600000,function(a,b){
      var ma=metas[a],mb=metas[b],inter=0;
      ma.tokenSet.forEach(function(x){if(mb.tokenSet.has(x))inter++;});
      if(inter<3)return;
      var sim=Math.max(n8Jaccard(ma.tokenSet,mb.tokenSet),n8Containment(ma.tokenSet,mb.tokenSet)*0.9);
      if(sim<0.62)return;
      var sc=Math.round(70+n8Clamp((sim-0.62)/0.38,0,1)*15);
      n8AddPair(engine,a,b,'near_text',sc,'near:'+key,'Similaridade lexical '+Math.round(sim*100)+'%',false);
    },16);
  });
  await n8Yield();

  n8FinalizePairs(engine);
  n8FinalizeRoutes(engine);
  if(status)status.textContent='Mapa pronto: '+n8Fmt(engine.pairs.size)+' pares de evidência e '+n8Fmt(engine.routeList.filter(function(r){return !r.suppressed;}).length)+' rotas direcionais.';
  return engine;
}

function n8EnsureEngine(){
  if(N8.engine)return Promise.resolve(N8.engine);
  if(N8.enginePromise)return N8.enginePromise;
  N8.state='building';
  N8.enginePromise=n8WaitData().then(function(){
    n8FillGroups();return n8BuildEngine();
  }).then(function(e){
    N8.engine=e;N8.state='ready';n8FillGroups();n8RenderAudit();n8RenderRouterHome();return e;
  }).catch(function(err){
    N8.state='error';console.error('NOC v8 route engine',err);
    var s=document.getElementById('noc8RouterStatus');if(s)s.innerHTML='<span style="color:#ff8f95">Falha ao montar rotas: '+n8Esc(err.message||err)+'</span>';
    throw err;
  });
  return N8.enginePromise;
}

function n8GroupName(i){return WA.groups[i]&&WA.groups[i].name?WA.groups[i].name:'Grupo '+i;}
function n8GroupCoverage(i){
  var g=WA.groups[i]||{},s=String(g.status||'');
  if(s==='FAILED'||s==='NEEDS_REVIEW')return 'Cobertura incompleta: '+s;
  if(s==='COMPLETE_WITH_MEDIA_GAPS')return 'Texto completo com lacunas de mídia';
  return s||'status não informado';
}
function n8RouteTopicCount(r,topic){
  if(topic==='ALL')return r.cases;
  return r.topics[topic]||0;
}
function n8FilterRoute(r){
  if(r.suppressed)return false;
  var cf=document.getElementById('noc8ConfFilter'),tf=document.getElementById('noc8TopicFilter');
  var c=cf?cf.value:'ALL',t=tf?tf.value:'ALL';
  if(c==='HIGH'&&n8ConfRank(r.confidence)<3)return false;
  if(c==='MEDIUM'&&n8ConfRank(r.confidence)<2)return false;
  if(t!=='ALL'&&!r.topics[t]&&!r.manualBuiltIn)return false;
  return true;
}
function n8TopicChips(r,max){
  var a=Object.entries(r.topics).sort(function(x,y){return y[1]-x[1];}).slice(0,max||3);
  if(!a.length&&r.manualBuiltIn)return '<span class="noc8-chip green">confirmada pelo operador</span>';
  return a.map(function(x){return '<span class="noc8-chip orange">'+n8Esc(n8TopicLabel(x[0]))+' • '+x[1]+'</span>';}).join('');
}
function n8ReasonChips(r,max){
  return Object.entries(r.reasons).sort(function(a,b){return b[1]-a[1];}).slice(0,max||3).map(function(x){
    return '<span class="noc8-chip">'+n8Esc(n8ReasonLabel(x[0]))+' • '+x[1]+'</span>';
  }).join('');
}
function n8RouteCard(r,direction){
  var other=direction==='out'?r.dg:r.sg;
  return '<div class="noc8-route-card" data-route="'+r.sg+','+r.dg+'">'+
    '<div class="noc8-rh"><strong>'+n8Esc(n8GroupName(other))+'</strong><span class="noc8-badge '+n8ConfClass(r.confidence)+'">'+n8Esc(r.confidence)+'</span></div>'+
    '<div class="noc8-rmeta">'+n8Fmt(r.cases)+' ocorrência(s) independente(s) • '+n8Fmt(r.strong)+' evidência(s) forte(s) • score médio '+Math.round(r.avgScore)+'</div>'+
    '<div class="noc8-chips">'+n8TopicChips(r,3)+n8ReasonChips(r,2)+'</div></div>';
}
function n8RenderGroupMap(g){
  if(!N8.engine||!WA.groups[g])return;
  N8.selectedGroup=g;n8SafeStorageSet(N8.lastGroupKey,{g:g});
  var out=(N8.engine.outByGroup.get(g)||[]).filter(n8FilterRoute);
  var inc=(N8.engine.inByGroup.get(g)||[]).filter(n8FilterRoute);
  var h='<div class="noc8-map">'+
    '<div class="noc8-mapcol"><div class="noc8-maphead">← CHEGA AQUI VINDO DE</div>'+(inc.length?inc.slice(0,12).map(function(r){return n8RouteCard(r,'in');}).join(''):'<div class="noc8-empty">Nenhuma rota de entrada comprovada com a base atual.</div>')+'</div>'+
    '<div class="noc8-mapcol noc8-center"><div class="noc8-maphead">GRUPO PESQUISADO</div><div class="noc8-groupcenter"><strong>'+n8Esc(n8GroupName(g))+'</strong><small>'+n8Esc(n8GroupCoverage(g))+'</small>'+
    '<div class="noc8-statline"><span class="noc8-chip green">'+out.length+' destino(s)</span><span class="noc8-chip">'+inc.length+' origem(ns)</span></div>'+
    '<div class="noc8-actions"><button data-open-group="'+g+'">Abrir histórico do grupo</button><button data-use-origin="'+g+'" class="noc8-primary">Usar no Roteador</button></div></div></div>'+
    '<div class="noc8-mapcol"><div class="noc8-maphead">VAI DAQUI PARA →</div>'+(out.length?out.slice(0,15).map(function(r){return n8RouteCard(r,'out');}).join(''):'<div class="noc8-empty">Nenhuma rota de saída comprovada com a base atual.</div>')+'</div></div>'+
    '<div class="noc8-route-list"><div class="noc8-route-panel"><h4>📤 PARA ONDE AS MENSAGENS SAEM DESTE GRUPO?</h4>'+
    (out.length?out.map(function(r){return n8RouteCard(r,'out');}).join(''):'<div class="noc8-empty">Sem rota suficiente. Isso não significa que não exista; pode haver lacuna de coleta.</div>')+'</div>'+
    '<div class="noc8-route-panel"><h4>📥 DE ONDE AS MENSAGENS CHEGAM?</h4>'+
    (inc.length?inc.map(function(r){return n8RouteCard(r,'in');}).join(''):'<div class="noc8-empty">Sem rota de entrada suficiente.</div>')+'</div></div>';
  document.getElementById('noc8GroupMap').innerHTML=h;
  document.getElementById('noc8GroupStatus').innerHTML='<b>'+n8Esc(n8GroupName(g))+'</b> • '+out.length+' rota(s) de saída • '+inc.length+' rota(s) de entrada. Clique em qualquer destino para ver as mensagens que provaram a ligação.';
  n8SetGroupQuery(g,false);
}
function n8RenderAudit(){
  var el=document.getElementById('noc8Audit');if(!el||!N8.engine)return;
  var active=N8.engine.routeList.filter(function(r){return !r.suppressed;}),confirmed=active.filter(function(r){return r.confidence==='CONFIRMADA';}).length,
      high=active.filter(function(r){return r.confidence==='ALTA';}).length,medium=active.filter(function(r){return r.confidence==='MEDIA';}).length;
  el.innerHTML='<div class="noc8-kpi"><b>'+n8Fmt(WA.groups.length)+'</b><span>grupos analisados</span></div>'+
    '<div class="noc8-kpi"><b>'+n8Fmt(N8.engine.pairs.size)+'</b><span>pares de evidência cruzados</span></div>'+
    '<div class="noc8-kpi"><b>'+n8Fmt(confirmed)+'</b><span>rotas confirmadas</span></div>'+
    '<div class="noc8-kpi"><b>'+n8Fmt(high)+'</b><span>rotas de alta confiança</span></div>'+
    '<div class="noc8-kpi"><b>'+n8Fmt(medium)+'</b><span>rotas médias</span></div>';
}
function n8SetGroupQuery(g,render){
  var q=document.getElementById('noc8GroupQuery');if(q)q.value=n8GroupName(g);
  if(render!==false)n8RenderGroupMap(g);
}
function n8GroupSuggest(){
  if(!n8DataReady())return;
  var q=n8Norm(document.getElementById('noc8GroupQuery').value),el=document.getElementById('noc8Suggestions');
  if(!q){el.innerHTML='';return;}
  var qt=n8Tokens(q),a=WA.groups.map(function(g,i){
    var n=n8Norm(g.name||''),score=n===q?1000:n.indexOf(q)>=0?700:0;
    qt.forEach(function(t){if(n.indexOf(t)>=0)score+=80;});
    return {i:i,score:score,name:g.name||('Grupo '+i)};
  }).filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score||a.name.localeCompare(b.name,'pt-BR');}).slice(0,10);
  el.innerHTML=a.map(function(x){return '<button class="noc8-suggestion" data-pick-group="'+x.i+'">'+n8Esc(x.name)+'</button>';}).join('');
}
function n8PickGroupFromQuery(){
  var q=n8Norm(document.getElementById('noc8GroupQuery').value);if(!q)return;
  var exact=null,cands=[];
  for(var i=0;i<WA.groups.length;i++){
    var n=n8Norm(WA.groups[i].name||'');
    if(n===q){exact=i;break;}
    if(n.indexOf(q)>=0)cands.push(i);
  }
  if(exact!=null)n8SetGroupQuery(exact);
  else if(cands.length===1)n8SetGroupQuery(cands[0]);
  else if(cands.length>1){N8.selectedGroup=cands[0];n8SetGroupQuery(cands[0]);}
  else n8Toast('Grupo não encontrado');
}

function n8OpenRoute(sg,dg){
  var r=N8.engine&&N8.engine.routes.get(n8RouteKey(sg,dg));if(!r)return;
  var title=n8GroupName(sg)+' → '+n8GroupName(dg);
  document.getElementById('noc8ModalTitle').textContent=title;
  document.getElementById('noc8ModalSub').textContent=r.confidence+' • '+r.cases+' ocorrência(s) • clique nas mensagens para abrir a evidência original';
  var fb=n8Feedback(sg,dg),h='<div class="noc8-decision '+n8ConfClass(r.confidence)+'"><div class="noc8-decision-head"><div><small>ROTA DIRECIONAL</small><h3>'+n8Esc(title)+'</h3></div><span class="noc8-badge '+n8ConfClass(r.confidence)+'">'+n8Esc(r.confidence)+'</span></div>'+
    '<div class="noc8-chips">'+n8TopicChips(r,8)+n8ReasonChips(r,8)+'</div>'+
    '<div class="noc8-actions"><button class="noc8-primary" data-confirm-route="'+sg+','+dg+'">Confirmar rota correta</button><button data-reject-route="'+sg+','+dg+'">Marcar como rota incorreta</button><button data-clear-route="'+sg+','+dg+'">Limpar minha validação</button></div>'+
    (r.manualBuiltIn?'<div class="noc8-warn noc8-ok">Esta direção foi confirmada explicitamente pelo operador na especificação do sistema.</div>':'')+
    (fb.positive?'<div class="noc8-warn noc8-ok">Também confirmada localmente neste navegador em '+n8Esc(fb.positive.at||'')+'.</div>':'')+
    (fb.negative?'<div class="noc8-warn noc8-danger">Marcada como incorreta localmente. Ela fica fora das recomendações até a validação ser limpa.</div>':'')+'</div>';

  if(!r.occurrences.length){
    h+='<div class="noc8-empty">A rota foi confirmada manualmente, mas não há par de mensagens capturado suficiente para mostrar nesta base. Isso é mantido separado da evidência histórica.</div>';
  }else{
    h+='<div class="sect">Mensagens que saíram de um grupo e apareceram/comentaram no outro</div>';
    var arr=r.occurrences.slice(0,80);
    for(var i=0;i<arr.length;i++){
      var p=arr[i],a=N8.engine.metas[p.src],b=N8.engine.metas[p.dst];
      h+='<div class="noc8-proof"><div class="noc8-proofhead"><span>score '+Math.round(p.score)+' • '+n8Esc(p.reasons.map(n8ReasonLabel).join(' + '))+'</span><span>'+n8Esc(n8FmtDelta(b.ts-a.ts))+' depois</span></div>'+
        '<div class="noc8-proofgrid"><div class="noc8-msg"><b>'+n8Esc(n8GroupName(a.g))+'</b><small>'+n8Esc(a.date+' '+a.time+' • '+a.author)+'</small><div>'+n8Esc(a.text||'(sem texto; evidência por mídia/entidade)')+'</div><div class="noc8-actions"><button data-open-msg="'+a.i+'">Abrir original</button></div></div>'+
        '<div class="noc8-proofarrow">→<br>'+n8Esc(n8FmtDelta(b.ts-a.ts))+'</div>'+
        '<div class="noc8-msg"><b>'+n8Esc(n8GroupName(b.g))+'</b><small>'+n8Esc(b.date+' '+b.time+' • '+b.author)+'</small><div>'+n8Esc(b.text||'(sem texto; evidência por mídia/entidade)')+'</div><div class="noc8-actions"><button data-open-msg="'+b.i+'">Abrir destino</button></div></div></div></div>';
    }
    if(r.occurrences.length>arr.length)h+='<div class="noc8-note">Exibindo as '+arr.length+' melhores evidências de '+r.occurrences.length+'.</div>';
  }
  document.getElementById('noc8ModalBody').innerHTML=h;
  document.getElementById('noc8Modal').classList.add('open');
}
function n8ModalClick(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.openMsg!=null){var i=Number(b.dataset.openMsg);try{if(typeof window.openMsg==='function')window.openMsg(i);}catch(x){}return;}
  if(b.dataset.confirmRoute){var p=b.dataset.confirmRoute.split(',').map(Number);n8SetFeedback(p[0],p[1],'positive');n8OpenRoute(p[0],p[1]);return;}
  if(b.dataset.rejectRoute){var q=b.dataset.rejectRoute.split(',').map(Number);n8SetFeedback(q[0],q[1],'negative');document.getElementById('noc8Modal').classList.remove('open');return;}
  if(b.dataset.clearRoute){var r=b.dataset.clearRoute.split(',').map(Number);n8SetFeedback(r[0],r[1],'clear');n8OpenRoute(r[0],r[1]);}
}
function n8RoutesClick(e){
  var b=e.target.closest('[data-pick-group],[data-route],[data-open-group],[data-use-origin]');
  if(!b)return;
  if(b.dataset.pickGroup!=null){n8SetGroupQuery(Number(b.dataset.pickGroup));document.getElementById('noc8Suggestions').innerHTML='';return;}
  if(b.dataset.route){var p=b.dataset.route.split(',').map(Number);n8OpenRoute(p[0],p[1]);return;}
  if(b.dataset.openGroup!=null){try{if(typeof window.openGroup==='function')window.openGroup(Number(b.dataset.openGroup));}catch(x){}return;}
  if(b.dataset.useOrigin!=null){
    var g=Number(b.dataset.useOrigin),sel=document.getElementById('noc8Origin');sel.value=String(g);N8.selectedGroup=g;n8SafeStorageSet(N8.lastGroupKey,{g:g});
    n8Activate('router');return;
  }
}
function n8Activate(id){
  document.querySelectorAll('.page').forEach(function(x){x.classList.toggle('active',x.id===id);});
  document.querySelectorAll('.navbtn[data-page]').forEach(function(x){x.classList.toggle('active',x.dataset.page===id);});
  if(id==='router')n8EnsureEngine().then(n8RenderRouterHome);
  if(id==='groupRoutes')n8EnsureEngine().then(function(){n8RenderAudit();if(N8.selectedGroup!=null)n8RenderGroupMap(N8.selectedGroup);});
}

function n8RemoteAssessment(g,text,topic){
  var engine=N8.engine,ids=engine.groupMsgs.get(g)||[],qt=n8Tokens(text),cands=[];
  for(var i=0;i<ids.length;i++){
    var mi=ids[i],m=engine.metas[mi];
    if(topic!=='OUTROS'&&m.topic!==topic)continue;
    var sim=qt.length?n8TextSimilarity(m,qt):0.25;
    if(qt.length&&sim<0.2)continue;
    cands.push({idx:mi,sim:sim});
  }
  cands.sort(function(a,b){return b.sim-a.sim;});cands=cands.slice(0,60);
  var examples=[],score=0;
  for(var c=0;c<cands.length;c++){
    var src=cands[c].idx,pos=ids.indexOf(src);if(pos<0)continue;
    var sm=engine.metas[src];
    for(var j=pos+1;j<Math.min(ids.length,pos+30);j++){
      var di=ids[j],dm=engine.metas[di],delta=dm.ts-sm.ts;
      if(delta>4*3600000)break;
      if(!n8HasResolution(dm.text))continue;
      var quoted=dm.quoteId&&dm.quoteId===sm.id,entity=false;
      if(sm.machines.some(function(x){return dm.machines.indexOf(x)>=0;}))entity=true;
      if(sm.points.some(function(x){return dm.points.indexOf(x)>=0;}))entity=true;
      if(sm.tickets.some(function(x){return dm.tickets.indexOf(x)>=0;}))entity=true;
      if(quoted||entity||delta<=45*60000){
        var sc=(quoted?45:0)+(entity?35:0)+(delta<=45*60000?20:10);
        score+=sc;examples.push({src:src,dst:di,score:sc});break;
      }
    }
  }
  examples.sort(function(a,b){return b.score-a.score;});
  return {score:score,examples:examples.slice(0,8),strong:examples.filter(function(x){return x.score>=55;}).length};
}
function n8RouteSimilarity(r,text,topic){
  var qt=n8Tokens(text),best=0,topicHits=r.topics[topic]||0;
  if(qt.length){
    for(var i=0;i<Math.min(r.occurrences.length,60);i++){
      var p=r.occurrences[i],sim=n8TextSimilarity(N8.engine.metas[p.src],qt);if(sim>best)best=sim;
    }
  }
  var base=n8ConfRank(r.confidence)*35+Math.min(40,r.cases*5)+Math.min(20,r.strong*5);
  if(topic&&topic!=='OUTROS')base+=Math.min(55,topicHits*12);
  base+=best*60;
  if(r.manualBuiltIn)base+=45;
  if(n8Feedback(r.sg,r.dg).positive)base+=60;
  return {score:base,similarity:best,topicHits:topicHits};
}
function n8AnalyzeRouter(){
  n8EnsureEngine().then(function(){
    var sel=document.getElementById('noc8Origin'),g=Number(sel.value),text=document.getElementById('noc8Text').value.trim(),pv=document.getElementById('noc8Problem').value;
    if(!Number.isInteger(g)||!WA.groups[g]){
      document.getElementById('noc8RouterResult').innerHTML='<div class="noc8-warn noc8-danger"><b>Escolha o grupo onde a reclamação chegou.</b> Sem origem, o sistema não vai chutar destino.</div>';
      return;
    }
    N8.selectedGroup=g;n8SafeStorageSet(N8.lastGroupKey,{g:g});
    var topic=pv==='AUTO'?n8Topic(text):pv;
    var routes=(N8.engine.outByGroup.get(g)||[]).filter(function(r){return !r.suppressed;});
    var ranked=routes.map(function(r){var x=n8RouteSimilarity(r,text,topic);return {r:r,score:x.score,similarity:x.similarity,topicHits:x.topicHits};})
      .sort(function(a,b){return b.score-a.score;});
    var remote=text?n8RemoteAssessment(g,text,topic):{score:0,strong:0,examples:[]};
    n8RenderRouterDecision(g,text,topic,ranked,remote);
  });
}
function n8RenderRouterHome(){
  var status=document.getElementById('noc8RouterStatus');if(status&&N8.engine)status.textContent='Mapa pronto: '+n8Fmt(N8.engine.routeList.filter(function(r){return !r.suppressed;}).length)+' rotas direcionais. Você pode analisar uma mensagem ou deixar o texto vazio para ver só os destinos históricos do grupo.';
}
function n8RenderRouterDecision(g,text,topic,ranked,remote){
  var el=document.getElementById('noc8RouterResult'),group=n8GroupName(g);
  if(!ranked.length){
    el.innerHTML='<div class="noc8-decision hint"><div class="noc8-decision-head"><div><small>SEM ROTA COMPROVADA</small><h3>'+n8Esc(group)+'</h3></div><span class="noc8-badge hint">NÃO CHUTAR</span></div>'+
      '<div class="noc8-warn noc8-danger">A base atual não provou para qual grupo as mensagens saem daqui. Verifique a cobertura do grupo e use o histórico manualmente até termos evidência suficiente.</div></div>';
    return;
  }
  if(!text){
    var top=ranked.slice(0,6);
    el.innerHTML='<div class="noc8-decision confirmed"><div class="noc8-decision-head"><div><small>MAPA HISTÓRICO DE SAÍDA</small><h3>'+n8Esc(group)+'</h3></div><span class="noc8-badge confirmed">'+top.length+' destino(s)</span></div>'+
      '<div class="noc8-warn noc8-ok">Você não digitou uma ocorrência. Então o sistema não diagnostica problema: ele mostra diretamente para onde as mensagens deste grupo historicamente foram.</div>'+
      '<div class="noc8-route-list"><div class="noc8-route-panel" style="grid-column:1/-1"><h4>VAI PARA →</h4>'+top.map(function(x){return n8RouteCard(x.r,'out');}).join('')+'</div></div></div>';
    return;
  }
  var best=ranked[0],r=best.r,second=ranked[1],margin=second?best.score-second.score:best.score,conf=r.confidence;
  var remoteFirst=n8RemoteFriendly(topic)&&remote.strong>=2&&remote.score>=110&&!n8FieldTopic(topic);
  var ambiguous=(conf==='INDICIO')||(conf==='MEDIA'&&margin<20);
  var action=remoteFirst?'TENTAR REMOTO PRIMEIRO':(ambiguous?'VALIDAR ANTES DE ENCAMINHAR':'ENCAMINHAR');
  var cls=ambiguous?'medium':n8ConfClass(conf);
  var why=[];
  why.push('Grupo de origem: '+group+'.');
  if(r.manualBuiltIn)why.push('Esta direção foi confirmada explicitamente pelo operador.');
  if(best.topicHits)why.push(best.topicHits+' ocorrência(s) históricas desta rota têm o mesmo tipo de problema.');
  if(best.similarity>=0.35)why.push('Há mensagem histórica semelhante ('+Math.round(best.similarity*100)+'% de similaridade lexical).');
  why.push(r.cases+' ocorrência(s) independente(s) sustentam a rota; '+r.strong+' têm evidência forte.');
  var topReasons=Object.entries(r.reasons).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
  topReasons.forEach(function(x){why.push(n8ReasonLabel(x[0])+': '+x[1]+' caso(s).');});
  if(remoteFirst)why.push('Também há '+remote.strong+' exemplo(s) forte(s) de normalização remota no próprio grupo.');

  var h='<div class="noc8-decision '+cls+'"><div class="noc8-decision-head"><div><small>'+n8Esc(action)+'</small><h3>'+n8Esc(remoteFirst?('Remoto → se falhar: '+n8GroupName(r.dg)):n8GroupName(r.dg))+'</h3></div>'+
    '<span class="noc8-badge '+n8ConfClass(conf)+'">'+n8Esc(conf)+'</span></div>'+
    '<ul class="noc8-why">'+why.map(function(x){return '<li>'+n8Esc(x)+'</li>';}).join('')+'</ul>'+
    (ambiguous?'<div class="noc8-warn">A diferença para a segunda alternativa é pequena ou a evidência ainda é média. Abra as provas antes de enviar.</div>':'')+
    (remoteFirst?'<div class="noc8-warn noc8-ok">Faça a validação remota aplicável. Se normalizar, responda no MESMO grupo da reclamação. Se não normalizar, o destino histórico mais forte é <b>'+n8Esc(n8GroupName(r.dg))+'</b>.</div>':
      '<div class="noc8-warn noc8-ok">Destino histórico mais forte para esta origem e contexto: <b>'+n8Esc(n8GroupName(r.dg))+'</b>. Abra as evidências se quiser auditar antes de encaminhar.</div>')+
    '<div class="noc8-actions"><button class="noc8-primary" data-route="'+r.sg+','+r.dg+'">Ver provas da rota</button><button data-copy-ready="1">Copiar mensagem pronta</button><button data-confirm-route-inline="'+r.sg+','+r.dg+'">Confirmar rota correta</button><button data-show-map="'+g+'">Ver mapa completo deste grupo</button></div></div>'+
    '<div class="noc8-flow"><div class="noc8-flowbox"><b>1. Origem</b><span>'+n8Esc(group)+'</span></div><div class="noc8-arrow">→</div>'+
    '<div class="noc8-flowbox"><b>2. Diagnóstico</b><span>'+n8Esc(n8TopicLabel(topic))+(remoteFirst?' • remoto primeiro':'')+'</span></div><div class="noc8-arrow">→</div>'+
    '<div class="noc8-flowbox"><b>3. Destino se precisar campo</b><span>'+n8Esc(n8GroupName(r.dg))+'</span></div></div>';

  h+='<div class="noc8-route-list"><div class="noc8-route-panel"><h4>Alternativas calculadas</h4>'+
    ranked.slice(0,6).map(function(x){return '<div class="noc8-route-card" data-route="'+x.r.sg+','+x.r.dg+'"><div class="noc8-rh"><strong>'+n8Esc(n8GroupName(x.r.dg))+'</strong><span class="noc8-badge '+n8ConfClass(x.r.confidence)+'">'+n8Esc(x.r.confidence)+'</span></div><div class="noc8-rmeta">score '+Math.round(x.score)+' • '+x.r.cases+' caso(s) • '+x.topicHits+' do mesmo problema</div></div>';}).join('')+'</div>'+
    '<div class="noc8-route-panel"><h4>Mensagem pronta</h4><div style="padding:12px;font-size:10px;white-space:pre-wrap" id="noc8ReadyMessage">'+n8Esc('Boa tarde, pessoal.\n\n'+text+'\n\nPodem verificar, por favor?')+'</div></div></div>';
  el.innerHTML=h;
}
function n8RouterClick(e){
  var b=e.target.closest('button,[data-route]');if(!b)return;
  if(b.dataset.route){var p=b.dataset.route.split(',').map(Number);n8OpenRoute(p[0],p[1]);return;}
  if(b.dataset.copyReady){var el=document.getElementById('noc8ReadyMessage');if(el)n8Copy(el.textContent);return;}
  if(b.dataset.confirmRouteInline){var q=b.dataset.confirmRouteInline.split(',').map(Number);n8SetFeedback(q[0],q[1],'positive');n8AnalyzeRouter();return;}
  if(b.dataset.showMap!=null){var g=Number(b.dataset.showMap);N8.selectedGroup=g;n8Activate('groupRoutes');n8SetGroupQuery(g);return;}
}

function n8RefreshCurrentViews(){
  if(N8.selectedGroup!=null&&document.getElementById('groupRoutes').classList.contains('active'))n8RenderGroupMap(N8.selectedGroup);
  if(document.getElementById('router').classList.contains('active'))n8RenderRouterHome();
  n8RenderAudit();
}

function n8Boot(){
  n8LoadFeedback();
  if(!n8InstallShell()){setTimeout(n8Boot,150);return;}
  n8EnsureEngine().catch(function(){});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(n8Boot,0);});
else setTimeout(n8Boot,0);

})();