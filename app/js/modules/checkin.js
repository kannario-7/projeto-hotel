// Módulo: Check-in
import { esc, fmtD, fmtC, td } from "../utils.js";
import { St } from "../store.js";
import { st, confirmar } from "../ui.js";

export function renderCheckin(){var el=document.getElementById("pageContent");
var hoje=td();
var reservas=St.ga("r").filter(function(r){return["confirmada","pendente"].includes(r.status)&&r.dataCheckin<=hoje});
var ocupados=St.ga("r").filter(function(r){return r.status==="checkin"});
el.innerHTML='<div class="page-header"><div><h2>Check-in</h2><p>Realizar check-in de hospedes</p></div></div>';

if(ocupados.length){el.innerHTML+='<h3 style="margin-bottom:12px;color:var(--text)">Em Andamento ('+ocupados.length+')</h3><table><tr><th>Hospede</th><th>Quarto</th><th>Check-in</th><th>Check-out</th><th>Consumo</th><th>Acoes</th></tr>'+
ocupados.map(function(r){var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);
var consumos=St.ga("os").filter(function(o){return o.reservaId===r.id});
var totalConsumo=consumos.reduce(function(s,o){return s+(o.total||0)},0);
return'<tr><td>'+(h?esc(h.nome):"-")+'</td><td>'+(q?esc("Apto "+q.numero):"-")+'</td><td>'+fmtD(r.dataCheckin)+'</td><td>'+fmtD(r.dataCheckout)+'</td><td>'+(totalConsumo?fmtC(totalConsumo):"-")+(consumos.length?' <small style="color:var(--text-mute)">('+consumos.length+')</small>':'')+'</td><td><button class="btn btn-sm btn-primary" onclick="showNovoConsumo(\''+r.id+'\')">+ Lancar consumo</button></td></tr>'}).join('')+'</table>';}

if(reservas.length){el.innerHTML+='<h3 style="margin-bottom:12px;color:var(--text)">Reservas para Check-in</h3><table><tr><th>Hospede</th><th>Quarto</th><th>Check-in</th><th>Check-out</th><th>Documento</th><th>Acao</th></tr>'+
reservas.map(function(r){var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);return'<tr><td>'+(h?esc(h.nome):"-")+'</td><td>'+(q?esc("Apto "+q.numero):"-")+'</td><td>'+fmtD(r.dataCheckin)+'</td><td>'+fmtD(r.dataCheckout)+'</td><td>'+(h?esc(h.documento||""):"-")+'</td><td><button class="btn btn-sm btn-success" onclick="realizarCheckin(\''+r.id+'\')">Fazer Check-in</button></td></tr>'}).join('')+'</table>';}
else if(!ocupados.length){el.innerHTML+='<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhuma reserva pendente para check-in hoje.</p>';}
}

export function realizarCheckin(id){confirmar({titulo:"Confirmar check-in?",msg:"O hospede sera registrado e o quarto marcado como ocupado.",okLabel:"Confirmar check-in",tipo:"info"},function(){
var r=St.fi("r",id);if(!r)return;
St.up("r",id,{status:"checkin"});
St.up("q",r.quartoId,{status:"ocupado"});
st("Check-in realizado com sucesso!","success");
renderCheckin();})}
