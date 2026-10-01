(function(){
'use strict';

const C=()=>window.PrismaCore;
const SEMANTICS=[
 {id:'ignore',label:'Ignorar'},
 {id:'pointId',label:'Ponto • ID interno',aliases:['id db','place id','id ponto','id local']},
 {id:'pointCode',label:'Ponto • Código',aliases:['cod ponto','codigo ponto','código ponto','codigo local','cod local','ponto elt','site id','cod. local','cód local']},
 {id:'pointName',label:'Ponto • Nome',aliases:['ponto','nome do ponto','nome ponto','local','localidade','nome instalacao','nome instalação','estabelecimento']},
 {id:'address',label:'Ponto • Endereço',aliases:['endereco','endereço','logradouro','rua','avenida','address','localizacao','localização']},
 {id:'neighborhood',label:'Ponto • Bairro',aliases:['bairro','district']},
 {id:'city',label:'Ponto • Cidade',aliases:['cidade','municipio','município','city']},
 {id:'state',label:'Ponto • Estado/UF',aliases:['estado','uf','state']},
 {id:'square',label:'Ponto • Praça',aliases:['praca','praça','regional','regiao','região']},
 {id:'cep',label:'Ponto • CEP',aliases:['cep','codigo postal','código postal','postal code']},
 {id:'lat',label:'Mapa • Latitude',aliases:['latitude','lat','y']},
 {id:'lng',label:'Mapa • Longitude',aliases:['longitude','lng','lon','long','x']},
 {id:'area',label:'Ponto • Área de trabalho',aliases:['area de trabalho','área de trabalho','area','área']},
 {id:'status',label:'Ponto • Status',aliases:['status','situacao','situação','estado operacional']},
 {id:'machineId',label:'Máquina • ID',aliases:['id maquina','id máquina','cod maquina','código máquina','maquina id','máquina id','equip id','equipamento id']},
 {id:'machineName',label:'Máquina • Nome',aliases:['nome maquina','nome máquina','maquina','máquina','equip','equipamento','nome equip']},
 {id:'ip',label:'Máquina • IP',aliases:['ip','ip maquina','ip máquina','endereco ip','endereço ip']},
 {id:'os',label:'Máquina • Sistema operacional',aliases:['sistema operacional','so','os','sistema']},
 {id:'provider',label:'Máquina • Provedor',aliases:['provedor','operadora','provider']},
 {id:'assetId',label:'Ativo • Patrimônio',aliases:['ativo','patrimonio','patrimônio','asset','numero ativo','número ativo','pat']},
 {id:'ticketId',label:'Chamado • ID',aliases:['chamado','ticket','sync id','protocolo','elt']},
 {id:'notes',label:'Observação',aliases:['observacao','observação','obs','notas','nota','comentario','comentário']}
];

let pending=null;

function n(v){return C().norm(v)}
function c(v){return C().compact(v)}
function headerRowScore(row){
  const cells=(row||[]).map(x=>String(x??'').trim()).filter(Boolean);
  if(cells.length<2)return -999;
  let aliases=0;
  for(const cell of cells){
    let best=0;
    for(const sem of SEMANTICS.filter(x=>x.id!=='ignore'))best=Math.max(best,aliasScore(cell,sem));
    if(best>=75)aliases++;
  }
  const unique=new Set(cells.map(c)).size;
  return cells.length*2+aliases*14+unique*.5;
}
function matrixToObjects(matrix){
  matrix=(matrix||[]).filter(r=>Array.isArray(r)&&r.some(v=>String(v??'').trim()!==''));
  if(!matrix.length)return [];
  let best=0,bestScore=-Infinity;
  for(let i=0;i<Math.min(25,matrix.length);i++){
    const s=headerRowScore(matrix[i]);
    if(s>bestScore){bestScore=s;best=i;}
  }
  const rawHeaders=(matrix[best]||[]).map((h,i)=>String(h??'').trim()||('Coluna '+(i+1)));
  const seen={};
  const headers=rawHeaders.map((h,i)=>{const base=h||('Coluna '+(i+1));seen[base]=(seen[base]||0)+1;return seen[base]===1?base:(base+' '+seen[base]);});
  const out=[];
  for(let ri=best+1;ri<matrix.length;ri++){
    const row=matrix[ri]||[];if(!row.some(v=>String(v??'').trim()!==''))continue;
    const o={};headers.forEach((h,i)=>o[h]=row[i]==null?'':row[i]);out.push(o);
  }
  return out;
}
function parseCSV(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  const first=(text.split(/\r?\n/).find(x=>x.trim())||'');
  const counts={';':(first.match(/;/g)||[]).length,',':(first.match(/,/g)||[]).length,'\t':(first.match(/\t/g)||[]).length};
  const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]||';';
  const matrix=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],nx=text[i+1];
    if(ch==='"'){if(quote&&nx==='"'){cell+='"';i++;continue;}quote=!quote;continue;}
    if(!quote&&ch===delimiter){row.push(cell);cell='';continue;}
    if(!quote&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&nx==='\n')i++;row.push(cell);cell='';if(row.some(v=>String(v).trim()!==''))matrix.push(row);row=[];continue;}
    cell+=ch;
  }
  row.push(cell);if(row.some(v=>String(v).trim()!==''))matrix.push(row);
  return matrixToObjects(matrix);
}
async function parseFile(file){
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(ext==='json'){
    const j=JSON.parse(await file.text());
    if(Array.isArray(j))return j;
    if(Array.isArray(j.rows))return j.rows;
    if(Array.isArray(j.data))return j.data;
    throw new Error('JSON precisa conter uma lista de registros, "rows" ou "data".');
  }
  if(ext==='csv'||ext==='txt')return parseCSV(await file.text());
  if(ext==='xlsx'||ext==='xls'){
    if(!window.XLSX)throw new Error('Leitor XLSX não carregou. Conecte à internet nesta primeira versão ou salve como CSV.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    let bestRows=[],bestScore=-1;
    for(const name of wb.SheetNames){
      const matrix=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false,blankrows:false});
      const rows=matrixToObjects(matrix);
      if(!rows.length)continue;
      const sample=rows.slice(0,20),headers=Object.keys(rows[0]||{});
      let semanticHits=0;for(const h of headers){for(const sem of SEMANTICS.filter(x=>x.id!=='ignore')){if(aliasScore(h,sem)>=75){semanticHits++;break;}}}
      const score=semanticHits*100+Math.min(rows.length,5000)+headers.length;
      if(score>bestScore){bestScore=score;bestRows=rows;}
    }
    if(!bestRows.length)throw new Error('Nenhuma aba da planilha contém uma tabela utilizável.');
    return bestRows;
  }
  throw new Error('Formato não suportado: .'+ext);
}
function sampleValues(rows,header){
  return rows.slice(0,40).map(r=>String(r[header]??'').trim()).filter(Boolean);
}
function aliasScore(header,sem){
  const h=c(header);let best=0;
  for(const a of sem.aliases||[]){
    const aa=c(a);
    if(h===aa)best=Math.max(best,100);
    else if(h.includes(aa)||aa.includes(h))best=Math.max(best,75);
  }
  return best;
}
function valueScore(values,id){
  if(!values.length)return 0;
  let hit=0;
  const ratio=fn=>values.reduce((a,v)=>a+(fn(v)?1:0),0)/values.length;
  if(id==='ip')hit=ratio(v=>/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v))*95;
  else if(id==='cep')hit=ratio(v=>/^\d{5}-?\d{3}$/.test(v.replace(/\s/g,'')))*90;
  else if(id==='state')hit=ratio(v=>/^[A-Za-z]{2}$/.test(v))*65;
  else if(id==='lat')hit=ratio(v=>{const x=Number(v.replace(',','.'));return Number.isFinite(x)&&x>=-35&&x<=6;})*65;
  else if(id==='lng')hit=ratio(v=>{const x=Number(v.replace(',','.'));return Number.isFinite(x)&&x>=-75&&x<=-30;})*65;
  else if(id==='assetId')hit=ratio(v=>/^0?\d{5,7}$/.test(v.replace(/\D/g,'')))*35;
  else if(id==='ticketId')hit=ratio(v=>/^\d{6,12}$/.test(v.replace(/\D/g,'')))*25;
  else if(id==='address')hit=ratio(v=>/\b(rua|r\.|avenida|av\.|rodovia|estrada|alameda|travessa|praça)\b/i.test(v))*70;
  else if(id==='os')hit=ratio(v=>/windows|linux|ubuntu|debian|android/i.test(v))*85;
  return hit;
}
async function learnedScore(header,id){
  try{
    const m=await PrismaDB.get('mappings','header:'+c(header));
    return m&&m.semantic===id?120:0;
  }catch(e){return 0}
}
async function infer(rows){
  const headers=Object.keys(rows[0]||{}),mapping=[];
  for(const header of headers){
    const values=sampleValues(rows,header);let best={id:'ignore',score:0};
    for(const sem of SEMANTICS.filter(x=>x.id!=='ignore')){
      const s=aliasScore(header,sem)+valueScore(values,sem.id)+await learnedScore(header,sem.id);
      if(s>best.score)best={id:sem.id,score:s};
    }
    mapping.push({header,semantic:best.score>=35?best.id:'ignore',confidence:Math.min(99,Math.round(best.score)),sample:values.slice(0,3)});
  }
  return mapping;
}
function semanticOptions(selected){
  return SEMANTICS.map(s=>'<option value="'+s.id+'" '+(s.id===selected?'selected':'')+'>'+C().esc(s.label)+'</option>').join('');
}
function renderMapping(){
  const host=document.getElementById('importPreview');if(!host||!pending)return;
  const rows=pending.rows,m=pending.mapping;
  host.innerHTML=
    '<div class="card result-section"><div class="card-head"><h3>PRISMA entendeu a planilha assim</h3><small>'+C().fmt(rows.length)+' linha(s)</small></div><div class="card-body">'+
    '<div class="actions" style="margin-bottom:10px"><label style="min-width:220px">Tipo principal<select id="importKind"><option value="auto">Detectar automaticamente</option><option value="point">Pontos</option><option value="machine">Máquinas</option><option value="asset">Ativos</option><option value="ticket">Chamados</option></select></label><button id="confirmImport" class="primary">Confirmar importação</button><button id="cancelImport">Cancelar</button></div>'+
    '<table class="mapping-table"><thead><tr><th>Coluna recebida</th><th>Interpretar como</th><th>Confiança</th><th>Amostra</th></tr></thead><tbody>'+
    m.map((x,i)=>'<tr><td><b>'+C().esc(x.header)+'</b></td><td><select data-map-index="'+i+'">'+semanticOptions(x.semantic)+'</select></td><td><span class="chip '+(x.confidence>=80?'ok':x.confidence>=50?'warn':'')+'">'+x.confidence+'%</span></td><td>'+C().esc(x.sample.join(' | '))+'</td></tr>').join('')+
    '</tbody></table></div></div>';
  host.querySelectorAll('[data-map-index]').forEach(sel=>sel.onchange=function(){pending.mapping[Number(sel.dataset.mapIndex)].semantic=sel.value;});
  document.getElementById('confirmImport').onclick=commit;
  document.getElementById('cancelImport').onclick=function(){pending=null;host.innerHTML='';};
}
function fieldMap(){const out={};(pending.mapping||[]).forEach(x=>{if(x.semantic&&x.semantic!=='ignore')out[x.semantic]=x.header;});return out;}
function get(row,map,id){const h=map[id];return h==null?'':String(row[h]??'').trim();}
function guessKind(map,forced){
  if(forced&&forced!=='auto')return forced;
  if(map.machineId||map.machineName||map.ip||map.os)return 'machine';
  if(map.pointCode||map.pointName||map.address||map.lat||map.lng)return 'point';
  if(map.assetId)return 'asset';
  if(map.ticketId)return 'ticket';
  return 'generic';
}
function normalizeRow(row,map,kind){
  const common={notes:get(row,map,'notes')};
  if(kind==='point')return Object.assign(common,{
    id:get(row,map,'pointId'),code:get(row,map,'pointCode'),name:get(row,map,'pointName'),address:get(row,map,'address'),
    neighborhood:get(row,map,'neighborhood'),city:get(row,map,'city'),state:get(row,map,'state'),square:get(row,map,'square'),
    cep:get(row,map,'cep'),lat:C().num(get(row,map,'lat')),lng:C().num(get(row,map,'lng')),area:get(row,map,'area'),status:get(row,map,'status')
  });
  if(kind==='machine')return Object.assign(common,{
    id:get(row,map,'machineId'),name:get(row,map,'machineName'),pointCode:get(row,map,'pointCode'),pointName:get(row,map,'pointName'),
    address:get(row,map,'address'),square:get(row,map,'square'),ip:get(row,map,'ip'),os:get(row,map,'os'),provider:get(row,map,'provider')
  });
  if(kind==='asset')return Object.assign(common,{id:get(row,map,'assetId'),pointCode:get(row,map,'pointCode'),pointName:get(row,map,'pointName')});
  if(kind==='ticket')return Object.assign(common,{id:get(row,map,'ticketId'),pointCode:get(row,map,'pointCode'),pointName:get(row,map,'pointName'),status:get(row,map,'status')});
  const o={};Object.keys(row).forEach(k=>o[k]=row[k]);return o;
}
function entityKey(kind,data,rowIndex){
  if(kind==='point')return data.id||data.code||('row:'+rowIndex);
  if(kind==='machine')return data.id||data.name||('row:'+rowIndex);
  if(kind==='asset')return data.id||('row:'+rowIndex);
  if(kind==='ticket')return data.id||('row:'+rowIndex);
  return 'row:'+rowIndex;
}
function label(kind,data,key){
  if(kind==='point')return [data.code,data.name].filter(Boolean).join(' • ')||key;
  if(kind==='machine')return ['['+data.id+']',data.name].filter(Boolean).join(' ')||key;
  if(kind==='asset')return 'Ativo '+key;
  if(kind==='ticket')return 'Chamado '+key;
  return key;
}
async function commit(){
  if(!pending)return;
  const map=fieldMap(),forced=document.getElementById('importKind').value,kind=guessKind(map,forced);
  if(kind==='generic'&&!confirm('Não consegui identificar uma entidade principal. Importar como dados genéricos mesmo assim?'))return;
  const id='imp_'+Date.now().toString(36),at=new Date().toISOString();
  const records=pending.rows.map((row,i)=>{
    const data=normalizeRow(row,map,kind),key=entityKey(kind,data,i);
    return {id:id+':'+i,importId:id,importName:pending.file.name,kind,entityKey:String(key),label:label(kind,data,key),data,raw:row,active:true,importedAt:at};
  });
  await PrismaDB.put('imports',{id,name:pending.file.name,kind,rows:records.length,active:true,importedAt:at,mapping:pending.mapping});
  await PrismaDB.bulkPut('importRecords',records);
  for(const x of pending.mapping.filter(x=>x.semantic!=='ignore')){
    await PrismaDB.put('mappings',{id:'header:'+c(x.header),header:x.header,semantic:x.semantic,updatedAt:at});
  }
  await PrismaDB.audit('importacao','Importou '+pending.file.name,'',{importId:id,kind,rows:records.length});
  pending=null;await C().refreshLocal();C().toast('Importação concluída: '+records.length+' registros');
  if(window.PrismaApp){PrismaApp.renderImports();PrismaApp.renderHome();}
}
async function analyze(file){
  const rows=await parseFile(file);
  if(!rows.length)throw new Error('Arquivo sem linhas utilizáveis.');
  pending={file,rows,mapping:await infer(rows)};
  renderMapping();
}

function init(){
  const input=document.getElementById('smartImportFile');if(!input)return;
  input.onchange=async function(){
    const f=input.files&&input.files[0];if(!f)return;
    try{await analyze(f);}catch(e){C().toast(e.message||e);document.getElementById('importPreview').innerHTML='<div class="card empty">'+C().esc(e.message||e)+'</div>';}
    input.value='';
  };
}

window.PrismaImporter={init,analyze,parseCSV,parseFile,semantics:SEMANTICS};
})();