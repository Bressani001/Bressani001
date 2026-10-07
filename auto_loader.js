(function(){
'use strict';

let manifestLoaded=false;

function loadManifest(){
  return new Promise((resolve)=>{
    const old=document.getElementById('prismaAutoManifestScript');
    if(old)old.remove();
    try{delete window.__PRISMA_BASE_MANIFEST__}catch(e){window.__PRISMA_BASE_MANIFEST__=undefined}
    const s=document.createElement('script');
    s.id='prismaAutoManifestScript';
    s.src=(location.protocol==='file:')?'./base_manifest.js':('./base_manifest.js?v='+Date.now());
    s.onload=()=>{manifestLoaded=true;resolve(window.__PRISMA_BASE_MANIFEST__||null)};
    s.onerror=()=>{s.remove();resolve(null)};
    document.head.appendChild(s);
  });
}

async function tryLoad(){
  const manifest=await loadManifest();
  if(!manifest)return {loaded:false,reason:'manifest-missing'};
  try{
    const stats=await PrismaCore.connectManifest(manifest);
    return {loaded:true,manifest,stats};
  }catch(e){
    console.error('Falha no auto-load BASE_PRISMA',e);
    return {loaded:false,reason:'connect-failed',error:e};
  }
}

window.PrismaAuto={tryLoad,loadManifest,get manifestLoaded(){return manifestLoaded}};
})();