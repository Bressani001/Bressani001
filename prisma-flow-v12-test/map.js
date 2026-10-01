(function(){
'use strict';

let map=null,markers=null,baseControl=null,baseLayers={},activeBase=null,tileErrors=0,currentPoints=[],lastMode='all';
const MAX_VISIBLE_MARKERS=1800;

function core(){return window.PrismaCore}
function validCoord(p){if(!p||p.lat==null||p.lng==null||String(p.lat).trim()===''||String(p.lng).trim()==='')return false;const lat=Number(p.lat),lng=Number(p.lng);return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180}
function importedPoints(){
  return (core().S.imported||[]).filter(r=>r.kind==='point'&&r.data&&validCoord(r.data)).map(r=>({
    _key:'import:'+r.id,_source:'import',_record:r,
    id:r.data.id||'',code:r.data.code||r.entityKey||'',name:r.data.name||r.label||'Ponto importado',
    address:r.data.address||'',city:r.data.city||'',state:r.data.state||'',square:r.data.square||'',
    lat:Number(r.data.lat),lng:Number(r.data.lng),status:r.data.status||'',operationsUrl:''
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
function popup(p){
  const e=core().esc;
  const title=(p.code?e(p.code)+' • ':'')+e(p.name||'Ponto');
  const sub=[p.address,p.city,p.square].filter(Boolean).map(e).join(' • ');
  const btn=p._source==='base'?'<button onclick="PrismaApp.openPoint(\''+String(p._key).replace(/'/g,"\\'")+'\')">Abrir 360º</button>':'';
  const ops=p.operationsUrl?'<a class="btn" target="_blank" rel="noopener" href="'+e(p.operationsUrl)+'">Operações ↗</a>':'';
  const gm='<a class="btn primary" target="_blank" rel="noopener" href="'+e(mapsUrl(p))+'">Google Maps ↗</a>';
  return '<div style="min-width:230px"><b>'+title+'</b><div style="font-size:11px;margin:5px 0 8px;color:#555">'+sub+'</div><div style="display:flex;gap:5px;flex-wrap:wrap">'+btn+ops+gm+'</div></div>';
}
function setBasemap(name){
  if(!map)return;
  if(activeBase){try{map.removeLayer(activeBase)}catch(e){}}
  activeBase=baseLayers[name]||baseLayers.none;
  tileErrors=0;
  if(activeBase)activeBase.addTo(map);
  const sel=document.getElementById('mapBasemapSelect');if(sel&&sel.value!==name)sel.value=name;
  try{localStorage.setItem('prisma_v12_basemap',name)}catch(e){}
}
function tileLayer(url,opts){
  const layer=L.tileLayer(url,opts);
  layer.on('tileerror',()=>{
    tileErrors++;
    if(tileErrors===12){
      const el=document.getElementById('mapTileStatus');
      if(el)el.innerHTML='<span class="chip warn">Fundo indisponível. Troque a visualização.</span>';
    }
  });
  layer.on('load',()=>{const el=document.getElementById('mapTileStatus');if(el)el.innerHTML='';});
  return layer;
}
function ensure(){
  const host=document.getElementById('mapCanvas');if(!host)return false;
  if(!window.L){
    host.innerHTML='<div class="empty">O mapa usa Leaflet. O carregamento da biblioteca falhou. Verifique a internet e recarregue.</div>';
    return false;
  }
  if(map)return true;
  map=L.map(host,{preferCanvas:true,zoomControl:true}).setView([-23.5505,-46.6333],11);

  baseLayers={
    streets:tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {maxZoom:19,attribution:'Tiles &copy; Esri'}
    ),
    satellite:tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {maxZoom:19,attribution:'Tiles &copy; Esri'}
    ),
    light:tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {maxZoom:16,attribution:'Tiles &copy; Esri'}
    ),
    none:L.layerGroup()
  };

  let initial='streets';try{initial=localStorage.getItem('prisma_v12_basemap')||'streets'}catch(e){}
  if(!baseLayers[initial])initial='streets';
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
function drawViewport(){
  if(!map||!markers)return;
  markers.clearLayers();
  const bounds=map.getBounds().pad(.12);
  const visible=[];
  for(const p of currentPoints){
    if(bounds.contains([Number(p.lat),Number(p.lng)]))visible.push(p);
  }
  const limited=visible.slice(0,MAX_VISIBLE_MARKERS);
  for(const p of limited){
    L.circleMarker([Number(p.lat),Number(p.lng)],{
      radius:5,weight:1,fillOpacity:.85
    }).bindPopup(popup(p),{maxWidth:360}).addTo(markers);
  }
  const el=document.getElementById('mapVisibleCount');
  if(el)el.textContent=visible.length.toLocaleString('pt-BR')+' visível(is)'+(visible.length>MAX_VISIBLE_MARKERS?' • '+MAX_VISIBLE_MARKERS.toLocaleString('pt-BR')+' desenhados':'');
}
function render(points,fit){
  if(!ensure())return;
  currentPoints=(points||[]).filter(validCoord);
  const total=document.getElementById('mapTotalCount');
  if(total)total.textContent=currentPoints.length.toLocaleString('pt-BR')+' marcado(s)';
  if(fit!==false&&currentPoints.length){
    const b=boundsFor(currentPoints);
    if(currentPoints.length===1)map.setView([currentPoints[0].lat,currentPoints[0].lng],16);
    else map.fitBounds(b,{padding:[25,25],maxZoom:14});
  }else drawViewport();
  setTimeout(function(){map.invalidateSize();drawViewport();},50);
}
function searchAndRender(q){
  q=String(q||'').trim();
  if(!q){lastMode='all';render(allPoints(),true);return Promise.resolve();}
  lastMode='search';
  return core().search(q,1200,'point').then(rows=>{
    const pts=rows.filter(r=>r.type==='point').map(r=>r.entity).filter(validCoord);
    render(pts,true);
  });
}
function renderPage(){
  const host=document.getElementById('page-map');if(!host)return;
  if(map){try{map.remove()}catch(e){}map=null;markers=null;baseControl=null;baseLayers={};activeBase=null;tileErrors=0;}
  host.innerHTML=
    '<div class="map-toolbar">'+
      '<input id="mapQuery" placeholder="Pesquisar ponto, endereço, cidade, praça…">'+
      '<button id="mapSearch" class="primary">Pesquisar no mapa</button>'+
      '<button id="mapAll">Mostrar todos</button>'+
      '<label class="map-view-label">Visualização<select id="mapBasemapSelect"><option value="streets">Ruas</option><option value="satellite">Satélite</option><option value="light">Claro</option><option value="none">Sem fundo</option></select></label>'+
      '<span id="mapTileStatus"></span>'+
      '<span id="mapTotalCount" class="chip blue"></span>'+
      '<span id="mapVisibleCount" class="chip"></span>'+
    '</div>'+
    '<div class="map-wrap"><div id="mapCanvas"></div></div>'+
    '<div class="card" style="margin-top:8px"><small>O mapa mantém todos os pontos na busca, mas desenha no máximo '+MAX_VISIBLE_MARKERS.toLocaleString('pt-BR')+' pins por área visível para não travar o navegador. Dê zoom para detalhar.</small></div>';
  currentPoints=[];
  document.getElementById('mapSearch').onclick=()=>searchAndRender(document.getElementById('mapQuery').value);
  document.getElementById('mapAll').onclick=()=>{document.getElementById('mapQuery').value='';searchAndRender('');};
  document.getElementById('mapQuery').onkeydown=e=>{if(e.key==='Enter')searchAndRender(e.target.value);};
  const saved=(()=>{try{return localStorage.getItem('prisma_v12_basemap')||'streets'}catch(e){return 'streets'}})();document.getElementById('mapBasemapSelect').value=saved;
  document.getElementById('mapBasemapSelect').onchange=e=>setBasemap(e.target.value);
  render(allPoints(),true);
}
function renderSearchPoints(points){
  if(!document.getElementById('mapCanvas'))return;
  render(points,true);
}
window.PrismaMap={renderPage,render,searchAndRender,renderSearchPoints,allPoints};
})();