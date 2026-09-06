// Busca global (command palette).
// Pesquisa client-side no cache ja carregado (St.ga) sobre hospedes, reservas e quartos.
// Acionada por Ctrl+K, tecla "/" ou pelos botoes na sidebar/menu Mais.
// Cada resultado navega para a acao certa reaproveitando funcoes ja existentes
// (detalheQuarto, editarHospede) e um detalhe de reserva proprio.
import { esc, fmtC, fmtD } from "../utils.js";
import { St, getStatusBadge } from "../store.js";
import { sm, cm } from "../ui.js";
import { navTo } from "../nav.js";

var LIMITE_GRUPO = 8; // maximo de itens por categoria

// Icones SVG por tipo de resultado
var ICO = {
  hospede:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  reserva:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  quarto:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  lupa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
};

function norm(s){ return (s==null?"":(""+s)).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }

// Faz a busca no cache e retorna { hospedes:[], reservas:[], quartos:[], total }
export function buscarGlobal(termo){
  var t = norm(termo).trim();
  var out = { hospedes:[], reservas:[], quartos:[], total:0 };
  if(t.length < 2) return out; // exige ao menos 2 caracteres

  var hospedes = St.ga("h"), reservas = St.ga("r"), quartos = St.ga("q"), tq = St.ga("tq");

  // ---- HOSPEDES: nome, documento, telefone, email ----
  out.hospedes = hospedes.filter(function(h){
    if(h.ativo===false) return false;
    return norm(h.nome).indexOf(t)>=0 || norm(h.documento).indexOf(t)>=0 ||
           norm(h.telefone).indexOf(t)>=0 || norm(h.email).indexOf(t)>=0;
  }).slice(0, LIMITE_GRUPO);

  // ---- QUARTOS: numero, tipo, status ----
  out.quartos = quartos.filter(function(q){
    if(q.ativo===false) return false;
    var tpo = tq.find(function(x){return x.id===q.tipoQuartoId;});
    return norm(q.numero).indexOf(t)>=0 ||
           norm(tpo?tpo.nome:"").indexOf(t)>=0 ||
           norm(q.status).indexOf(t)>=0;
  }).slice(0, LIMITE_GRUPO);

  // ---- RESERVAS: nome do hospede, numero do quarto, status, datas ----
  out.reservas = reservas.filter(function(r){
    var h = St.fi("h", r.hospedeId), q = St.fi("q", r.quartoId);
    return norm(h?h.nome:"").indexOf(t)>=0 ||
           norm(q?("apto "+q.numero):"").indexOf(t)>=0 ||
           norm(q?q.numero:"").indexOf(t)>=0 ||
           norm(r.status).indexOf(t)>=0 ||
           norm(fmtD(r.dataCheckin)).indexOf(t)>=0 ||
           norm(fmtD(r.dataCheckout)).indexOf(t)>=0;
  }).sort(function(a,b){return (b.dataCheckin||"").localeCompare(a.dataCheckin||"");}).slice(0, LIMITE_GRUPO);

  out.total = out.hospedes.length + out.reservas.length + out.quartos.length;
  return out;
}

// Monta o HTML de um item de resultado clicavel
function item(tipo, onclickAttr, titulo, sub){
  return '<button type="button" class="busca-item" '+onclickAttr+'>'+
    '<span class="busca-item-ico">'+ICO[tipo]+'</span>'+
    '<span class="busca-item-txt"><span class="busca-item-tit">'+titulo+'</span>'+
      (sub?'<span class="busca-item-sub">'+sub+'</span>':'')+'</span>'+
  '</button>';
}

function grupo(nome, itensHtml){
  if(!itensHtml) return "";
  return '<div class="busca-grupo"><div class="busca-grupo-tit">'+esc(nome)+'</div>'+itensHtml+'</div>';
}

// Renderiza os resultados dentro do container da busca
export function renderResultadosBusca(termo){
  var alvo = document.getElementById("buscaResultados");
  if(!alvo) return;
  var t = (termo||"").trim();
  if(t.length < 2){
    alvo.innerHTML = '<div class="busca-vazio">Digite ao menos 2 caracteres para buscar por hospede, reserva ou quarto.</div>';
    return;
  }
  var r = buscarGlobal(t);
  if(r.total === 0){
    alvo.innerHTML = '<div class="busca-vazio">Nada encontrado para <b>'+esc(t)+'</b>.</div>';
    return;
  }

  var html = "";

  // Hospedes
  if(r.hospedes.length){
    html += grupo("Hospedes", r.hospedes.map(function(h){
      var sub = [h.documento, h.telefone].filter(Boolean).map(esc).join(" &middot; ");
      return item("hospede", 'onclick="buscaAbrirHospede(\''+h.id+'\')"', esc(h.nome), sub);
    }).join(''));
  }

  // Reservas
  if(r.reservas.length){
    html += grupo("Reservas", r.reservas.map(function(res){
      var h = St.fi("h", res.hospedeId), q = St.fi("q", res.quartoId);
      var tit = (h?esc(h.nome):"Reserva") + (q?(' &middot; Apto '+esc(q.numero)):"");
      var sub = fmtD(res.dataCheckin)+' a '+fmtD(res.dataCheckout)+'  '+getStatusBadge(res.status);
      return item("reserva", 'onclick="buscaAbrirReserva(\''+res.id+'\')"', tit, sub);
    }).join(''));
  }

  // Quartos
  if(r.quartos.length){
    var tq = St.ga("tq");
    html += grupo("Quartos", r.quartos.map(function(q){
      var tpo = tq.find(function(x){return x.id===q.tipoQuartoId;});
      var sub = (tpo?esc(tpo.nome):"Quarto")+' &middot; '+esc((q.status||"disponivel"));
      return item("quarto", 'onclick="buscaAbrirQuarto(\''+q.id+'\')"', 'Apto '+esc(q.numero), sub);
    }).join(''));
  }

  alvo.innerHTML = html;
}

// Abre o command palette
export function abrirBusca(){
  var corpo = '<div class="busca-box">'+
    '<div class="busca-input-wrap">'+ICO.lupa+
      '<input type="text" id="buscaInput" placeholder="Buscar hospede, reserva ou quarto..." autocomplete="off" oninput="renderResultadosBusca(this.value)">'+
    '</div>'+
    '<div class="busca-resultados" id="buscaResultados"><div class="busca-vazio">Digite ao menos 2 caracteres para buscar por hospede, reserva ou quarto.</div></div>'+
  '</div>';
  sm("Busca", corpo, "");
  // marca o modal para estilizar como palette (alinhado ao topo)
  var ov = document.getElementById("modalOverlay");
  if(ov){ var m = ov.querySelector(".modal"); if(m) m.classList.add("busca-modal"); }
  setTimeout(function(){ var i=document.getElementById("buscaInput"); if(i)i.focus(); }, 70);
}

// Fecha a busca e limpa a classe do palette (para nao afetar proximos modais)
function fecharBusca(){
  var ov = document.getElementById("modalOverlay");
  if(ov){ var m = ov.querySelector(".modal"); if(m) m.classList.remove("busca-modal"); }
  cm();
}

// ---- Navegacao a partir de um resultado ----
export function buscaAbrirHospede(id){
  fecharBusca();
  navTo("#h");
  // abre o cadastro do hospede (mostra todos os dados) apos a tela renderizar
  setTimeout(function(){ if(typeof window.editarHospede==="function") window.editarHospede(id); }, 80);
}

export function buscaAbrirQuarto(id){
  fecharBusca();
  navTo("#d"); // o detalhe de quarto vive no painel
  setTimeout(function(){ if(typeof window.detalheQuarto==="function") window.detalheQuarto(id); }, 80);
}

export function buscaAbrirReserva(id){
  fecharBusca();
  navTo("#r");
  setTimeout(function(){ mostrarDetalheReserva(id); }, 80);
}

// Detalhe de reserva (proprio da busca, para nao depender do estado do mapa de ocupacao)
function mostrarDetalheReserva(id){
  var r = St.fi("r", id); if(!r) return;
  var h = St.fi("h", r.hospedeId), q = St.fi("q", r.quartoId), t = St.fi("tq", r.tipoQuartoId);
  var pago = St.ga("pg").filter(function(p){return p.reservaId===id;}).reduce(function(s,p){return s+(p.valor||0);},0);
  var saldo = (r.total||0) - pago;
  var body = '<div class="qmodal-info">'+
    '<div class="qmodal-row"><span>Hospede</span><b>'+(h?esc(h.nome):"-")+'</b></div>'+
    (h&&h.telefone?'<div class="qmodal-row"><span>Telefone</span><b>'+esc(h.telefone)+'</b></div>':'')+
    '<div class="qmodal-row"><span>Quarto</span><b>'+(q?("Apto "+esc(q.numero)):"-")+(t?(" ("+esc(t.nome)+")"):"")+'</b></div>'+
    '<div class="qmodal-row"><span>Check-in</span><b>'+fmtD(r.dataCheckin)+'</b></div>'+
    '<div class="qmodal-row"><span>Check-out</span><b>'+fmtD(r.dataCheckout)+'</b></div>'+
    '<div class="qmodal-row"><span>Status</span><b>'+getStatusBadge(r.status)+'</b></div>'+
    (r.total?'<div class="qmodal-row"><span>Total</span><b>'+fmtC(r.total)+'</b></div>':'')+
    (r.total?'<div class="qmodal-row"><span>Ja pago</span><b style="color:var(--pos)">'+fmtC(pago)+'</b></div>':'')+
    (r.total&&saldo>0?'<div class="qmodal-row"><span>Saldo a receber</span><b style="color:var(--warn)">'+fmtC(saldo)+'</b></div>':'')+
  '</div>';
  var footer = '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>';
  if(r.status==="pendente"||r.status==="confirmada")
    footer += '<button class="btn btn-primary" onclick="closeModal();editarReserva(\''+id+'\')">Editar reserva</button>';
  sm("Reserva - "+(q?("Apto "+esc(q.numero)):(h?esc(h.nome):"")), body, footer);
}
