(function(){
'use strict';

const R={
  engine:null,promise:null,selected:null,
  feedbackKey:'prisma_v12_route_feedback',
  builtIn:[['elt rp','manutencao iguatemi elt']]
};
const CORE=()=>window.PrismaCore;
const S=()=>CORE().S;
const norm=v=>CORE().norm(v);
const esc=v=>CORE().esc(v);
const fmt=n=>CORE().fmt(n);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const stop=new Set(['a','o','os','as','um','uma','de','da','do','das','dos','e','ou','em','no','na','nos','nas','por','para','pra','pro','com','sem','que','qual','como','quando','onde','se','ao','ate','esse','essa','isso','aqui','ali','ja','mais','menos','muito','bom','boa','dia','tarde','noite','pessoal','galera','favor','obrigado','valeu','gente','pode','podem','vamos','vou','vai','foi','esta','ser','ter','tem','ele','ela','eles','elas','me','te','meu','minha','seu','sua']);
const generic=[/^bom dia[.! ]*$/i,/^boa tarde[.! ]*$/i,/^boa noite[.! ]*$/i,/^obrigad[oa][.! ]*$/i,/^valeu[.! ]*$/i,/^ok[.! ]*$/i,/^blz[.! ]*$/i,/^beleza[.! ]*$/i,/^vamos verificar[.! ]*$/i,/^vou verificar[.! ]*$/i,/^verificando[.! ]*$/i,/^de volta[.! ]*$/i,/^restabelecido[.! ]*$/i,/^normalizado[.! ]*$/i];
const topics=[
 ['MIDIA_CONTEUDO','Mídia / conteúdo',/\b(sem midia|sem mídia|midia|mídia|conteudo|conteúdo|campanha|loop|grade|player|veiculacao|veiculação|criativo)\b/i],
 ['OFFLINE_DESLIGADO','Offline / desligado',/\b(offline|off line|desligad[oa]|fora do ar|sem sinal|inoperante|apagou|apagada|apagado|nao liga|não liga)\b/i],
 ['HARDWARE_TELA','Hardware / tela',/\b(tela quebrad|display|monitor|modulo|módulo|fonte|placa|hardware|avaria|trincad|queimad|led|painel)\b/i],
 ['ENERGIA','Energia',/\b(energia|eletric|disjuntor|tomada|alimentacao|alimentação|sem energia|queda de energia)\b/i],
 ['REDE_CONECTIVIDADE','Rede / conectividade',/\b(internet|modem|roteador|router|4g|5g|rede|conexao|conexão|conectividade|ping|chip|simcard|vpn)\b/i],
 ['ACESSO','Acesso / liberação',/\b(acesso|chave|portaria|autoriz|liberar|liberacao|liberação|entrada|credencial)\b/i],
 ['ATIVACAO','Ativação / instalação',/\b(ativacao|ativação|instalacao|instalação|implantacao|implantação|novo ponto|nova tela|instalar)\b/i],
 ['CONFIGURACAO','Configuração / ajuste',/\b(configur|resolucao|resolução|orientacao|orientação|sincron|ajuste|rotacao|rotação|invertid|parametr)\b/i],
 ['ATIVO_TROCA','Ativo / troca',/\b(troca|trocar|substitu|removido|retirado|instalado|ativo|patrimonio|patrimônio|equipamento novo)\b/i],
 ['CHAMADO','Chamado / ticket',/\b(chamado|ticket|hubspot|ordem de servico|ordem de serviço|os nº|os n)\b/i],
 ['MANUTENCAO','Manutenção / visita',/\b(manutencao|manutenção|tecnico|técnico|reparo|visita|deslocamento|atendimento em campo)\b/i]
];
const reasonLabel={
 quote_cross_group:'mensagem citada entre grupos',
 same_media:'mesma mídia',
 same_ticket:'mesmo chamado/ticket',
 exact_text:'mesmo texto',
 same_asset:'mesmo ativo/patrimônio',
 near_text:'texto muito semelhante',
 same_machine_topic:'mesma máquina + mesmo problema',
 same_point_topic:'mesmo ponto + mesmo problema',
 operator_confirmed:'rota confirmada'
};
function tokens(text){
  const a=norm(text).replace(/https?:\/\/\S+/g,' ').replace(/[^a-z0-9_-]+/g,' ').split(/\s+/).filter(Boolean),out=[],seen=new Set();
  for(const t of a){if(t.length<3&&!/^\d+$/.test(t))continue;if(stop.has(t))continue;if(!seen.has(t)){seen.add(t);out.push(t);}}
  return out;
}
function meaningful(text,t){const n=norm(text);if(n.length<10)return false;for(const r of generic)if(r.test(n))return false;return t.length>=2||/\d{4,}/.test(n);}
function topic(text){const n=norm(text);for(const t of topics)if(t[2].test(n))return t[0];return 'OUTROS';}
function parseTs(m,i){const n=Number(m&&m[1]);if(Number.isFinite(n)&&n>1e12)return n;if(Number.isFinite(n)&&n>1e9)return n*1000;const d=String(m&&m[2]||''),h=String(m&&m[3]||''),dm=d.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/),hm=h.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);if(dm)return Date.UTC(+dm[3],+dm[2]-1,+dm[1],hm?+hm[1]:0,hm?+hm[2]:0,hm&&hm[3]?+hm[3]:0);return i;}
function indexPush(map,k,v){if(k==null||k==='')return;let a=map.get(k);if(!a){a=[];map.set(k,a)}a.push(v);}
function jaccard(a,b){if(!a.size||!b.size)return 0;let inter=0,small=a.size<=b.size?a:b,big=a.size<=b.size?b:a;small.forEach(x=>{if(big.has(x))inter++});return inter/(a.size+b.size-inter);}
function containment(a,b){if(!a.size||!b.size)return 0;let inter=0,small=a.size<=b.size?a:b,big=a.size<=b.size?b:a;small.forEach(x=>{if(big.has(x))inter++});return inter/small.size;}
function pairNearest(list,metas,windowMs,cb,maxBack=24){
  list.sort((a,b)=>metas[a].ts-metas[b].ts||a-b);
  for(let x=1;x<list.length;x++){const bi=list[x],bm=metas[bi];let seen=0;for(let y=x-1;y>=0&&seen<maxBack;y--,seen++){const ai=list[y],am=metas[ai],d=bm.ts-am.ts;if(d<0)continue;if(d>windowMs)break;if(am.g===bm.g)continue;cb(ai,bi,d);break;}}
}
function addPair(E,src,dst,reason,score,anchor,directed){
  if(src===dst)return;let a=E.metas[src],b=E.metas[dst];if(!a||!b||a.g===b.g)return;
  if(!directed&&a.ts>b.ts){const z=src;src=dst;dst=z;a=E.metas[src];b=E.metas[dst];}
  const key=src+'>'+dst;let p=E.pairs.get(key);if(!p){p={src,dst,sg:a.g,dg:b.g,reasonScores:{},anchors:new Set()};E.pairs.set(key,p);}
  p.reasonScores[reason]=Math.max(p.reasonScores[reason]||0,score);if(anchor)p.anchors.add(anchor);
}
function broadcastLike(list,metas){if(list.length<4)return false;const gs=new Set();let min=Infinity,max=-Infinity;for(const i of list){const m=metas[i];gs.add(m.g);min=Math.min(min,m.ts);max=Math.max(max,m.ts);}return gs.size>=3&&max-min<=5*60000;}
function makeMetas(){
  const WA=S().WA,metas=new Array(WA.messages.length),df=new Map(),eventMap=new Map();
  (WA.events||[]).forEach(e=>{const mi=Number(e.m);if(!Number.isInteger(mi)||mi<0||mi>=WA.messages.length)return;let rec=eventMap.get(mi);if(!rec){rec={tickets:new Set(),assets:new Set()};eventMap.set(mi,rec)};(e.tickets||[]).forEach(x=>{if(x!=null&&String(x).trim())rec.tickets.add(String(x).trim())});['oldAssets','newAssets','outAssets','inAssets','assets'].forEach(k=>(e[k]||[]).forEach(x=>{if(x!=null&&String(x).trim())rec.assets.add(String(x).trim())}));});
  WA.messages.forEach((m,i)=>{m=m||[];const text=String(m[6]||''),t=tokens(text),set=new Set(t);set.forEach(x=>df.set(x,(df.get(x)||0)+1));let media=[];(m[14]||[]).forEach(mm=>{if(mm&&mm[0]&&(!mm[7]||mm[7]==='captured'))media.push(String(mm[0])+String(mm[1]||''))});media=[...new Set(media)];const pts=[],mac=[];(m[17]||[]).forEach(x=>{if(x&&Number.isInteger(Number(x[0])))pts.push(Number(x[0]))});(m[18]||[]).forEach(x=>{if(x&&Number.isInteger(Number(x[0])))mac.push(Number(x[0]))});const ev=eventMap.get(i)||{tickets:new Set(),assets:new Set()};metas[i]={i,id:String(m[0]||i),g:Number(m[4]),ts:parseTs(m,i),author:String(m[5]||''),text,nt:norm(text),tokens:t,tokenSet:set,meaningful:meaningful(text,t),topic:topic(text),media,points:[...new Set(pts)],machines:[...new Set(mac)],tickets:[...ev.tickets],assets:[...ev.assets],quoteId:m[11]?String(m[11]):''};});
  return {metas,df};
}
function findGroup(needle){const gs=S().groups,nn=norm(needle),nc=nn.replace(/[^a-z0-9]+/g,'');for(let i=0;i<gs.length;i++){const gn=norm(gs[i].name||'');if(gn===nn||gn.replace(/[^a-z0-9]+/g,'')===nc)return i;}const ts=nn.split(/[^a-z0-9]+/).filter(t=>t.length>=2);let best=null,bestLen=Infinity;for(let i=0;i<gs.length;i++){const gn=norm(gs[i].name||'');if(ts.length&&ts.every(t=>gn.includes(t))&&gn.length<bestLen){best=i;bestLen=gn.length}}return best;}
function feedback(){
  try{return JSON.parse(localStorage.getItem(R.feedbackKey)||'{}')||{}}catch(e){return {}}
}
function conf(route){
  const fb=feedback()[route.sg+'>'+route.dg];if(fb==='negative')return 'SUPRIMIDA';if(route.manualBuiltIn||fb==='positive')return 'CONFIRMADA';
  const c=route.cases,strong=route.strong,avg=route.avgScore,cor=route.corroborated;
  if(strong>=3||(strong>=2&&c>=3)||(c>=5&&avg>=75))return 'CONFIRMADA';
  if(strong>=2||(c>=3&&avg>=68)||(cor>=3&&c>=3))return 'ALTA';
  if(c>=2&&avg>=58)return 'MEDIA';return 'INDICIO';
}
function finalize(E){
  E.pairs.forEach((p,k)=>{const vals=Object.values(p.reasonScores).sort((a,b)=>b-a);p.reasons=Object.keys(p.reasonScores).sort((a,b)=>p.reasonScores[b]-p.reasonScores[a]);p.score=clamp((vals[0]||0)+Math.min(18,Math.max(0,vals.length-1)*7),0,100);if(p.score<65&&p.reasons.length<2)E.pairs.delete(k);});
  const routes=new Map();
  E.pairs.forEach(p=>{const rk=p.sg+'>'+p.dg;let r=routes.get(rk);if(!r){r={sg:p.sg,dg:p.dg,occ:new Map(),manualBuiltIn:false};routes.set(rk,r)}const a=[...p.anchors],order=['ticket:','media:','asset:','machine:','point:','text:','near:'];let anchor='msg:'+E.metas[p.src].id;for(const pref of order){const hit=a.find(x=>x.startsWith(pref));if(hit){anchor=hit;break}}const key=anchor+'|'+Math.floor(E.metas[p.src].ts/(30*60000)),prev=r.occ.get(key);if(!prev||p.score>prev.score)r.occ.set(key,p);});
  R.builtIn.forEach(pair=>{const sg=findGroup(pair[0]),dg=findGroup(pair[1]);if(sg==null||dg==null||sg===dg)return;const k=sg+'>'+dg;let r=routes.get(k);if(!r){r={sg,dg,occ:new Map(),manualBuiltIn:true};routes.set(k,r)}else r.manualBuiltIn=true;});
  const out=new Map(),inc=new Map(),list=[];
  routes.forEach(r=>{r.occurrences=[...r.occ.values()].sort((a,b)=>b.score-a.score);r.cases=r.occurrences.length+(r.manualBuiltIn&&r.occurrences.length===0?1:0);r.strong=r.occurrences.filter(p=>p.score>=85||p.reasons.some(x=>['quote_cross_group','same_media','same_ticket','exact_text'].includes(x))).length+(r.manualBuiltIn?1:0);r.corroborated=r.occurrences.filter(p=>p.reasons.length>=2).length;r.avgScore=r.occurrences.length?r.occurrences.reduce((s,p)=>s+p.score,0)/r.occurrences.length:(r.manualBuiltIn?100:0);r.reasons={};r.topics={};r.occurrences.forEach(p=>{const t=E.metas[p.src].topic;r.topics[t]=(r.topics[t]||0)+1;p.reasons.forEach(x=>r.reasons[x]=(r.reasons[x]||0)+1)});if(r.manualBuiltIn)r.reasons.operator_confirmed=(r.reasons.operator_confirmed||0)+1;r.confidence=conf(r);r.suppressed=r.confidence==='SUPRIMIDA';list.push(r);if(!out.has(r.sg))out.set(r.sg,[]);out.get(r.sg).push(r);if(!inc.has(r.dg))inc.set(r.dg,[]);inc.get(r.dg).push(r);});
  const rank=c=>c==='CONFIRMADA'?4:c==='ALTA'?3:c==='MEDIA'?2:1,sort=(a,b)=>rank(b.confidence)-rank(a.confidence)||b.cases-a.cases||b.strong-a.strong||b.avgScore-a.avgScore;
  out.forEach(a=>a.sort(sort));inc.forEach(a=>a.sort(sort));list.sort(sort);E.routes=routes;E.outByGroup=out;E.inByGroup=inc;E.routeList=list;
}
async function build(){
  if(!S().connected||!S().WA)throw new Error('Conecte a base V11 primeiro.');
  const mt=makeMetas(),E={metas:mt.metas,df:mt.df,pairs:new Map(),routes:new Map(),outByGroup:new Map(),inByGroup:new Map(),routeList:[],msgId:new Map()};
  E.metas.forEach((m,i)=>E.msgId.set(m.id,i));
  for(let i=0;i<E.metas.length;i++){const m=E.metas[i];if(m.quoteId&&E.msgId.has(m.quoteId)){const qi=E.msgId.get(m.quoteId),q=E.metas[qi];if(q.g!==m.g)addPair(E,qi,i,'quote_cross_group',100,'quote:'+m.quoteId,true);}}
  const exact=new Map();E.metas.forEach((m,i)=>{if(m.meaningful)indexPush(exact,m.nt,i)});exact.forEach((list,key)=>{if(list.length<2||list.length>80||broadcastLike(list,E.metas))return;pairNearest(list,E.metas,3*24*3600000,(a,b)=>addPair(E,a,b,'exact_text',90,'text:'+key.slice(0,120),false),24);});
  const media=new Map();E.metas.forEach((m,i)=>m.media.forEach(k=>indexPush(media,k,i)));media.forEach((list,key)=>{if(list.length<2||list.length>60)return;const gs=new Set(list.map(x=>E.metas[x].g));if(gs.size<2||gs.size>8||broadcastLike(list,E.metas))return;const sc=gs.size<=2?97:gs.size<=4?91:82;pairNearest(list,E.metas,7*24*3600000,(a,b)=>addPair(E,a,b,'same_media',sc,'media:'+key,false),28);});
  const ticket=new Map(),asset=new Map();E.metas.forEach((m,i)=>{m.tickets.forEach(k=>indexPush(ticket,k,i));m.assets.forEach(k=>indexPush(asset,k,i))});ticket.forEach((list,key)=>{if(list.length<2||list.length>80)return;pairNearest(list,E.metas,14*24*3600000,(a,b)=>addPair(E,a,b,'same_ticket',96,'ticket:'+key,false),30)});asset.forEach((list,key)=>{if(list.length<2||list.length>80)return;pairNearest(list,E.metas,7*24*3600000,(a,b)=>addPair(E,a,b,'same_asset',83,'asset:'+key,false),30)});
  const ent=new Map();E.metas.forEach((m,i)=>{if(m.topic==='OUTROS')return;m.machines.forEach(x=>indexPush(ent,'m:'+x+'|'+m.topic,i));m.points.forEach(x=>indexPush(ent,'p:'+x+'|'+m.topic,i))});ent.forEach((list,key)=>{if(list.length<2||list.length>90)return;const isM=key.startsWith('m:'),id=key.split('|')[0].slice(2);pairNearest(list,E.metas,36*3600000,(a,b)=>addPair(E,a,b,isM?'same_machine_topic':'same_point_topic',isM?70:66,(isM?'machine:':'point:')+id,false),20)});
  const buckets=new Map();E.metas.forEach((m,i)=>{if(!m.meaningful||m.tokens.length<3)return;const rare=m.tokens.slice().sort((a,b)=>(E.df.get(a)||999999)-(E.df.get(b)||999999)).filter(t=>(E.df.get(t)||0)<=500).slice(0,4);if(rare.length<2)return;for(let a=0;a<rare.length;a++)for(let b=a+1;b<rare.length&&b<a+3;b++)indexPush(buckets,[rare[a],rare[b]].sort().join('|'),i)});buckets.forEach((list,key)=>{if(list.length<2||list.length>70)return;pairNearest(list,E.metas,72*3600000,(a,b)=>{const A=E.metas[a],B=E.metas[b];let inter=0;A.tokenSet.forEach(x=>{if(B.tokenSet.has(x))inter++});if(inter<3)return;const sim=Math.max(jaccard(A.tokenSet,B.tokenSet),containment(A.tokenSet,B.tokenSet)*.9);if(sim<.62)return;addPair(E,a,b,'near_text',Math.round(70+clamp((sim-.62)/.38,0,1)*15),'near:'+key,false)},16)});
  finalize(E);R.engine=E;return E;
}
function ensure(){if(R.engine)return Promise.resolve(R.engine);if(R.promise)return R.promise;R.promise=build().finally(()=>{R.promise=null});return R.promise;}
function groupName(i){return S().groups[i]?.name||('Grupo '+i);}
function levelClass(c){return c==='CONFIRMADA'?'ok':c==='ALTA'?'blue':c==='MEDIA'?'warn':'muted';}
function routeRows(arr,dir){
  if(!arr||!arr.length)return '<div class="empty">Nenhuma rota sustentada na base atual.</div>';
  return arr.filter(r=>!r.suppressed).slice(0,40).map(r=>{const other=dir==='out'?r.dg:r.sg;const reasons=Object.entries(r.reasons).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>(reasonLabel[x[0]]||x[0])+' ('+x[1]+')').join(' • ');return '<button class="route-row" data-route-peer="'+other+'"><span><b>'+esc(groupName(other))+'</b><small>'+esc(reasons||'evidência histórica')+'</small></span><span><span class="chip '+levelClass(r.confidence)+'">'+esc(r.confidence)+'</span><small>'+fmt(r.cases)+' caso(s)</small></span></button>';}).join('');
}
function renderSelected(gi){
  R.selected=gi;const host=document.getElementById('routeResults');if(!host||!R.engine)return;const out=R.engine.outByGroup.get(gi)||[],inc=R.engine.inByGroup.get(gi)||[];
  host.innerHTML='<div class="route-center"><div class="card"><div class="card-head"><h3>CHEGA NESTE GRUPO ←</h3><small>'+fmt(inc.filter(r=>!r.suppressed).length)+' rota(s)</small></div><div class="card-body route-list">'+routeRows(inc,'in')+'</div></div><div class="card route-selected"><div class="card-head"><h3>'+esc(groupName(gi))+'</h3><small>grupo selecionado</small></div><div class="card-body"><div class="audit-row"><b>Mensagens observadas</b><small>'+fmt(S().groups[gi]?.messagesObserved||0)+'</small></div><div class="audit-row"><b>Rotas saindo</b><small>'+fmt(out.filter(r=>!r.suppressed).length)+'</small></div><div class="audit-row"><b>Rotas chegando</b><small>'+fmt(inc.filter(r=>!r.suppressed).length)+'</small></div></div></div><div class="card"><div class="card-head"><h3>→ ENVIA PARA</h3><small>'+fmt(out.filter(r=>!r.suppressed).length)+' rota(s)</small></div><div class="card-body route-list">'+routeRows(out,'out')+'</div></div></div>';
  host.querySelectorAll('[data-route-peer]').forEach(b=>b.onclick=()=>{const v=Number(b.dataset.routePeer);document.getElementById('routeGroupSearch').value=groupName(v);renderSelected(v)});
}
function renderPage(){
  const host=document.getElementById('page-routes');if(!host)return;
  if(!S().connected){host.innerHTML='<div class="card empty">Conecte a pasta V11 para reconstruir as rotas históricas do WhatsApp.</div>';return;}
  host.innerHTML='<div class="hero"><h2>ROTAS DOS <b>GRUPOS</b></h2><p>Reconstrução direcional baseada no histórico: citação entre grupos, mesma mídia, chamado, ativo, texto, ponto/máquina + tipo de problema e similaridade. Evidência original permanece intacta.</p></div><div class="card"><div class="card-body"><div class="search-row"><input id="routeGroupSearch" placeholder="Digite qualquer grupo: ELT-RP, Manutenção, Shopping…"><button id="routeBuild" class="primary">Analisar rotas</button></div><div id="routeBuildStatus" style="margin-top:8px"><small>O cálculo roda localmente sobre as mensagens carregadas.</small></div></div></div><div id="routeResults"></div>';
  const run=async()=>{const st=document.getElementById('routeBuildStatus');st.innerHTML='<small>Construindo mapa histórico de rotas…</small>';try{const E=await ensure();st.innerHTML='<small>'+fmt(E.pairs.size)+' pares de evidência • '+fmt(E.routeList.filter(r=>!r.suppressed).length)+' rotas direcionais.</small>';const q=norm(document.getElementById('routeGroupSearch').value),gs=S().groups.map((g,i)=>({i,n:groupName(i),s:norm(groupName(i))})).filter(x=>!q||x.s.includes(q)).sort((a,b)=>a.n.localeCompare(b.n,'pt-BR'));if(!gs.length){document.getElementById('routeResults').innerHTML='<div class="card empty">Grupo não encontrado.</div>';return;}renderSelected(gs[0].i);}catch(e){st.innerHTML='<small style="color:#ff8f95">Falha: '+esc(e.message||e)+'</small>';}};
  document.getElementById('routeBuild').onclick=run;document.getElementById('routeGroupSearch').onkeydown=e=>{if(e.key==='Enter')run()};if(R.engine){const first=R.selected!=null?R.selected:0;renderSelected(first);}
}
function invalidate(){R.engine=null;R.promise=null;R.selected=null;}
window.PrismaRoutes={renderPage,ensure,invalidate,selectGroup:function(gi){R.selected=Number(gi);if(document.getElementById('routeGroupSearch'))document.getElementById('routeGroupSearch').value=groupName(Number(gi));if(R.engine)renderSelected(Number(gi));else ensure().then(()=>renderSelected(Number(gi))).catch(()=>{});},get engine(){return R.engine}};
})();