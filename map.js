(function(){
'use strict';

let map=null,markers=null,baseLayers={},activeBase=null,tileErrors=0,currentPoints=[],lastMode='all',lastQuery='';
const MAX_VISIBLE_MARKERS=1800;
const MAX_SIDE_RESULTS=120;

function core(){return window.PrismaCore}
function validCoord(p){
  if(!p||p.lat==null||p.lng==null||String(p.lat).trim()===''||String(p.lng).trim()==='')return false;
  const lat=Number(p.lat),lng=Number(p.lng);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;
}
function importedPoints(){
  return (core().S.imported||[]).filter(r=>r.kind==='point'&&r.data&&validCoord(r.data)).map(r=>({
    _key:'import:'+r.id,_source:'import',_record:r,
    id:r.data.id||'',code:r.data.code||r.entityKey||'',name:r.data.name||r.label||'Ponto importado',
    address:r.data.address||'',city:r.data.city||'',state:r.data.state||'',square:r.data.square||'',
    lat:Number(r.data.lat),lng:Number(r.data.lng),status:r.data.status||'',operationsUrl:r.data.operationsUrl||''
  }));
}
function allPoints(){
  const base=(core().S.points||[]).filter(validCoord);
  const known=new Set();
  for(const p of (core().S.points||[])){
    if(p.id)known.add('id:'+String(p.id).trim().toLowerCase());
    if(p.code)known.add('code:'+String(p.code).trim().toLowerCase());
  }
  const extra=importedPoints().filter(p=>{
    const id=p.id?'id:'+String(p.id).trim().toLowerCase():'';
    const code=p.code?'code:'+String(p.code).trim().toLowerCase():'';
    return !(id&&known.has(id))&&!(code&&known.has(code));
  });
  return base.concat(extra);
}
function mapsUrl(p){
  if(p._source==='import')return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.lat+','+p.lng);
  return core().mapsUrl(p);
}
function operationsUrl(p){
  if(p.operationsUrl)return p.operationsUrl;
  if(p._source!=='import'&&core().operationsPointUrl)return core().operationsPointUrl(p);
  return '';
}
function popup(p){
  const e=core().esc;
  const title=(p.code?e(p.code)+' • ':'')+e(p.name||'Ponto');
  const sub=[p.address,p.city,p.square].filter(Boolean).map(e).join(' • ');
  const open=p._source!=='import'?'<button class="primary" onclick="PrismaApp.openPoint(\''+String(p._key).replace(/'/g,"\\'")+'\')">Abrir ponto</button>':'';
  const ops=operationsUrl(p)?'<a class="btn" target="_blank" rel="noopener" href="'+e(operationsUrl(p))+'">Operações ↗</a>':'';
  const gm='<a class="btn" target="_blank" rel="noopener" href="'+e(mapsUrl(p))+'">Google Maps ↗</a>';
  return '<div class="map-popup"><b>'+title+'</b><small>'+sub+'</small><div class="actions">'+open+ops+gm+'</div></div>';
}
function pointKey(p){return String(p?._key||p?.id||p?.code||p?.name||'')}
function findPoint(key){return currentPoints.find(p=>pointKey(p)===String(key))||allPoints().find(p=>pointKey(p)===String(key))}
function setBasemap(name){
  if(!map)return;
  if(activeBase){try{map.removeLayer(activeBase)}catch(e){}}
  activeBase=baseLayers[name]||baseLayers.none;
  tileErrors=0;
  if(activeBase)activeBase.addTo(map);
  const sel=document.getElementById('mapBasemapSelect');if(sel&&sel.value!==name)sel.value=name;
  document.querySelectorAll('[data-map-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mapMode===name));
  try{localStorage.setItem('prisma_v13_basemap',name)}catch(e){}
}
function tileLayer(url,opts){
  const layer=L.tileLayer(url,opts);
  layer.on('tileerror',()=>{
    tileErrors++;
    if(tileErrors===10){
      const el=document.getElementById('mapTileStatus');
      if(el)el.textContent='Fundo online indisponível • pontos continuam ativos';
      setBasemap('none');
    }
  });
  layer.on('load',()=>{const el=document.getElementById('mapTileStatus');if(el)el.textContent='';});
  return layer;
}
function ensure(){
  const host=document.getElementById('mapCanvas');if(!host)return false;
  if(!window.L){host.innerHTML='<div class="empty">Leaflet local não carregou.</div>';return false;}
  if(map)return true;
  map=L.map(host,{preferCanvas:true,zoomControl:true,attributionControl:true}).setView([-23.5505,-46.6333],11);
  baseLayers={
    streets:tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}),
    satellite:tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}),
    light:tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:16,attribution:'Tiles © Esri'}),
    none:L.layerGroup()
  };
  let initial=navigator.onLine===false?'none':'streets';
  try{const saved=localStorage.getItem('prisma_v13_basemap');if(saved&&baseLayers[saved])initial=saved}catch(e){}
  if(navigator.onLine===false)initial='none';
  setBasemap(initial);
  markers=L.layerGroup().addTo(map);
  map.on('moveend zoomend',drawViewport);
  return true;
}
function boundsFor(points){
  const pts=(points||[]).filter(validCoord);
  if(!pts.length)return null;
  return L.latLngBounds(pts.map(p=>[Number(p.lat),Number(p.lng)]));
}
function visiblePoints(){
  if(!map)return [];
  const b=map.getBounds().pad(.12),out=[];
  for(const p of currentPoints)if(b.contains([Number(p.lat),Number(p.lng)]))out.push(p);
  return out;
}
function drawViewport(){
  if(!map||!markers)return;
  markers.clearLayers();
  const visible=visiblePoints(),limited=visible.slice(0,MAX_VISIBLE_MARKERS);
  for(const p of limited){
    L.circleMarker([Number(p.lat),Number(p.lng)],{
      radius:5,weight:1.2,color:'#ff7a30',fillColor:'#ff5a13',fillOpacity:.88
    }).bindPopup(popup(p),{maxWidth:380}).addTo(markers);
  }
  const el=document.getElementById('mapVisibleCount');
  if(el)el.textContent=visible.length.toLocaleString('pt-BR')+' na área'+(visible.length>MAX_VISIBLE_MARKERS?' • '+MAX_VISIBLE_MARKERS.toLocaleString('pt-BR')+' desenhados':'');
  if(lastMode==='all')renderSideList(visible.slice(0,MAX_SIDE_RESULTS),'Nesta área');
}
function sideItem(p){
  const e=core().esc;
  return '<button class="map-result" data-map-focus="'+e(pointKey(p))+'"><b>'+e((p.code?p.code+' • ':'')+(p.name||'Ponto'))+'</b><small>'+e([p.address,p.city,p.square].filter(Boolean).join(' • ')||'Coordenada '+Number(p.lat).toFixed(5)+', '+Number(p.lng).toFixed(5))+'</small></button>';
}
function renderSideList(points,title){
  const host=document.getElementById('mapResults');if(!host)return;
  const list=(points||[]).slice(0,MAX_SIDE_RESULTS);
  const label=document.getElementById('mapResultLabel');
  if(label)label.textContent=(title||'Resultados')+' • '+(points||[]).length.toLocaleString('pt-BR');
  host.innerHTML=list.length?list.map(sideItem).join(''):'<div class="empty">Nenhum ponto com coordenada.</div>';
  host.querySelectorAll('[data-map-focus]').forEach(b=>b.onclick=()=>focusPoint(b.dataset.mapFocus));
}
function focusPoint(key){
  const p=findPoint(key);if(!p||!ensure())return;
  map.setView([Number(p.lat),Number(p.lng)],17,{animate:true});
  L.popup({maxWidth:380}).setLatLng([Number(p.lat),Number(p.lng)]).setContent(popup(p)).openOn(map);
}
function render(points,fit){
  if(!ensure())return;
  currentPoints=(points||[]).filter(validCoord);
  const total=document.getElementById('mapTotalCount');
  if(total)total.textContent=currentPoints.length.toLocaleString('pt-BR')+' ponto(s)';
  if(fit!==false&&currentPoints.length){
    const b=boundsFor(currentPoints);
    if(currentPoints.length===1)map.setView([currentPoints[0].lat,currentPoints[0].lng],17);
    else map.fitBounds(b,{padding:[30,30],maxZoom:14});
  }
  setTimeout(()=>{map.invalidateSize();drawViewport();if(lastMode!=='all')renderSideList(currentPoints,lastQuery?'Busca: '+lastQuery:'Resultados')},60);
}
async function searchAndRender(q){
  q=String(q||'').trim();lastQuery=q;
  if(!q){
    lastMode='all';
    const pts=allPoints();render(pts,true);renderSideList(pts.slice(0,MAX_SIDE_RESULTS),'Todos os pontos');return;
  }
  lastMode='search';
  const rows=await core().search(q,1600,'point');
  const pts=rows.filter(r=>r.type==='point').map(r=>r.entity).filter(validCoord);
  render(pts,true);renderSideList(pts,'Busca: '+q);
}
function renderPage(){
  const host=document.getElementById('page-map');if(!host)return;
  if(map){try{map.remove()}catch(e){}map=null;markers=null;baseLayers={};activeBase=null;tileErrors=0;}
  host.innerHTML=
    '<div class="map-v13-shell">'+
      '<aside class="map-v13-panel">'+
        '<div class="map-panel-head">'+
          '<div class="map-panel-search"><input id="mapQuery" autocomplete="off" placeholder="Ponto, código, endereço, cidade, praça…"><button id="mapSearch" class="primary">⌕</button></div>'+
          '<div class="map-panel-tools"><button id="mapAll">Mostrar todos</button><select id="mapBasemapSelect"><option value="streets">Ruas</option><option value="satellite">Satélite</option><option value="light">Claro</option><option value="none">Sem fundo</option></select></div>'+
        '</div>'+
        '<div class="map-panel-meta"><span id="mapTotalCount" class="chip blue"></span><span id="mapVisibleCount" class="chip"></span><span id="mapTileStatus" class="muted"></span></div>'+
        '<div class="home-section-head" style="padding:9px 12px 0"><h3 id="mapResultLabel">Nesta área</h3><small>clique para focar</small></div>'+
        '<div id="mapResults" class="map-results"></div>'+
      '</aside>'+
      '<div class="map-stage-v13">'+
        '<div class="map-stage-bar"><div class="map-mode-pill"><button data-map-mode="streets">Ruas</button><button data-map-mode="satellite">Satélite</button><button data-map-mode="light">Claro</button><button data-map-mode="none">Sem fundo</button></div></div>'+
        '<div class="map-wrap"><div id="mapCanvas"></div></div>'+
      '</div>'+
    '</div>';
  currentPoints=[];
  document.getElementById('mapSearch').onclick=()=>searchAndRender(document.getElementById('mapQuery').value);
  document.getElementById('mapAll').onclick=()=>{document.getElementById('mapQuery').value='';searchAndRender('')};
  document.getElementById('mapQuery').onkeydown=e=>{if(e.key==='Enter')searchAndRender(e.target.value)};
  document.getElementById('mapQuery').oninput=(()=>{let t=0;return e=>{clearTimeout(t);if(e.target.value.trim().length>=3)t=setTimeout(()=>searchAndRender(e.target.value),300)}})();
  document.getElementById('mapBasemapSelect').onchange=e=>setBasemap(e.target.value);
  document.querySelectorAll('[data-map-mode]').forEach(b=>b.onclick=()=>setBasemap(b.dataset.mapMode));
  const pts=allPoints();lastMode='all';lastQuery='';render(pts,true);renderSideList(pts.slice(0,MAX_SIDE_RESULTS),'Todos os pontos');
}
function renderSearchPoints(points){
  if(!document.getElementById('mapCanvas'))return;
  lastMode='search';lastQuery='seleção';render(points,true);renderSideList(points,'Seleção');
}
window.PrismaMap={renderPage,render,searchAndRender,renderSearchPoints,allPoints,focusPoint};
})();