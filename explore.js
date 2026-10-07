(function(){
'use strict';
const C=()=>window.PrismaCore,S=()=>C().S;
const esc=v=>C().esc(v),fmt=n=>C().fmt(n),norm=v=>C().norm(v);
const EVENT_LABEL={asset_swap:'Troca de ativo',outage:'Indisponibilidade',restored:'Restabelecimento',configuration:'Configuração',activation:'Ativação',access:'Acesso / liberação',maintenance:'Manutenção',ticket:'Chamado',inventory:'Estoque / movimentação'};
let tab='points';

function renderPage(next){
  if(next)tab=next;const host=document.getElementById('page-explore');if(!host)return;
  if(!S().connected){host.innerHTML='<div class="card empty">Conecte a pasta V11 para explorar a base.</div>';return}
  host.innerHTML='<div class="hero"><h2>EXPLORAR <b>BASE</b></h2><p>As antigas telas separadas ficam reunidas aqui. A busca global continua sendo o caminho mais rápido.</p></div>'+
    '<div class="tabs"><button data-explore="points">Pontos</button><button data-explore="machines">Máquinas</button><button data-explore="whatsapp">WhatsApp</button><button data-explore="events">Eventos</button><button data-explore="assets">Ativos</button><button data-explore="tickets">Chamados</button></div>'+
    '<div class="card"><div class="card-body"><div class="search-row"><input id="exploreQuery" placeholder="Filtrar esta visão…"><select id="exploreLimit"><option>100</option><option selected>300</option><option>500</option><option>1000</option></select></div></div></div><div id="exploreOut"></div>';
  host.querySelectorAll('[data-explore]').forEach(b=>{b.classList.toggle('active',b.dataset.explore===tab);b.onclick=()=>renderPage(b.dataset.explore)});
  document.getElementById('exploreQuery').oninput=draw;document.getElementById('exploreLimit').onchange=draw;draw();
}
function draw(){
  const out=document.getElementById('exploreOut');if(!out)return;const q=norm(document.getElementById('exploreQuery').value),limit=Number(document.getElementById('exploreLimit').value||300);
  if(tab==='points')return drawPoints(out,q,limit);
  if(tab==='machines')return drawMachines(out,q,limit);
  if(tab==='whatsapp')return drawMessages(out,q,limit);
  if(tab==='events')return drawEvents(out,q,limit);
  if(tab==='assets')return drawAssets(out,q,limit);
  if(tab==='tickets')return drawTickets(out,q,limit);
}
function drawPoints(out,q,limit){
  const rows=S().points.filter(p=>!q||norm([p.id,p.code,p.name,p.address,p.city,p.square,p.status].join(' ')).includes(q)).slice(0,limit);
  out.innerHTML='<div class="card result-section"><div class="card-head"><h3>Pontos</h3><small>'+fmt(rows.length)+' exibido(s)</small></div><div class="tablewrap"><table><thead><tr><th>ID</th><th>Código</th><th>Ponto</th><th>Endereço</th><th>Praça</th><th>Status</th><th></th></tr></thead><tbody>'+rows.map(p=>'<tr><td>'+esc(p.id)+'</td><td><b>'+esc(p.code)+'</b></td><td>'+esc(p.name)+'</td><td>'+esc(p.address)+'</td><td>'+esc(p.square)+'</td><td>'+esc(p.status)+'</td><td><button data-exp-point="'+esc(p._key)+'">Abrir</button></td></tr>').join('')+'</tbody></table></div></div>';
  out.querySelectorAll('[data-exp-point]').forEach(b=>b.onclick=()=>PrismaApp.openPoint(b.dataset.expPoint));
}
function drawMachines(out,q,limit){
  const rows=S().machines.filter(m=>!q||norm([m.id,m.name,m.pointCode,m.pointName,m.square,m.os,m.ip].join(' ')).includes(q)).slice(0,limit);
  out.innerHTML='<div class="card result-section"><div class="card-head"><h3>Máquinas</h3><small>'+fmt(rows.length)+' exibida(s)</small></div><div class="tablewrap"><table><thead><tr><th>ID</th><th>Máquina</th><th>Ponto</th><th>Praça</th><th>SO</th><th>IP</th><th></th></tr></thead><tbody>'+rows.map(m=>'<tr><td><b>'+esc(m.id)+'</b></td><td>'+esc(m.name)+'</td><td>'+esc([m.pointCode,m.pointName].filter(Boolean).join(' • '))+'</td><td>'+esc(m.square)+'</td><td>'+esc(m.os)+'</td><td>'+esc(m.ip)+'</td><td><button data-exp-machine="'+esc(m._key)+'">Abrir</button></td></tr>').join('')+'</tbody></table></div></div>';
  out.querySelectorAll('[data-exp-machine]').forEach(b=>b.onclick=()=>PrismaApp.openMachine(b.dataset.expMachine));
}
function drawMessages(out,q,limit){
  const rows=[];for(let i=S().messages.length-1;i>=0&&rows.length<limit;i--){const m=S().messages[i]||[],g=S().groups[m[4]]||{},blob=norm([m[2],m[3],m[5],m[6],m[10],g.name].join(' '));if(q&&!blob.includes(q))continue;rows.push({i,m,g})}
  out.innerHTML='<div class="card result-section"><div class="card-head"><h3>WhatsApp</h3><small>'+fmt(rows.length)+' exibida(s)</small></div><div class="timeline">'+rows.map(x=>'<button class="timeline-row" data-exp-msg="'+x.i+'"><div class="meta">'+esc([x.m[2],x.m[3],x.g.name,x.m[5]].filter(Boolean).join(' • '))+'</div><div>'+esc(x.m[6]||x.m[10]||'(sem texto)')+'</div></button>').join('')+'</div></div>';
  out.querySelectorAll('[data-exp-msg]').forEach(b=>b.onclick=()=>PrismaApp.openMessage(Number(b.dataset.expMsg)));
}
function drawEvents(out,q,limit){
  const rows=(S().WA?.events||[]).map((e,i)=>({e,i,m:S().messages[Number(e.m)]||[]})).sort((a,b)=>Number(b.m[1]||0)-Number(a.m[1]||0)).filter(x=>{const g=S().groups[x.m[4]]||{};return !q||norm([(x.e.types||[]).join(' '),x.m[6],g.name,(x.e.tickets||[]).join(' '),(x.e.assets||[]).join(' ')].join(' ')).includes(q)}).slice(0,limit);
  out.innerHTML='<div class="card result-section"><div class="card-head"><h3>Eventos</h3><small>'+fmt(rows.length)+' exibido(s)</small></div><div class="tablewrap"><table><thead><tr><th>Data</th><th>Evento</th><th>Grupo</th><th>Mensagem</th><th>Identificadores</th><th></th></tr></thead><tbody>'+rows.map(x=>{const g=S().groups[x.m[4]]||{},ids=[...(x.e.oldAssets||[]),...(x.e.newAssets||[]),...(x.e.outAssets||[]),...(x.e.inAssets||[]),...(x.e.assets||[]),...(x.e.tickets||[])].join(', ');return '<tr><td>'+esc([x.m[2],x.m[3]].filter(Boolean).join(' '))+'</td><td>'+esc((x.e.types||[]).map(t=>EVENT_LABEL[t]||t).join(', '))+'</td><td>'+esc(g.name||'')+'</td><td>'+esc(String(x.m[6]||'').slice(0,180))+'</td><td>'+esc(ids)+'</td><td><button data-exp-event-msg="'+x.e.m+'">Evidência</button></td></tr>'}).join('')+'</tbody></table></div></div>';
  out.querySelectorAll('[data-exp-event-msg]').forEach(b=>b.onclick=()=>PrismaApp.openMessage(Number(b.dataset.expEventMsg)));
}
function drawAssets(out,q,limit){
  const rows=S().assets.map((r,i)=>({r,i})).filter(x=>!q||norm(x.r[0]).includes(q)).slice(0,limit);
  out.innerHTML='<div class="card result-section"><div class="card-head"><h3>Ativos</h3><small>'+fmt(rows.length)+' exibido(s)</small></div><div class="tablewrap"><table><thead><tr><th>Ativo</th><th>Ocorrências</th><th>Pontos</th><th>Máquinas</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><b>'+esc(x.r[0])+'</b></td><td>'+fmt((x.r[1]||[]).length)+'</td><td>'+fmt((x.r[2]||[]).length)+'</td><td>'+fmt((x.r[3]||[]).length)+'</td><td><button data-exp-asset="'+x.i+'">Abrir</button></td></tr>').join('')+'</tbody></table></div></div>';
  out.querySelectorAll('[data-exp-asset]').forEach(b=>b.onclick=()=>PrismaApp.openAsset(Number(b.dataset.expAsset)));
}
function drawTickets(out,q,limit){
  const rows=S().tickets.map((r,i)=>({r,i})).filter(x=>!q||norm(x.r[0]).includes(q)).slice(0,limit);
  out.innerHTML='<div class="card result-section"><div class="card-head"><h3>Chamados</h3><small>'+fmt(rows.length)+' exibido(s)</small></div><div class="tablewrap"><table><thead><tr><th>Chamado</th><th>Ocorrências</th><th>Pontos</th><th>Máquinas</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><b>'+esc(x.r[0])+'</b></td><td>'+fmt((x.r[1]||[]).length)+'</td><td>'+fmt((x.r[2]||[]).length)+'</td><td>'+fmt((x.r[3]||[]).length)+'</td><td><button data-exp-ticket="'+x.i+'">Abrir</button></td></tr>').join('')+'</tbody></table></div></div>';
  out.querySelectorAll('[data-exp-ticket]').forEach(b=>b.onclick=()=>PrismaApp.openTicket(Number(b.dataset.expTicket)));
}
window.PrismaExplore={renderPage};
})();