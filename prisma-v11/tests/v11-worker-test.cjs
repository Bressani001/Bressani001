const fs=require('fs'),vm=require('vm');
let last=null;
global.self={postMessage:(x)=>{last=x}};
const code=fs.readFileSync('prisma-v11/prisma_v11_worker.js','utf8');
vm.runInThisContext(code,{filename:'prisma_v11_worker.js'});
function send(data){last=null;self.onmessage({data});if(!last)throw new Error('worker sem resposta');if(!last.ok)throw new Error(last.error||'worker falhou');return last}
send({id:'1',type:'INIT',records:[
 {t:'point',i:0,k:'99499',keys:['99499','77825'],primary:'77825',secondary:'Visionnaire Premium',s:'99499 77825 visionnaire premium rua a',sig:'a'},
 {t:'machine',i:0,k:'92782',keys:['92782'],primary:'92782',secondary:'visionnairepremium1_6 ponto 77825',s:'92782 77825 visionnairepremium1_6',sig:'b'},
 {t:'ticket',i:0,k:'20887147',primary:'20887147',secondary:'1 ocorrencia',s:'20887147',sig:'c'}
]});
let s=send({id:'2',type:'SEARCH',query:'77825',limit:10});
if(!s.results.some(x=>x.t==='point'&&x.i===0))throw new Error('busca de ponto falhou');
if(!s.results.some(x=>x.t==='machine'&&x.i===0))throw new Error('busca de maquina por ponto falhou');
let csv='ID;PONTO;ENDEREÇO;ÁREA DE TRABALHO;PRAÇA;ESTADO\n99499;[77825] - Visionnaire Premium;Rua A;Itaim;SP;SP\n100999;[88888] - Novo Ponto;Rua B;Centro;SP;SP\n';
let p=send({id:'3',type:'PARSE_IMPORT',name:'pontos.csv',text:csv,complete:false});
if(p.kind!=='point')throw new Error('classificacao CSV de pontos falhou: '+p.kind);
if(p.summary.valid!==2)throw new Error('validacao de linhas falhou');
if(p.summary.added<1)throw new Error('diff de novos registros falhou');
console.log('PRISMA V11 WORKER TEST OK');