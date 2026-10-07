(function(){
'use strict';
var DB_NAME='prisma_flow_v11';
var DB_VERSION=1;
var STORES=['tasks','cases','activity','favorites','settings','imports','meta'];
var dbp=null;
function uid(prefix){return (prefix||'id')+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9)}
function open(){
 if(dbp)return dbp;
 dbp=new Promise(function(resolve,reject){
  if(!window.indexedDB){reject(new Error('IndexedDB indisponível neste navegador.'));return}
  var req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=function(){
   var db=req.result;
   STORES.forEach(function(name){
    if(!db.objectStoreNames.contains(name)){
     var st=db.createObjectStore(name,{keyPath:'id'});
     if(name==='tasks'){st.createIndex('status','status',{unique:false});st.createIndex('updatedAt','updatedAt',{unique:false});}
     if(name==='activity'){st.createIndex('at','at',{unique:false});}
     if(name==='favorites'){st.createIndex('kind','kind',{unique:false});}
     if(name==='imports'){st.createIndex('importedAt','importedAt',{unique:false});}
    }
   });
  };
  req.onsuccess=function(){resolve(req.result)};
  req.onerror=function(){reject(req.error||new Error('Falha ao abrir IndexedDB.'))};
 });
 return dbp;
}
function tx(store,mode,fn){
 return open().then(function(db){return new Promise(function(resolve,reject){
  var tr=db.transaction(store,mode||'readonly'),st=tr.objectStore(store),out;
  try{out=fn(st,tr)}catch(e){reject(e);return}
  tr.oncomplete=function(){resolve(out)};
  tr.onerror=function(){reject(tr.error||new Error('Falha na transação.'))};
  tr.onabort=function(){reject(tr.error||new Error('Transação cancelada.'))};
 })});
}
function put(store,obj){
 if(!obj||typeof obj!=='object')return Promise.reject(new Error('Registro inválido.'));
 if(!obj.id)obj.id=uid(store.slice(0,3));
 return open().then(function(db){return new Promise(function(resolve,reject){
  var tr=db.transaction(store,'readwrite'),req=tr.objectStore(store).put(obj);
  req.onsuccess=function(){resolve(obj)};req.onerror=function(){reject(req.error)};
 })});
}
function get(store,id){
 return open().then(function(db){return new Promise(function(resolve,reject){
  var req=db.transaction(store,'readonly').objectStore(store).get(id);
  req.onsuccess=function(){resolve(req.result||null)};req.onerror=function(){reject(req.error)};
 })});
}
function all(store){
 return open().then(function(db){return new Promise(function(resolve,reject){
  var req=db.transaction(store,'readonly').objectStore(store).getAll();
  req.onsuccess=function(){resolve(req.result||[])};req.onerror=function(){reject(req.error)};
 })});
}
function del(store,id){
 return open().then(function(db){return new Promise(function(resolve,reject){
  var req=db.transaction(store,'readwrite').objectStore(store).delete(id);
  req.onsuccess=function(){resolve(true)};req.onerror=function(){reject(req.error)};
 })});
}
function clear(store){
 return open().then(function(db){return new Promise(function(resolve,reject){
  var req=db.transaction(store,'readwrite').objectStore(store).clear();
  req.onsuccess=function(){resolve(true)};req.onerror=function(){reject(req.error)};
 })});
}
function setting(key,fallback){
 return get('settings',key).then(function(x){return x?x.value:fallback});
}
function setSetting(key,value){
 return put('settings',{id:key,value:value,updatedAt:new Date().toISOString()});
}
function activity(type,label,meta){
 return put('activity',{id:uid('act'),type:type||'acao',label:String(label||''),meta:meta||{},at:new Date().toISOString()});
}
function migrateLegacy(){
 return get('meta','legacy_migration_v11').then(function(done){
  if(done)return done;
  var keys=['eletromidia_password_overlay_v2','eletromidia_notes_v5','eletromidia_favorites_v5','eletromidia_message_notes_v6','eletromidia_router_confirmed_v7','prisma_templates_v10','prisma_whatsapp_links_v10','prisma_slack_channels_v10','prisma_contacts_v10','prisma_ops_ticket_map_v10','prisma_recent_search_v10'];
  var snap={};
  keys.forEach(function(k){try{var v=localStorage.getItem(k);if(v!=null)snap[k]=v}catch(e){}});
  return put('meta',{id:'legacy_migration_v11',migratedAt:new Date().toISOString(),snapshot:snap,note:'Cópia de segurança. As chaves originais foram preservadas.'});
 });
}
function exportAll(){
 return Promise.all(STORES.map(function(s){return all(s).then(function(rows){return [s,rows]})})).then(function(parts){
  var data={product:'PRISMA FLOW',version:11,exportedAt:new Date().toISOString(),stores:{}};
  parts.forEach(function(p){data.stores[p[0]]=p[1]});
  return data;
 });
}
function importAll(data,replace){
 if(!data||!data.stores)return Promise.reject(new Error('Backup PRISMA inválido.'));
 var seq=Promise.resolve();
 STORES.forEach(function(s){
  var rows=Array.isArray(data.stores[s])?data.stores[s]:[];
  seq=seq.then(function(){return replace?clear(s):true}).then(function(){
   return rows.reduce(function(p,row){return p.then(function(){return put(s,row)})},Promise.resolve());
  });
 });
 return seq.then(function(){return true});
}
window.PRISMA_DB={
 name:DB_NAME,version:DB_VERSION,stores:STORES.slice(),uid:uid,open:open,put:put,get:get,all:all,delete:del,clear:clear,
 setting:setting,setSetting:setSetting,activity:activity,migrateLegacy:migrateLegacy,exportAll:exportAll,importAll:importAll
};
})();