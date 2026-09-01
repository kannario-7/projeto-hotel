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
function fecha(){ov.classList.remove("show");ok.onclick=null;cancel.onclick=null}
ok.onclick=function(){fecha();if(typeof onOk==="function")onOk()};
cancel.onclick=fecha;
ov.onclick=function(e){if(e.target===ov)fecha()};
ov.classList.add("show")}

export function toggleSuporte(){document.getElementById("supportWidget").classList.toggle("open")}
export function enviarSuporte(){var t=document.getElementById("supportMsg");if(!t||!t.value.trim())return st("Escreva uma mensagem antes de enviar.","warning");st("Mensagem enviada! Nossa equipe respondera em breve.","success");t.value="";document.getElementById("supportWidget").classList.remove("open")}

// Fechar modal ao clicar no overlay
export function initModalOverlay(){var ov=document.getElementById("modalOverlay");if(ov)ov.addEventListener("click",function(e){if(e.target===ov)cm()})}
