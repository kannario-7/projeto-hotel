// Módulo: Reservas
import { esc, fmtC, fmtD, td, dB } from "../utils.js";
import { St, getStatusBadge, quartosDisponiveis } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";

export function renderReservas(){var el=document.getElementById("pageContent");
var reservas=St.ga("r"),hospedes=St.ga("h"),quartos=St.ga("q"),servicos=St.ga("sv"),tq=St.ga("tq");
el.innerHTML='<div class="page-header"><div><h2>Reservas</h2><p>Gerenciar reservas do hotel</p></div><div class="page-header-actions"><button class="btn btn-primary" onclick="showNovaReserva()">+ Nova Reserva</button></div></div>';

var filtro='<div id="reservaFiltros" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">'+
'<button class="btn btn-sm btn-primary" data-filtro="" onclick="filtrarReservas(\'\')">Todas</button>'+
'<button class="btn btn-sm btn-secondary" data-filtro="pendente" onclick="filtrarReservas(\'pendente\')">Pendentes</button>'+
'<button class="btn btn-sm btn-secondary" data-filtro="confirmada" onclick="filtrarReservas(\'confirmada\')">Confirmadas</button>'+
'<button class="btn btn-sm btn-secondary" data-filtro="checkin" onclick="filtrarReservas(\'checkin\')">Em Andamento</button>'+
'<button class="btn btn-sm btn-secondary" data-filtro="cancelada" onclick="filtrarReservas(\'cancelada\')">Canceladas</button>'+
'</div>';
el.innerHTML+=filtro;

el.innerHTML+='<div id="reservasTable">'+buildReservasTable(reservas,quartos,hospedes,servicos,tq)+'</div>';}

export function filtrarReservas(s){var todas=St.ga("r");var reservas=s?todas.filter(function(r){return r.status===s}):todas;
document.getElementById("reservasTable").innerHTML=buildReservasTable(reservas,St.ga("q"),St.ga("h"),St.ga("sv"),St.ga("tq"));
var btns=document.querySelectorAll("#reservaFiltros button");for(var i=0;i<btns.length;i++){var ativo=btns[i].getAttribute("data-filtro")===s;btns[i].className="btn btn-sm "+(ativo?"btn-primary":"btn-secondary")}}

function buildReservasTable(reservas,quartos,hospedes,servicos,tq){if(!reservas.length)return'<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhuma reserva encontrada.</p>';
return'<table><tr><th>Hospede</th><th>Quarto</th><th>Check-in</th><th>Check-out</th><th>Total</th><th>Status</th><th>Acoes</th></tr>'+
reservas.sort(function(a,b){return a.dataCheckin.localeCompare(b.dataCheckin)}).map(function(r){var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);return'<tr><td>'+(h?esc(h.nome):"-")+' <small>'+(h?esc(h.documento||""):"")+'</small></td><td>'+(q?"Apto "+q.numero:"-")+'</td><td>'+fmtD(r.dataCheckin)+'</td><td>'+fmtD(r.dataCheckout)+'</td><td>'+fmtC(r.total)+'</td><td>'+getStatusBadge(r.status)+'</td>'+
'<td>'+
(r.status==="pendente"||r.status==="confirmada"?'<button class="btn btn-sm btn-primary" onclick="editarReserva(\''+r.id+'\')" style="margin-right:4px">Editar</button>':'')+
(r.status==="pendente"?'<button class="btn btn-sm btn-success" onclick="confirmarReserva(\''+r.id+'\')" style="margin-right:4px">Confirmar</button>':'')+
(r.status!=="cancelada"&&r.status!=="checkout"?'<button class="btn btn-sm btn-danger" onclick="cancelarReserva(\''+r.id+'\')">Cancelar</button>':'')+
'</td></tr>'}).join('')+'</table>'}

export function showNovaReserva(){sm("Nova Reserva",formReserva(null),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarReserva()">Salvar</button>')}
export function editarReserva(id){sm("Editar Reserva",formReserva(id),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarReserva(\''+id+'\')">Salvar</button>')}
export function confirmarReserva(id){St.up("r",id,{status:"confirmada"});st("Reserva confirmada!","success");cm();renderReservas()}
export function cancelarReserva(id){confirmar({titulo:"Cancelar reserva?",msg:"Esta reserva sera marcada como cancelada.",okLabel:"Sim, cancelar",tipo:"danger"},function(){St.up("r",id,{status:"cancelada"});st("Reserva cancelada.","warning");renderReservas()})}

function formReserva(id){var r=id?St.fi("r",id):null;
var hospedes=St.ga("h").filter(function(h){return h.ativo!==false});
var tq=St.ga("tq").filter(function(t){return t.ativo!==false});
return'<div class="form-grid">'+
'<div class="form-group"><label>Hospede *</label><select id="rfHospede">'+(r?'':'<option value="">Selecione...</option>')+hospedes.map(function(h){return'<option value="'+h.id+'"'+(r&&r.hospedeId===h.id?' selected':'')+'>'+esc(h.nome)+(h.documento?' - '+esc(h.documento):'')+'</option>'}).join('')+'</select></div>'+
'<div class="form-group"><label>Tipo de Quarto *</label><select id="rfTipo" onchange="atualizarQuartosDisponiveis()">'+(r?'':'<option value="">Selecione...</option>')+tq.map(function(t){return'<option value="'+t.id+'" data-capacidade="'+t.capacidade+'"'+(r?St.fi("q",r.quartoId)&&St.fi("q",r.quartoId).tipoQuartoId===t.id?' selected':'':'')+'>'+esc(t.nome)+' - '+fmtC(t.precoDiaria)+'/noite</option>'}).join('')+'</select></div>'+
'<div class="form-group"><label>Check-in *</label><input type="date" id="rfCheckin" value="'+(r?r.dataCheckin:td())+'" onchange="atualizarQuartosDisponiveis()"></div>'+
'<div class="form-group"><label>Check-out *</label><input type="date" id="rfCheckout" value="'+(r?r.dataCheckout:td())+'" onchange="atualizarQuartosDisponiveis()"></div>'+
'<div class="form-group"><label>Quarto *</label><select id="rfQuarto">'+(r?'<option value="'+r.quartoId+'">Apto '+(St.fi("q",r.quartoId)?St.fi("q",r.quartoId).numero:'')+'</option>':'<option value="">Selecione tipo e datas</option>')+'</select></div>'+
'<div class="form-group"><label>Status</label><select id="rfStatus"><option value="pendente"'+(r&&r.status==="pendente"?' selected':'')+'>Pendente</option><option value="confirmada"'+(r&&r.status==="confirmada"?' selected':'')+'>Confirmada</option></select></div>'+
'</div>';}

export function atualizarQuartosDisponiveis(){var sel=document.getElementById("rfQuarto");if(!sel)return;
var tipo=document.getElementById("rfTipo"),ci=document.getElementById("rfCheckin"),co=document.getElementById("rfCheckout");
if(!tipo||!ci||!co||!tipo.value)return;
var qs=quartosDisponiveis(tipo.value,ci.value,co.value,null);
sel.innerHTML=qs.length?'<option value="">Selecione...</option>'+qs.map(function(q){return'<option value="'+q.id+'">Apto '+q.numero+'</option>'}).join(''):'<option value="">Nenhum quarto disponivel</option>';}

export function salvarReserva(id){var h=document.getElementById("rfHospede"),t=document.getElementById("rfTipo"),q=document.getElementById("rfQuarto"),ci=document.getElementById("rfCheckin"),co=document.getElementById("rfCheckout"),selSt=document.getElementById("rfStatus");
if(!h||!t||!q||!ci||!co)return;
if(!h.value||!t.value||!q.value||!ci.value||!co.value)return st("Preencha todos os campos obrigatorios.","error"),false;
if(ci.value>=co.value)return st("Check-out deve ser apos Check-in.","error"),false;
var qo=St.fi("q",q.value),tq=St.fi("tq",qo?qo.tipoQuartoId:null);
var noites=dB(ci.value,co.value),total=noites*(tq?tq.precoDiaria:0);
var dados={hospedeId:h.value,quartoId:q.value,tipoQuartoId:t.value,dataCheckin:ci.value,dataCheckout:co.value,noites:noites,total:total,status:(selSt?selSt.value:"pendente"),servicosIds:[]};
if(id){St.up("r",id,dados);st("Reserva atualizada!","success")}
else{St.in("r",dados);st("Reserva criada!","success")}
cm();renderReservas()}
