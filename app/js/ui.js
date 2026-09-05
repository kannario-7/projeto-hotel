// UI genérica: toasts, modais, confirmação e widget de suporte
import { esc } from "./utils.js";
import { getHotelId } from "./store.js";
import { suporteEnviar, suporteListar, suporteMarcarLidas, avaliarSuporte, avaliacoesSuporte, suporteStatus, suporteDefinirStatus } from "./db.js";

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

var _supPoll=null;      // timer de atualizacao automatica do chat do cliente
var _supUltCount=-1;    // qtd de mensagens ja renderizadas (evita re-render desnecessario)

export function toggleSuporte(){
  var w=document.getElementById("supportWidget");
  var modal=document.getElementById("supportModal");
  var abrindo=!modal.classList.contains("show");
  modal.classList.toggle("show",abrindo);
  if(w)w.classList.toggle("open",abrindo); // anima o icone do FAB (X <-> balao)
  if(abrindo){
    _supUltCount=-1;
    carregarConversaSuporte();
    iniciarPollSuporte();
    setTimeout(function(){var t=document.getElementById("supportMsg");if(t)t.focus();},80);
  }else{
    pararPollSuporte();
  }
}

// Enquanto o chat estiver aberto, verifica novas mensagens a cada 4s
function iniciarPollSuporte(){
  pararPollSuporte();
  _supPoll=setInterval(function(){
    var m=document.getElementById("supportModal");
    if(!m||!m.classList.contains("show")){pararPollSuporte();return;}
    if(document.hidden)return; // nao consome rede com a aba em segundo plano
    carregarConversaSuporte();
  },4000);
}
function pararPollSuporte(){ if(_supPoll){clearInterval(_supPoll);_supPoll=null;} }

// Carrega o historico da conversa do hotel do cliente logado
export async function carregarConversaSuporte(){
  var alvo=document.getElementById("supportConversa");
  if(!alvo)return;
  var hid=getHotelId();
  if(!hid){alvo.innerHTML="";return;}
  var msgs=await suporteListar(hid);
  // So re-renderiza se mudou a quantidade de mensagens (evita piscar/perder scroll)
  if(msgs.length===_supUltCount)return;
  var novas=msgs.length>_supUltCount && _supUltCount>=0;
  _supUltCount=msgs.length;
  // Preserva se o usuario rolou pra cima (nao força scroll se ele esta lendo o historico)
  var noFim=alvo.scrollHeight-alvo.scrollTop-alvo.clientHeight<40;
  // No chat do cliente, "eu" = autor cliente; o suporte aparece como interlocutor
  var html=renderConversa(msgs,"cliente",{vazio:"Envie sua primeira mensagem.<br>Respondemos por aqui."});
  // A avaliacao so aparece quando o atendimento foi FINALIZADO pelo suporte
  // (detecta pela mensagem de sistema, sem consulta extra). Some se o cliente escreveu depois.
  var finalizado=false;
  for(var i=0;i<msgs.length;i++){
    var m=msgs[i];
    if(typeof m.texto==="string" && m.texto.indexOf("[sistema] Atendimento finalizado")===0) finalizado=true;
    else if(m.autor==="cliente") finalizado=false; // cliente reabriu ao escrever
  }
  if(finalizado && !_supAvaliado){ html+=blocoAvaliar(); }
  alvo.innerHTML=html;
  if(noFim||novas)alvo.scrollTop=alvo.scrollHeight;
  // marca como lidas as respostas do suporte
  try{ await suporteMarcarLidas(hid,"suporte"); }catch(e){}
}

var _supAvaliado=false;    // ja avaliou nesta sessao (evita mostrar de novo)
var _supNotaSel=0;         // nota selecionada nas estrelas

// Bloco convite para avaliar (aparece no fim da conversa)
function blocoAvaliar(){
  return '<div class="sup-avaliar" id="supAvaliar">'+
    '<div class="sup-avaliar-tit">Como foi o atendimento?</div>'+
    '<div class="sup-stars" id="supStars">'+
      [1,2,3,4,5].map(function(n){return '<button type="button" class="sup-star" data-n="'+n+'" onclick="setNotaSuporte('+n+')" aria-label="'+n+' estrelas">&#9733;</button>';}).join('')+
    '</div>'+
    '<textarea id="supAvalComent" rows="2" placeholder="Deixe um comentario (opcional)"></textarea>'+
    '<button class="btn btn-primary" style="width:100%;justify-content:center" onclick="enviarAvaliacaoSuporte()">Enviar avaliacao</button>'+
  '</div>';
}

// Cliente seleciona a nota (pinta as estrelas ate n)
export function setNotaSuporte(n){
  _supNotaSel=n;
  var box=document.getElementById("supStars");
  if(!box)return;
  box.querySelectorAll(".sup-star").forEach(function(b){
    b.classList.toggle("on", Number(b.getAttribute("data-n"))<=n);
  });
}

// Envia a avaliacao do atendimento
export async function enviarAvaliacaoSuporte(){
  if(!_supNotaSel)return st("Escolha de 1 a 5 estrelas.","warning");
  var hid=getHotelId();
  if(!hid)return st("Faca login para avaliar.","warning");
  var c=document.getElementById("supAvalComent");
  var nome=(window.getCurrentUser&&window.getCurrentUser())?window.getCurrentUser().nome:"Cliente";
  var salvo=await avaliarSuporte(hid,_supNotaSel,c?c.value.trim():"",nome);
  if(!salvo)return st("Nao foi possivel enviar a avaliacao.","error");
  _supAvaliado=true; _supNotaSel=0;
  st("Obrigado pela avaliacao!","success");
  var box=document.getElementById("supAvaliar");
  if(box) box.outerHTML='<div class="sup-avaliar sup-avaliado">Obrigado pelo seu feedback! &#128522;</div>';
}

function fmtHora(iso){if(!iso)return"";var d=new Date(iso);var p=function(n){return String(n).padStart(2,"0")};return p(d.getHours())+":"+p(d.getMinutes());}

// Rotulo de dia amigavel (Hoje / Ontem / dd/mm/aaaa)
function fmtDia(iso){
  if(!iso)return"";
  var d=new Date(iso);var h=new Date();
  var dd=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  var hh=new Date(h.getFullYear(),h.getMonth(),h.getDate());
  var diff=Math.round((hh-dd)/86400000);
  if(diff===0)return"Hoje";
  if(diff===1)return"Ontem";
  var p=function(n){return String(n).padStart(2,"0")};
  return p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear();
}
function iniciais(nome){
  nome=(nome||"").trim();
  if(!nome)return"?";
  var partes=nome.split(/\s+/);
  if(partes.length===1)return partes[0].slice(0,2).toUpperCase();
  return (partes[0][0]+partes[partes.length-1][0]).toUpperCase();
}

// Renderiza uma conversa de suporte em baloes de chat.
// msgs: lista {autor:'cliente'|'suporte', nome, texto, criado_em}
// autorEu: qual autor deve aparecer alinhado a direita ('cliente' no chat do cliente, 'suporte' no painel do dono)
// opts.vazio: HTML mostrado quando nao ha mensagens
export function renderConversa(msgs,autorEu,opts){
  opts=opts||{};
  msgs=(msgs||[]).slice().sort(function(a,b){return (a.criado_em||"").localeCompare(b.criado_em||"")});
  if(!msgs.length){
    return '<div class="sup-empty">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'+
      '<span>'+(opts.vazio||"Nenhuma mensagem ainda.")+'</span></div>';
  }
  var out="";var diaAtual="";var autorAnt="";
  msgs.forEach(function(m){
    var dia=fmtDia(m.criado_em);
    if(dia!==diaAtual){ out+='<div class="sup-day">'+esc(dia)+'</div>'; diaAtual=dia; autorAnt=""; }
    // mensagem de sistema (ex.: "[sistema] Atendimento finalizado.") vira faixa central
    if(typeof m.texto==="string" && m.texto.indexOf("[sistema]")===0){
      out+='<div class="sup-sys">'+esc(m.texto.replace("[sistema]","").trim())+'</div>';
      autorAnt=""; return;
    }
    var eu=m.autor===autorEu;
    var agrupado=m.autor===autorAnt;
    var nome=eu?"Voce":(m.autor==="suporte"?"Suporte":(m.nome||"Cliente"));
    out+='<div class="sup-msg '+(eu?"sup-msg-eu":"sup-msg-sup")+(agrupado?" grouped":"")+'">'+
      '<div class="sup-avatar">'+esc(eu?"EU":iniciais(nome==="Voce"?"Voce":nome))+'</div>'+
      '<div class="sup-msg-body">'+
        (agrupado?"":'<div class="sup-msg-nome">'+esc(nome)+'</div>')+
        '<div class="sup-msg-bolha">'+esc(m.texto)+'</div>'+
        '<div class="sup-msg-hora">'+fmtHora(m.criado_em)+'</div>'+
      '</div></div>';
    autorAnt=m.autor;
  });
  return out;
}

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
  // Se o cliente escreve, o atendimento volta a ficar aberto (reabre se estava finalizado)
  try{ suporteDefinirStatus(hid,"aberto",null); }catch(e){}
  _supAvaliado=false; // permite avaliar de novo apos um novo ciclo de atendimento
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
    var chat=document.getElementById("supportModal");
    if(chat&&chat.classList.contains("show")){toggleSuporte();return;}
    var ov=document.getElementById("modalOverlay");
    if(ov&&ov.classList.contains("show"))cm();
  });
}
