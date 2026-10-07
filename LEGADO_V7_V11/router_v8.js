(function(){
'use strict';
function loadV8(){
if(window.__ELETRO_V8_GATE_LOADED__) return;
if(window.__ELETRO_V7_READY__!==true){setTimeout(loadV8,100);return;}
window.__ELETRO_V8_GATE_LOADED__=true;
var s=document.createElement('script');
s.src='router_v8_real.js';
s.onerror=function(){console.error('Falha ao carregar router_v8_real.js');};
document.head.appendChild(s);
}
loadV8();
})();