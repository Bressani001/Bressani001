(function(){
'use strict';
const C=()=>window.PrismaCore,S=()=>C().S;
const norm=v=>C().norm(v),compact=v=>C().compact(v),esc=v=>C().esc(v),fmt=n=>C().fmt(n);
const OVERRIDE_KEY='prisma_v12_router_overrides';
let last=null,assocMap=new Map(),overrides=[];
function loadOverrides(){try{const x=JSON.parse(localStorage.getItem(OVERRIDE_KEY)||'[]');overrides=Array.isArray(x)?x:[]}catch(e){overrides=[]}}
function saveOverrides(){try{localStorage.setItem(OVERRIDE_KEY,JSON.stringify(overrides.slice(-500)))}catch(e){}}
function tokens(raw){
  const R=S().routerData||{},st=new Set(R.stop||[]),out=[];
  for(const t of (norm(raw).match(/[a-z0-9][a-z0-9._-]{1,}/g)||[])){const x=t.replace(/^[._-]+|[._-]+$/g,'');if(!x||st.has(x)||(x.length<3&&!/^\d+$/.test(x)))continue;if(/^\d+$/.test(x)&&x.length<4)continue;out.push(x)}
  return [...new Set(out)];
}
function phraseHits(raw,list){const n=norm(raw);return (list||[]).filter(x=>n.includes(norm(x)))}
function detectIssue(raw,forced){
  if(forced&&forced!=='auto')return forced;const R=S().routerData||{},n=norm(raw);
  if(/\b(chamado|ticket|protocolo)\b/.test(n))return 'ticket';
  if(/\b(configurar|configuracao)\b/.test(n))return 'configuration';
  if(/\b(ativacao|implantacao)\b/.test(n))return 'activation';
  let best=['other',0];for(const [k,arr] of Object.entries(R.issueTerms||{})){const h=phraseHits(raw,arr);let sc=h.length;for(const x of h)sc+=Math.min(norm(x).length/12,1.5);if(sc>best[1])best=[k,sc]}return best[0];
}
function roleBonus(issue,role){
  const map={media:{maintenance:34,configuration:18,monitoring:5,noc:5},offline:{maintenance:24,configuration:22,monitoring:7,noc:7},hardware:{maintenance:55,local:12,tickets:8},network:{maintenance:26,configuration:20,monitoring:8,noc:6},configuration:{configuration:62,maintenance:10},activation:{activation:65,configuration:15,maintenance:8},ticket:{tickets:65,maintenance:8,noc:6},other:{maintenance:8,local:6,operation:4}};
  return (map[issue]||map.other)[role]||0;
}
function buildAssoc(){
  assocMap=new Map();const R=S().routerData||{};for(const a of (R.assoc||[])){assocMap.set(a.a+'|'+a.b,a);assocMap.set(a.b+'|'+a.a,Object.assign({},a,{a:a.b,b:a.a}))}loadOverrides();
}
function assoc(source,target){return assocMap.get(source+'|'+target)||null}
function profileScore(p,toks){
  const tm=new Map(p.t||[]);let s=0,matched=[];for(const q of toks){let w=tm.get(q)||0;if(!w&&q.length>=4){for(const [t,v] of (p.t||[])){if(t.length>=4&&(t.includes(q)||q.includes(t)))w=Math.max(w,v*.28)}}if(w){s+=w;matched.push([q,w])}}return {s,matched};
}
function messageSupport(toks){
  const R=S().routerData||{},by=new Map(),idf=R.idf||{};if(!toks.length)return by;
  for(let i=0;i<S().messages.length;i++){const m=S().messages[i]||[],hay=norm((m[6]||'')+' '+(m[10]||''));let sc=0,hits=0,rare=0;for(const t of toks){if(hay.includes(t)){const w=idf[t]||1.15;sc+=w;hits++;if(w>=3)rare++}}if(!hits)continue;if(hits===1&&rare===0&&toks.length>1)continue;if(hits===1&&sc<2.2)continue;sc+=Math.min(hits-1,3)*1.2;const gi=m[4],arr=by.get(gi)||[];arr.push([sc,i,hits]);arr.sort((a,b)=>b[0]-a[0]||b[2]-a[2]);if(arr.length>5)arr.length=5;by.set(gi,arr)}return by;
}
function overrideBonus(source,toks,target){
  let best=0,match=null;const A=new Set(toks);for(const r of overrides){if(Number(r.target)!==Number(target))continue;if(r.source!==''&&String(r.source)!==String(source))continue;const B=new Set(r.tokens||[]);if(!B.size)continue;let inter=0;for(const t of B)if(A.has(t))inter++;const ratio=inter/Math.max(1,Math.min(A.size,B.size));if(ratio>=.7&&inter>=1){const v=95+ratio*35;if(v>best){best=v;match=r}}}return [best,match];
}
function findEntities(raw,toks){
  const n=norm(raw),c=compact(raw),sal=toks.filter(t=>t.length>=4||/^\d{4,}$/.test(t)),R=S().routerData||{},ma=[],po=[];
  for(const m of S().machines){let sc=0,re=[];if(m.id&&n.includes(norm(m.id))&&String(m.id).length>=4){sc+=130;re.push('ID máquina')}if(m.pointCode&&n.includes(norm(m.pointCode))&&String(m.pointCode).length>=4){sc+=120;re.push('cód. ponto')}const nm=compact(m.name||'');if(nm.length>=5&&c.includes(nm)){sc+=110;re.push('nome exato')}let h=0;const blob=norm([m.name,m.pointName,m.address,m.ip,m.square].join(' '));for(const t of sal){if(blob.includes(t)){h++;sc+=(R.idf?.[t]||1.2)*8}}if(h>=2||sc>=100)ma.push([sc,m,re])}
  for(const p of S().points){let sc=0,re=[];if(p.id&&n.includes(norm(p.id))&&String(p.id).length>=4){sc+=125;re.push('ID ponto')}if(p.code&&n.includes(norm(p.code))&&String(p.code).length>=4){sc+=120;re.push('código')}const nm=compact(p.name||'');if(nm.length>=5&&c.includes(nm)){sc+=105;re.push('nome exato')}let h=0;const blob=norm([p.name,p.address,p.city,p.square,p.area].join(' '));for(const t of sal){if(blob.includes(t)){h++;sc+=(R.idf?.[t]||1.2)*7}}if(h>=2||sc>=100)po.push([sc,p,re])}
  ma.sort((a,b)=>b[0]-a[0]);po.sort((a,b)=>b[0]-a[0]);return {m:ma.slice(0,3),p:po.slice(0,3)};
}
function actionFor(issue,top,raw){
  const R=S().routerData||{},field=phraseHits(raw,R.fieldTerms),remote=phraseHits(raw,R.remoteTerms);
  if(issue==='configuration')return ['Tentar resolver/configurar remotamente','Valide acesso à máquina, configuração do player/tela e parâmetros. Se depender de ação física, encaminhe ao grupo indicado.'];
  if(issue==='activation')return ['Encaminhar para ativação/implantação','Confirme ponto, máquina/ativo e escopo da instalação antes do envio.'];
  if(issue==='ticket'||top.p.r==='tickets')return ['Abrir ou acompanhar chamado','Use o grupo indicado para registrar/acompanhar o chamado e mantenha código do ponto/máquina no texto.'];
  if(issue==='hardware'||field.length>remote.length+1)return ['Encaminhar para manutenção/campo','Há sinais de intervenção física. Evite insistir em procedimento remoto quando houver indício de tela, módulo, fonte, cabo, energia ou troca.'];
  if(['media','offline','network'].includes(issue))return ['Tentar validação remota rápida antes','Cheque acesso/online, conectividade, player/loop e reinício controlado quando aplicável. Se não normalizar, encaminhe ao grupo indicado com o que já foi testado.'];
  return [top.p.r==='maintenance'?'Encaminhar para manutenção':'Validar e encaminhar','Use as evidências abaixo. Se a confiança não for alta, confirme local/código antes de enviar.'];
}
async function analyze(){
  const raw=document.getElementById('routerInput').value.trim();if(!raw){document.getElementById('routerOut').innerHTML='<div class="card empty">Cole a ocorrência primeiro.</div>';return}
  const R=S().routerData;if(!R||!Array.isArray(R.profiles)){document.getElementById('routerOut').innerHTML='<div class="card empty">router.js não foi encontrado/carregado na pasta V11. Reconecte a pasta completa.</div>';return}
  const source=document.getElementById('routerSource').value===''?'':Number(document.getElementById('routerSource').value),issue=detectIssue(raw,document.getElementById('routerIssue').value),toks=tokens(raw),msgSup=messageSupport(toks),entities=findEntities(raw,toks);let rows=[];
  for(const p of R.profiles){
    let score=0,reasons=[],signals=0;const ps=profileScore(p,toks);score+=ps.s;if(ps.s>=12){signals++;reasons.push('vocabulário/local histórico compatível ('+ps.matched.slice(0,4).map(x=>x[0]).join(', ')+')')}
    const gset=new Set(tokens(p.n));const nameHits=toks.filter(t=>gset.has(t));if(nameHits.length){const b=32+nameHits.length*18;score+=b;signals++;reasons.push('termos batem com o nome do grupo')}
    const rb=roleBonus(issue,p.r);score+=rb;if(rb>=20){signals++;reasons.push('tipo de problema compatível com '+(p.c||p.r))}
    let as=null;if(source!==''){as=assoc(source,p.i);if(as){const ab=Math.min(95,Number(as.w||0)*.62);score+=ab;if(ab>=12){signals++;reasons.push('histórico entre grupo de origem e destino ('+(as.m||0)+' mídia(s), '+(as.x||0)+' texto(s))')}}if(Number(p.i)===Number(source))score-=18}
    const ev=msgSup.get(p.i)||[];if(ev.length){let es=Math.min(55,ev.slice(0,3).reduce((a,x)=>a+x[0]*2.8,0));if(ps.s<6&&!nameHits.length&&!as)es*=.45;score+=es;if(ev.length>=2||ev[0][0]>=4.5){signals++;reasons.push(ev.length+' ocorrência(s) histórica(s) semelhante(s)')}}
    let rule=null;for(const rr of (R.rules||[])){if(Number(rr.target)!==Number(p.i))continue;if(rr.source?.length&&source!==''&&!rr.source.includes(source))continue;if(rr.source?.length&&source==='')continue;if(rr.any?.length&&!rr.any.some(x=>norm(raw).includes(norm(x))))continue;score+=Number(rr.bonus||0);signals+=2;rule=rr;reasons.unshift(rr.reason||'regra histórica')}
    const [ob,ov]=overrideBonus(source,toks,p.i);if(ob){score+=ob;signals+=2;reasons.unshift('rota confirmada anteriormente nesta V12')}
    if(p.s==='FAILED')score-=70;else if(p.s==='NEEDS_REVIEW')score-=28;
    rows.push({p,score,reasons,signals,ev,assoc:as,rule,override:ov,ps:ps.s,nameHits});
  }
  rows.sort((a,b)=>b.score-a.score);if(!rows.length)return;
  const top=rows[0],second=rows[1],margin=top.score-(second?.score||0),ratio=top.score/Math.max(1,second?.score||1);let conf='ambiguous',label='AMBÍGUA';
  if(top.rule&&((source!==''&&top.rule.source?.includes(source))||top.rule.id==='scirp-general')){conf=source!==''?'confirmed':'high';label=source!==''?'CONFIRMADA':'ALTA'}
  else if(top.score>=105&&top.signals>=3&&(margin>=20||ratio>=1.3)){conf='high';label='ALTA'}
  else if(top.score>=60&&top.signals>=2&&margin>=10){conf='medium';label='MÉDIA'}
  const action=actionFor(issue,top,raw),evidence=[],seen=new Set();function addEv(mi,why){if(mi==null||seen.has(mi)||!S().messages[mi])return;seen.add(mi);evidence.push([mi,why])}
  for(const x of top.ev.slice(0,4))addEv(x[1],'mensagem semelhante');if(top.assoc)for(const e of (top.assoc.e||[])){addEv(e[0],'evidência entre grupos');addEv(e[1],'evidência entre grupos')}if(top.rule)for(const pair of (top.rule.e||[]))for(const mi of pair)addEv(mi,'regra histórica');
  last={raw,source,issue,toks,top,second,rows,evidence,entities,conf,label,actionTitle:action[0],actionBody:action[1],margin};renderResult();
}
function entityHtml(ent){
  let h='';for(const x of ent.m){const m=x[1];h+='<div class="source-row"><div><b>Máquina '+esc(m.id)+' • '+esc(m.name)+'</b><small>'+esc([m.pointCode,m.pointName,m.square,m.ip].filter(Boolean).join(' • '))+'</small></div><button data-router-machine="'+esc(m._key)+'">Abrir</button></div>'}
  for(const x of ent.p){const p=x[1];h+='<div class="source-row"><div><b>Ponto '+esc(p.code)+' • '+esc(p.name)+'</b><small>'+esc([p.address,p.city,p.square].filter(Boolean).join(' • '))+'</small></div><button data-router-point="'+esc(p._key)+'">Abrir</button></div>'}
  return h||'<div class="empty">Nenhuma entidade identificada com segurança suficiente só pelo texto.</div>';
}
function renderResult(){
  const r=last,t=r.top,src=r.source===''?'Origem não informada':S().groups[r.source]?.name||'Origem',safe=r.conf==='confirmed'||r.conf==='high';
  const warn=safe?'<div class="route-warn ok">Evidência suficiente para uso operacional. Ainda confira ponto/local antes de enviar.</div>':r.conf==='medium'?'<div class="route-warn warn"><b>NÃO encaminhe no automático.</b> Confirme código/local e evidências.</div>':'<div class="route-warn danger"><b>ROTA AMBÍGUA.</b> Procure mais um identificador antes de encaminhar.</div>';
  const labels={media:'Mídia / conteúdo',offline:'Offline / acesso',hardware:'Hardware / físico',network:'Rede / internet',configuration:'Configuração',activation:'Ativação',ticket:'Chamado / ticket',other:'Não classificado'};
  const reasons=t.reasons.slice(0,7).map(x=>'<li>'+esc(x)+'</li>').join('')||'<li>Sem sinais suficientes.</li>';
  const alts=r.rows.slice(0,5).map((x,i)=>'<div class="source-row"><div><b>'+esc(x.p.n||('Grupo '+x.p.i))+'</b><small>'+esc([x.p.c,x.p.s].filter(Boolean).join(' • '))+'</small></div><div class="actions"><span class="chip">'+x.score.toFixed(1)+'</span><button data-router-alt="'+x.p.i+'">'+(i?'Usar':'Selecionado')+'</button></div></div>').join('');
  const ev=r.evidence.slice(0,10).map(x=>{const m=S().messages[x[0]]||[],g=S().groups[m[4]]||{};return '<button class="timeline-row" data-router-msg="'+x[0]+'"><div class="meta">'+esc([m[2],m[3],g.name,x[1]].filter(Boolean).join(' • '))+'</div><div>'+esc(m[6]||m[10]||'(sem texto)')+'</div></button>'}).join('')||'<div class="empty">Nenhuma evidência forte localizada.</div>';
  const ready='Boa tarde, pessoal.\n\n'+r.raw.trim()+'\n\nPodem verificar, por favor?';
  document.getElementById('routerOut').innerHTML=
  '<div class="grid2"><div class="card"><div class="card-head"><h3>Grupo recomendado</h3><span class="chip '+(safe?'ok':r.conf==='medium'?'warn':'danger')+'">'+esc(r.label)+'</span></div><div class="card-body"><h2 style="margin:0 0 8px">'+esc(t.p.n||('Grupo '+t.p.i))+'</h2><ul class="router-reasons">'+reasons+'</ul>'+warn+'</div></div>'+
  '<div class="card"><div class="card-head"><h3>Ação agora</h3><small>'+esc(labels[r.issue]||r.issue)+'</small></div><div class="card-body"><b>'+esc(r.actionTitle)+'</b><p class="muted">'+esc(r.actionBody)+'</p><div class="actions"><button id="routerCopy" class="primary">Copiar mensagem</button><button id="routerConfirm">Confirmar rota</button><button id="routerComposer">Abrir Mensagens</button></div></div></div></div>'+
  '<div class="route-flow"><div><b>1. Origem</b><span>'+esc(src)+'</span></div><b>→</b><div><b>2. Diagnóstico</b><span>'+esc(labels[r.issue]||r.issue)+'</span></div><b>→</b><div><b>3. Destino</b><span>'+esc(t.p.n||'')+'</span></div></div>'+
  '<div class="grid2" style="margin-top:12px"><div class="card"><div class="card-head"><h3>Entidades identificadas</h3><small>ponto / máquina</small></div><div class="card-body">'+entityHtml(r.entities)+'</div></div><div class="card"><div class="card-head"><h3>Alternativas</h3><small>score comparativo</small></div><div class="card-body">'+alts+'</div></div></div>'+
  '<div class="grid2" style="margin-top:12px"><div class="card"><div class="card-head"><h3>Evidências históricas</h3><small>'+fmt(r.evidence.length)+' localizada(s)</small></div><div class="card-body timeline">'+ev+'</div></div><div class="card"><div class="card-head"><h3>Mensagem pronta</h3><small>revisão obrigatória</small></div><div class="card-body"><textarea id="routerReady" style="min-height:180px">'+esc(ready)+'</textarea></div></div></div>';
  document.getElementById('routerCopy').onclick=()=>navigator.clipboard?.writeText(document.getElementById('routerReady').value).then(()=>C().toast('Mensagem copiada')).catch(()=>prompt('Copie:',document.getElementById('routerReady').value));
  document.getElementById('routerConfirm').onclick=()=>{overrides.push({source:r.source,target:r.top.p.i,tokens:r.toks,query:r.raw,at:new Date().toISOString()});saveOverrides();r.conf='confirmed';r.label='CONFIRMADA POR VOCÊ';r.top.reasons.unshift('rota confirmada manualmente nesta V12');C().toast('Rota confirmada');renderResult()};
  document.getElementById('routerComposer').onclick=()=>{PrismaApp.activate('messages');setTimeout(()=>PrismaMessages.prefill({group:Number(r.top.p.i),obs:r.raw}),30)};
  document.querySelectorAll('[data-router-alt]').forEach(b=>b.onclick=()=>{const x=r.rows.find(z=>Number(z.p.i)===Number(b.dataset.routerAlt));if(!x)return;r.top=x;r.conf='medium';r.label='SELECIONADA MANUALMENTE';r.evidence=(x.ev||[]).slice(0,5).map(v=>[v[1],'mensagem semelhante']);renderResult()});
  document.querySelectorAll('[data-router-msg]').forEach(b=>b.onclick=()=>PrismaApp.openMessage(Number(b.dataset.routerMsg)));
  document.querySelectorAll('[data-router-point]').forEach(b=>b.onclick=()=>PrismaApp.openPoint(b.dataset.routerPoint));
  document.querySelectorAll('[data-router-machine]').forEach(b=>b.onclick=()=>PrismaApp.openMachine(b.dataset.routerMachine));
}
function renderPage(){
  const host=document.getElementById('page-router');if(!host)return;if(!S().connected){host.innerHTML='<div class="card empty">Conecte a pasta V11 para usar o Roteador NOC.</div>';return}
  const R=S().routerData;if(!R){host.innerHTML='<div class="card empty">A pasta conectada não trouxe router.js. Reconecte a pasta completa do PRISMA.</div>';return}
  buildAssoc();const groups=(R.profiles||[]).slice().sort((a,b)=>String(a.n||'').localeCompare(String(b.n||''),'pt-BR'));
  host.innerHTML='<div class="hero"><h2>ROTEADOR <b>NOC</b></h2><p>Cole a ocorrência. A recomendação cruza vocabulário, tipo de problema, grupo de origem, histórico, regras e evidências reais. Confiança média/ambígua não deve ser usada no automático.</p></div>'+
  '<div class="card"><div class="card-body"><div class="grid2"><label>Grupo onde RECEBI<select id="routerSource"><option value="">Origem opcional</option>'+groups.map(p=>'<option value="'+p.i+'">'+esc(p.n)+'</option>').join('')+'</select></label><label>Tipo<select id="routerIssue"><option value="auto">Detectar automaticamente</option><option value="media">Mídia / conteúdo</option><option value="offline">Offline / acesso</option><option value="hardware">Hardware / físico</option><option value="network">Rede / internet</option><option value="configuration">Configuração</option><option value="activation">Ativação</option><option value="ticket">Chamado / ticket</option><option value="other">Outro</option></select></label></div><label style="display:block;margin-top:10px">Ocorrência<textarea id="routerInput" style="min-height:120px" placeholder="Cole aqui exatamente como recebeu…"></textarea></label><div class="actions" style="margin-top:10px"><button id="routerAnalyze" class="primary">Analisar e sugerir rota</button></div></div></div><div id="routerOut"></div>';
  document.getElementById('routerAnalyze').onclick=analyze;document.getElementById('routerInput').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')analyze()};if(last)renderResult();
}
function invalidate(){last=null;assocMap=new Map();}
window.PrismaRouter={renderPage,invalidate};
})();