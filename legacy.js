(function(){
'use strict';
const DB=()=>window.PrismaDB;
function read(key,fallback){try{const v=localStorage.getItem(key);return v==null?fallback:JSON.parse(v)}catch(e){return fallback}}
async function migrate(){
  if(!window.PrismaDB)return;
  if(await DB().setting('legacy_migrated_v12_v2',false))return;
  const now=new Date().toISOString();

  const tpl=read('prisma_templates_v10',null);
  if(Array.isArray(tpl)&&tpl.length&&(await DB().all('templates')).length===0){
    await DB().bulkPut('templates',tpl.map((x,i)=>Object.assign({id:x.id||('legacy_tpl_'+i),updatedAt:now},x)),100);
  }

  const wa=read('prisma_whatsapp_links_v10',{});
  if(wa&&typeof wa==='object'&&!Array.isArray(wa)){
    const rows=[];Object.entries(wa).forEach(([k,v],i)=>{if(!v)return;const gi=/^\d+$/.test(k)?Number(k):null;rows.push({id:'legacy_wa_'+i,kind:'whatsapp',name:String(k),groupIndex:gi,url:String(v),updatedAt:now})});
    if(rows.length)await DB().bulkPut('destinations',rows,100);
  }

  const sl=read('prisma_slack_channels_v10',[]);
  if(Array.isArray(sl)&&sl.length){
    const rows=sl.map((x,i)=>typeof x==='string'?{id:'legacy_sl_'+i,kind:'slack',name:x,url:'',updatedAt:now}:{id:x.id||('legacy_sl_'+i),kind:'slack',name:x.name||x.channel||('Slack '+(i+1)),url:x.url||x.link||'',updatedAt:now});
    await DB().bulkPut('destinations',rows,100);
  }

  const ct=read('prisma_contacts_v10',[]);
  if(Array.isArray(ct)&&ct.length)await DB().bulkPut('contacts',ct.map((x,i)=>typeof x==='string'?{id:'legacy_ct_'+i,name:x,mention:x}:{id:x.id||('legacy_ct_'+i),name:x.name||x.mention||'',mention:x.mention||x.handle||'',updatedAt:now}),100);

  const tm=read('prisma_ops_ticket_map_v10',{});
  if(tm&&typeof tm==='object'&&!Array.isArray(tm)){
    const rows=[];Object.entries(tm).forEach(([ticket,v])=>{if(v==null||v==='')return;const s=String(v).trim();let internalId=s;const m=s.match(/\/tickets\/(\d+)\/edit/i);if(m)internalId=m[1];rows.push({id:'ticket:'+ticket,ticket:String(ticket),internalId,legacyValue:s,updatedAt:now})});if(rows.length)await DB().bulkPut('ticketMap',rows,100);
  }

  const notes=read('eletromidia_notes_v5',{});
  if(notes&&typeof notes==='object'&&!Array.isArray(notes)){const rows=[];Object.entries(notes).forEach(([id,value])=>rows.push({id:String(id),value:String(value||''),updatedAt:now}));if(rows.length)await DB().bulkPut('notes',rows,300);}
  const msgNotes=read('eletromidia_message_notes_v6',{});
  if(msgNotes&&typeof msgNotes==='object'&&!Array.isArray(msgNotes)){const rows=[];Object.entries(msgNotes).forEach(([id,value])=>{const clean=String(id).replace(/^msg:/,'').replace(/^message:/,'');rows.push({id:'message:'+clean,value:String(value||''),updatedAt:now})});if(rows.length)await DB().bulkPut('notes',rows,300);}

  const pass=read('eletromidia_password_overlay_v2',{});
  if(pass&&typeof pass==='object'&&!Array.isArray(pass)){const rows=[];Object.entries(pass).forEach(([id,value])=>rows.push({id:String(id),value:String(value||''),updatedAt:now}));if(rows.length)await DB().bulkPut('passwords',rows,300);}

  const oldOverrides=read('eletromidia_router_confirmed_v7',[]);
  if(Array.isArray(oldOverrides)&&oldOverrides.length&&!localStorage.getItem('prisma_v12_router_overrides'))try{localStorage.setItem('prisma_v12_router_overrides',JSON.stringify(oldOverrides))}catch(e){}

  const oldFeedback=read('eletromidia_route_feedback_v8',null);
  if(oldFeedback&&!localStorage.getItem('prisma_v12_route_feedback')){
    const flat={};Object.keys(oldFeedback.positive||{}).forEach(k=>flat[k]='positive');Object.keys(oldFeedback.negative||{}).forEach(k=>flat[k]='negative');try{localStorage.setItem('prisma_v12_route_feedback',JSON.stringify(flat))}catch(e){}
  }

  await DB().setSetting('legacy_migrated_v12_v2',true);
  await DB().audit('migracao','Configurações locais V7–V11 preservadas na V12','',{at:now});
}
window.PrismaLegacy={migrate};
})();