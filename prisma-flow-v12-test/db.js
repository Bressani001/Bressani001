(function () {
  'use strict';

  const DB_NAME = 'prisma_flow_v12_test';
  const DB_VERSION = 3;
  const STORES = {
    corrections: { keyPath: 'id' },
    imports: { keyPath: 'id', indexes: [['importedAt', 'importedAt'], ['active', 'active']] },
    importRecords: { keyPath: 'id', indexes: [['importId', 'importId'], ['kind', 'kind'], ['entityKey', 'entityKey']] },
    mappings: { keyPath: 'id' },
    settings: { keyPath: 'id' },
    audit: { keyPath: 'id', indexes: [['at', 'at'], ['entityId', 'entityId']] },
    sources: { keyPath: 'id' },
    tasks: { keyPath: 'id', indexes: [['status','status'],['dueAt','dueAt'],['updatedAt','updatedAt']] },
    favorites: { keyPath: 'id', indexes: [['kind','kind']] },
    templates: { keyPath: 'id' },
    destinations: { keyPath: 'id', indexes: [['kind','kind'],['name','name']] },
    contacts: { keyPath: 'id' },
    ticketMap: { keyPath: 'id' },
    notes: { keyPath: 'id' },
    passwords: { keyPath: 'id' }
  };

  let dbPromise = null;

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB não está disponível neste navegador.'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        Object.keys(STORES).forEach(function (name) {
          const cfg = STORES[name];
          let store;
          if (!db.objectStoreNames.contains(name)) {
            store = db.createObjectStore(name, { keyPath: cfg.keyPath });
          } else {
            store = req.transaction.objectStore(name);
          }
          (cfg.indexes || []).forEach(function (idx) {
            if (!store.indexNames.contains(idx[0])) {
              store.createIndex(idx[0], idx[1], { unique: false });
            }
          });
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Falha ao abrir o banco local da V12.')); };
      req.onblocked = function () { reject(new Error('Banco V12 bloqueado por outra aba. Feche outras abas do PRISMA V12 e tente novamente.')); };
    });
    return dbPromise;
  }

  function request(storeName, mode, action) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, mode || 'readonly');
        const store = tx.objectStore(storeName);
        let req;
        try {
          req = action(store, tx);
        } catch (err) {
          reject(err);
          return;
        }
        if (req && typeof req.onsuccess !== 'undefined') {
          req.onsuccess = function () { resolve(req.result); };
          req.onerror = function () { reject(req.error || new Error('Falha na operação com ' + storeName + '.')); };
        } else {
          tx.oncomplete = function () { resolve(req); };
          tx.onerror = function () { reject(tx.error || new Error('Falha na transação com ' + storeName + '.')); };
          tx.onabort = function () { reject(tx.error || new Error('Transação cancelada em ' + storeName + '.')); };
        }
      });
    });
  }

  function get(store, id) {
    return request(store, 'readonly', function (s) { return s.get(id); }).then(function (x) { return x || null; });
  }

  function put(store, value) {
    if (!value || typeof value !== 'object') return Promise.reject(new Error('Registro inválido.'));
    if (!value.id) value.id = uid(store.slice(0, 4));
    return request(store, 'readwrite', function (s) { return s.put(value); }).then(function () { return value; });
  }

  function del(store, id) {
    return request(store, 'readwrite', function (s) { return s.delete(id); }).then(function () { return true; });
  }

  function all(store) {
    return request(store, 'readonly', function (s) { return s.getAll(); }).then(function (x) { return x || []; });
  }

  function byIndex(store, indexName, value) {
    return request(store, 'readonly', function (s) { return s.index(indexName).getAll(value); }).then(function (x) { return x || []; });
  }

  function clear(store) {
    return request(store, 'readwrite', function (s) { return s.clear(); }).then(function () { return true; });
  }

  function bulkPut(storeName, rows, chunkSize) {
    rows = Array.isArray(rows) ? rows : [];
    chunkSize = chunkSize || 800;
    let pos = 0;
    function next() {
      if (pos >= rows.length) return Promise.resolve(rows.length);
      const part = rows.slice(pos, pos + chunkSize);
      pos += part.length;
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          part.forEach(function (row) { store.put(row); });
          tx.oncomplete = resolve;
          tx.onerror = function () { reject(tx.error || new Error('Falha ao gravar lote em ' + storeName + '.')); };
          tx.onabort = function () { reject(tx.error || new Error('Lote cancelado em ' + storeName + '.')); };
        });
      }).then(next);
    }
    return next();
  }

  function setting(key, fallback) {
    return get('settings', key).then(function (x) { return x ? x.value : fallback; });
  }

  function setSetting(key, value) {
    return put('settings', { id: key, value: value, updatedAt: new Date().toISOString() });
  }

  function audit(type, label, entityId, meta) {
    return put('audit', {
      id: uid('audit'),
      type: type || 'acao',
      label: String(label || ''),
      entityId: entityId || '',
      meta: meta || {},
      at: new Date().toISOString()
    });
  }

  async function removeImport(importId) {
    const records = await byIndex('importRecords', 'importId', importId);
    const db = await open();
    await new Promise(function (resolve, reject) {
      const tx = db.transaction(['importRecords', 'imports'], 'readwrite');
      const rs = tx.objectStore('importRecords');
      records.forEach(function (r) { rs.delete(r.id); });
      tx.objectStore('imports').delete(importId);
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error || new Error('Falha ao excluir importação.')); };
    });
    return true;
  }

  async function exportAll() {
    const data={product:'PRISMA FLOW',version:12,db:DB_NAME,exportedAt:new Date().toISOString(),stores:{},localStorage:{}};
    for(const name of Object.keys(STORES)) data.stores[name]=await all(name);
    for(const key of ['prisma_v12_router_overrides','prisma_v12_route_feedback']){
      try{const v=localStorage.getItem(key);if(v!=null)data.localStorage[key]=v}catch(e){}
    }
    return data;
  }
  async function importAll(data,replace) {
    if(!data||data.product!=='PRISMA FLOW'||!data.stores)throw new Error('Backup PRISMA FLOW inválido.');
    for(const name of Object.keys(STORES)){
      if(replace)await clear(name);
      const rows=Array.isArray(data.stores[name])?data.stores[name]:[];
      if(rows.length)await bulkPut(name,rows,500);
    }
    if(data.localStorage&&typeof data.localStorage==='object'){
      for(const key of ['prisma_v12_router_overrides','prisma_v12_route_feedback']){
        if(Object.prototype.hasOwnProperty.call(data.localStorage,key)){
          try{localStorage.setItem(key,String(data.localStorage[key]))}catch(e){}
        }
      }
    }
    return true;
  }

  window.PrismaDB = {
    name: DB_NAME,
    version: DB_VERSION,
    uid: uid,
    open: open,
    get: get,
    put: put,
    delete: del,
    all: all,
    byIndex: byIndex,
    clear: clear,
    bulkPut: bulkPut,
    setting: setting,
    setSetting: setSetting,
    audit: audit,
    removeImport: removeImport,
    exportAll: exportAll,
    importAll: importAll
  };
})();