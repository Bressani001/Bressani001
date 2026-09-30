(function(){
'use strict';

let map=null,markers=null,lastMode='all';

function core(){return window.PrismaCore}
function validCoord(p){return Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&Number(p.lat)>=-90&&Number(p.lat)<=90&&Number(p.lng)>=-180&&Number(p.lng)<=180}
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
  return base.concat(importedPoints());
}
function mapsUrl(p){
  if(p._source==='import'){
    return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.lat+','+p.lng);
  }
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
function ensure(){
  const host=document.getElementById('mapCanvas');if(!host)return false;
  if(!window.L){
    host.innerHTML='<div class="empty">O mapa usa Leaflet + OpenStreetMap. O carregamento da biblioteca falhou. Verifique a internet e recarregue.</div>';
    return false;
  }
  if(map)return true;
  map=L.map(host,{preferCanvas:true}).setView([-23.5505,-46.6333],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'&copy; OpenStreetMap'
  }).addTo(map);
  markers=L.layerGroup().addTo(map);
  map.on('moveend',updateVisibleCount);
  return true;
}
function updateVisibleCount(){
  const el=document.getElementById('mapVisibleCount');if(!el||!map||!markers)return;
  let n=0;const b=map.getBounds();
  markers.eachLayer(m=>{if(m.getLatLng&&b.contains(m.getLatLng()))n++;});
  el.textContent=n.toLocaleString('pt-BR')+' ponto(s) visíveis';
}
function render(points,fit){
  if(!ensure())return;
  markers.clearLayers();
  const arr=(points||[]).filter(validCoord);
  const clusterBounds=[];
  arr.forEach(p=>{
    const marker=L.marker([Number(p.lat),Number(p.lng)]).bindPopup(popup(p),{maxWidth:360});
    marker.addTo(markers);clusterBounds.push([Number(p.lat),Number(p.lng)]);
  });
  if(fit!==false&&clusterBounds.length){
    if(clusterBounds.length===1)map.setView(clusterBounds[0],16);
    else map.fitBounds(clusterBounds,{padding:[30,30],maxZoom:15});
  }
  updateVisibleCount();
  const total=document.getElementById('mapTotalCount');if(total)total.textContent=arr.length.toLocaleString('pt-BR')+' marcado(s)';
  setTimeout(()=>map.invalidateSize(),40);
}
function searchAndRender(q){
  q=String(q||'').trim();
  if(!q){lastMode='all';render(allPoints(),true);return Promise.resolve();}
  lastMode='search';
  return core().search(q,500,'point').then(rows=>render(rows.filter(r=>r.type==='point').map(r=>r.entity).filter(validCoord),true));
}
function renderPage(){
  const host=document.getElementById('page-map');if(!host)return;
  host.innerHTML=
    '<div class="map-toolbar">'+
      '<input id="mapQuery" placeholder="Pesquisar ponto, endereço, cidade, praça…">'+
      '<button id="mapSearch" class="primary">Pesquisar no mapa</button>'+
      '<button id="mapAll">Mostrar todos</button>'+
      '<span id="mapTotalCount" class="chip blue"></span>'+
      '<span id="mapVisibleCount" class="chip"></span>'+
    '</div>'+
    '<div class="map-wrap"><div id="mapCanvas"></div></div>';
  map=null;markers=null;
  document.getElementById('mapSearch').onclick=()=>searchAndRender(document.getElementById('mapQuery').value);
  document.getElementById('mapAll').onclick=()=>{document.getElementById('mapQuery').value='';searchAndRender('');};
  document.getElementById('mapQuery').onkeydown=e=>{if(e.key==='Enter')searchAndRender(e.target.value);};
  render(allPoints(),true);
}
function renderSearchPoints(points){
  if(!document.getElementById('mapCanvas'))return;
  render(points,true);
}
window.PrismaMap={renderPage,render,searchAndRender,renderSearchPoints,allPoints};
})();