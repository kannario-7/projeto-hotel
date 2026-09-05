// UI genérica: toasts, modais, confirmação e widget de suporte
import { esc } from "./utils.js";
import { getHotelId } from "./store.js";
import { suporteEnviar, suporteListar, suporteMarcarLidas } from "./db.js";

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

export function toggleSuporte(){
  var w=document.getElementById("supportWidget");w.classList.toggle("open");
  if(w.classList.contains("open"))carregarConversaSuporte();
}

// Carrega o historico da conversa do hotel do cliente logado
export async function carregarConversaSuporte(){
  var alvo=document.getElementById("supportConversa");
  if(!alvo)return;
  var hid=getHotelId();
  if(!hid){alvo.innerHTML="";return;}
  var msgs=await suporteListar(hid);
  if(!msgs.length){alvo.innerHTML='<p style="color:var(--text-mute);font-size:13px;text-align:center;padding:8px 0">Envie sua primeira mensagem. Respondemos por aqui.</p>';}
  else{
    alvo.innerHTML=msgs.map(function(m){
      var meu=m.autor==="cliente";
      return '<div class="sup-msg '+(meu?"sup-msg-eu":"sup-msg-sup")+'"><div class="sup-msg-bolha">'+esc(m.texto)+'</div><div class="sup-msg-hora">'+(m.autor==="suporte"?"Suporte · ":"")+fmtHora(m.criado_em)+'</div></div>';
    }).join('');
    alvo.scrollTop=alvo.scrollHeight;
  }
  // marca como lidas as respostas do suporte
  try{ await suporteMarcarLidas(hid,"suporte"); }catch(e){}
}
function fmtHora(iso){if(!iso)return"";var d=new Date(iso);var p=function(n){return String(n).padStart(2,"0")};return p(d.getDate())+"/"+p(d.getMonth()+1)+" "+p(d.getHours())+":"+p(d.getMinutes());}

// Envia mensagem pelo sistema (grava no banco; o dono responde no Painel do Dono)
export async function enviarSuporte(){
  var t=document.getElementById("supportMsg");
  if(!t||!t.value.trim())return st("Escreva uma mensagem antes de enviar.","warning");
  var hid=getHotelId();
  if(!hid)return st("Faca login para enviar mensagem ao suporte.","warning");
  var nome=(window.getCurrentUser&&window.getCurrentUser())?window.getCurrentUser().nome:"Cliente";
  var texto=t.value.trim();
  t.value="";
  var salvo=await suporteEnviar(hid,"cliente",nome,texto);
  if(!salvo)return st("Nao foi possivel enviar. Tente pelo WhatsApp.","error");
  st("Mensagem enviada ao suporte!","success");
  carregarConversaSuporte();
}

// Abre o WhatsApp do suporte com a mensagem preenchida (alternativa)
export function abrirSuporteWhatsApp(){
  var t=document.getElementById("supportMsg");
  var txt=(t&&t.value.trim())?t.value.trim():"Preciso de ajuda com o HospedaPrime";
  var url="https://wa.me/5511922144143?text="+encodeURIComponent("Ola! "+txt);
  window.open(url,"_blank","noopener");
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
