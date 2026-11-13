(function(){
'use strict';

function q(s,r=document){return r.querySelector(s)}
function qa(s,r=document){return Array.from(r.querySelectorAll(s))}
const C=()=>window.PrismaCore;

function setupSidebar(){
  const btn=q('#sidebarToggle');
  if(!btn)return;
  let collapsed=false;
  try{collapsed=localStorage.getItem('prisma_v13_sidebar')==='collapsed'}catch(e){}
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  btn.textContent=collapsed?'›':'‹';
  btn.onclick=()=>{
    const next=!document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed',next);
    btn.textContent=next?'›':'‹';
    try{localStorage.setItem('prisma_v13_sidebar',next?'collapsed':'open')}catch(e){}
    setTimeout(()=>window.dispatchEvent(new Event('resize')),120);
  };
}

function typeMeta(type){
  return {
    point:['PONTO','⌖'],machine:['MÁQUINA','▣'],group:['GRUPO','◉'],
    ticket:['CHAMADO','#'],asset:['ATIVO','◇'],message:['MENSAGEM','✎']
  }[type]||[String(type||'ITEM').toUpperCase(),'•'];
}

function openResult(r){
  const A=window.PrismaApp;
  if(!A)return;
  if(r.type==='point'&&!r.imported){A.activate('flow360');setTimeout(()=>{window.PrismaFlow?.setCurrentPoint(r.key);window.PrismaFlow?.render360(r.key)},25);return;}
  if(r.type==='machine'&&!r.imported){A.openMachine(r.key);return;}
  if(r.type==='group'){window.PrismaGroups?.openGroup(Number(r.entity.index));return;}
  if(r.type==='message'){A.openMessage(Number(r.entity.index));return;}
  if(r.type==='ticket'){A.openTicket(Number(r.entity.index));return;}
  if(r.type==='asset'){A.openAsset(Number(r.entity.index));return;}
  if(r.imported){A.openImport(r.entity.id);return;}
}

function setupTopSuggestions(){
  const shell=q('.v13-top-search'),input=q('#topQuickSearch');
  if(!shell||!input)return;
  const box=document.createElement('div');
  box.id='topSearchSuggest';
  box.className='top-search-suggest hidden';
  shell.appendChild(box);

  let timer=0,serial=0;
  async function run(){
    const query=input.value.trim(),token=++serial;
    if(query.length<2){box.classList.add('hidden');box.innerHTML='';return;}
    if(!C()?.S?.connected)return;
    box.classList.remove('hidden');
    box.innerHTML='<div class="top-suggest-loading">Buscando…</div>';
    try{
      const rows=await C().search(query,10,'all');
      if(token!==serial)return;
      if(!rows.length){box.innerHTML='<div class="top-suggest-empty">Nada encontrado</div>';return;}
      box.innerHTML=rows.map((r,i)=>{
        const [label,ico]=typeMeta(r.type);
        return '<button class="top-suggest-row" data-suggest-index="'+i+'">'+
          '<span class="top-suggest-ico">'+ico+'</span>'+
          '<span class="top-suggest-copy"><b>'+C().esc(r.title||'')+'</b><small>'+C().esc(r.sub||'')+'</small></span>'+
          '<span class="top-suggest-type">'+label+'</span>'+
        '</button>';
      }).join('');
      qa('[data-suggest-index]',box).forEach(b=>b.onclick=()=>{
        const r=rows[Number(b.dataset.suggestIndex)];
        box.classList.add('hidden');input.blur();openResult(r);
      });
    }catch(e){box.classList.add('hidden')}
  }
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,170)});
  input.addEventListener('focus',()=>{if(input.value.trim().length>=2)run()});
  document.addEventListener('click',e=>{if(!shell.contains(e.target))box.classList.add('hidden')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')box.classList.add('hidden')});
}

function setupNav(){
  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav[data-page]');
    if(!nav)return;
    const d=nav.closest('.nav-more');
    if(d)d.open=true;
  });
  const observer=new MutationObserver(()=>{
    const active=q('.nav.active');
    const details=active?.closest('.nav-more');
    if(details)details.open=true;
  });
  const side=q('#sidebar');
  if(side)observer.observe(side,{subtree:true,attributes:true,attributeFilter:['class']});
}

function setupShortcuts(){
  document.addEventListener('keydown',e=>{
    if(!(e.altKey&&!e.ctrlKey&&!e.metaKey))return;
    const tag=(document.activeElement?.tagName||'').toLowerCase();
    if(/input|textarea|select/.test(tag))return;
    const map={h:'home',b:'search',m:'map',t:'today',r:'router',i:'imports'};
    const page=map[e.key.toLowerCase()];
    if(page){e.preventDefault();window.PrismaApp?.activate(page);}
  });
}

function setupBuildBadge(){
  const copy=q('.brand-copy small');
  if(copy)copy.textContent='PRISMA • V13.1';
  document.title='PRISMA V13.1';
}

function init(){
  setupSidebar();
  setupTopSuggestions();
  setupNav();
  setupShortcuts();
  setupBuildBadge();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
else setTimeout(init,0);
})();