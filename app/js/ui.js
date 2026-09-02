// UI genérica: toasts, modais, confirmação e widget de suporte
import { esc } from "./utils.js";

export function st(m,t){var n=document.createElement("div");n.className="toast "+(t||"info");n.innerHTML=(t==="success"?"✓":t==="error"?"✗":"ℹ")+" "+esc(m);document.getElementById("toastContainer").appendChild(n);setTimeout(function(){n.remove()},3500)}
export function sm(t,b,f){document.getElementById("modalTitle").textContent=t;document.getElementById("modalBody").innerHTML=b||"";document.getElementById("modalFooter").innerHTML=f||"";document.getElementById("modalOverlay").classList.add("show")}
export function cm(){document.getElementById("modalOverlay").classList.remove("show");document.getElementById("modalBody").innerHTML="";document.getElementById("modalFooter").innerHTML=""}
export function closeModal(){cm()}
export function openModal(t,b,f){sm(t,b,f)}

export function confirmar(opts,onOk){opts=opts||{};var tipo=opts.tipo||"danger";
var ov=document.getElementById("confirmOverlay"),ico=document.getElementById("confirmIco");
ico.className="confirm-ico "+tipo;ico.textContent=tipo==="danger"?"⚠":tipo==="warning"?"⚠":"?";
document.getElementById("confirmTitle").textContent=opts.titulo||"Tem certeza?";
document.getElementById("confirmMsg").textContent=opts.msg||"";
var ok=document.getElementById("confirmOk"),cancel=document.getElementById("confirmCancel");
ok.className="btn "+(tipo==="danger"?"btn-danger":tipo==="warning"?"btn-primary":"btn-primary");
ok.textContent=opts.okLabel||"Confirmar";cancel.textContent=opts.cancelLabel||"Cancelar";
function fecha(){ov.classList.remove("show");ok.onclick=null;cancel.onclick=null;ov.onclick=null}
ok.onclick=function(){fecha();if(typeof onOk==="function")onOk()};
cancel.onclick=fecha;
// Nao fecha ao clicar fora: exige escolha explicita em Confirmar/Cancelar
ov.classList.add("show")}

export function toggleSuporte(){document.getElementById("supportWidget").classList.toggle("open")}
export function enviarSuporte(){
  var t=document.getElementById("supportMsg");
  if(!t||!t.value.trim())return st("Escreva uma mensagem antes de enviar.","warning");
  // Abre o WhatsApp do suporte com a mensagem ja preenchida (atendimento ao vivo)
  var msg=encodeURIComponent("Ola! Preciso de ajuda com o HospedaPrime:\n\n"+t.value.trim());
  var url="https://wa.me/5511922144143?text="+msg;
  window.open(url,"_blank","noopener");
  st("Abrindo o WhatsApp para falar com o suporte...","success");
  t.value="";
  document.getElementById("supportWidget").classList.remove("open");
}

// Os modais NAO fecham ao clicar fora (evita perder dados por clique acidental).
// Fecham pelo botao X, Cancelar, acao concluida ou tecla ESC.
export function initModalOverlay(){
  document.addEventListener("keydown",function(e){
    if(e.key!=="Escape")return;
    var conf=document.getElementById("confirmOverlay");
    if(conf&&conf.classList.contains("show")){var c=document.getElementById("confirmCancel");if(c)c.click();return;}
    var ov=document.getElementById("modalOverlay");
    if(ov&&ov.classList.contains("show"))cm();
  });
}
