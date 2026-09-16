// Módulo: Check-out
import { esc, fmtC, fmtD, td, dB } from "../utils.js";
import { St, auditar, calcularDiarias } from "../store.js";
import { st, sm, cm, closeModal } from "../ui.js";
import { imprimirDocumento } from "./impressao.js";

// guarda os dados da ultima fatura exibida para permitir impressao premium
var faturaAtual = null;

export function renderCheckout(){var el=document.getElementById("pageContent");
var ativas=St.ga("r").filter(function(r){return r.status==="checkin"});
el.innerHTML='<div class="page-header"><div><h2>Check-out</h2><p>Realizar check-out e encerrar estadia</p></div></div>';

if(!ativas.length){el.innerHTML+='<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum hóspede em estadia ativa.</p>';return;}

el.innerHTML+='<table><tr><th>Hóspede</th><th>Quarto</th><th>Check-in</th><th>Check-out Previsto</th><th>Ações</th></tr>'+
ativas.map(function(r){var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);return'<tr><td>'+(h?esc(h.nome):"-")+'</td><td>'+(q?esc("Apto "+q.numero):"-")+'</td><td>'+fmtD(r.dataCheckin)+'</td><td>'+fmtD(r.dataCheckout)+'</td><td><button class="btn btn-sm btn-primary" onclick="realizarCheckout(\''+r.id+'\')">Fazer Check-out</button></td></tr>'}).join('')+'</table>';}

export function realizarCheckout(id){var r=St.fi("r",id);if(!r)return;
var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);
var hoje=td(),noitesReais=Math.max(1,dB(r.dataCheckin,hoje));
var tq=St.fi("tq",r.tipoQuartoId);
var fimReal=hoje>r.dataCheckin?hoje:r.dataCheckout;
var calcCheckout=calcularDiarias(r.tipoQuartoId, r.dataCheckin, fimReal);
var diarias=calcCheckout.total||(tq?noitesReais*tq.precoDiaria:0);
if(calcCheckout.noites)noitesReais=calcCheckout.noites;
var servicos=St.ga("os").filter(function(o){return o.reservaId===id});
var totalServicos=servicos.reduce(function(s,o){return s+(o.total||0)},0);
var config=St.gc(),taxa=config.tax||0,taxaImp=Math.round(diarias*taxa/100);
var total=diarias+totalServicos+taxaImp;
var temServicos=servicos.length>0;
// abate pagamentos ja feitos (sinal/parcial) - cobra so o saldo
var jaPago=St.ga("pg").filter(function(p){return p.reservaId===id}).reduce(function(s,p){return s+(p.valor||0)},0);
var saldo=total-jaPago; if(saldo<0)saldo=0;

// guarda os dados para impressao premium
faturaAtual={ id:id, hospede:(h?h.nome:""), documento:(h?h.documento:""), quarto:(q?q.numero:""),
  checkin:r.dataCheckin, checkout:hoje, noites:noitesReais, tipo:(tq?tq.nome:""),
  diarias:diarias, servicos:servicos.map(function(o){var sv=St.fi("sv",o.servicoId);return {nome:sv?sv.nome:"-",qtd:o.quantidade,unit:o.precoUnit,total:o.total};}),
  taxa:taxa, taxaImp:taxaImp, total:total, jaPago:jaPago, saldo:saldo };

var fatura='<div style="background:var(--surface-2);padding:20px;border-radius:12px;margin-bottom:16px">'+
'<h4 style="margin-bottom:12px;color:var(--text)">Fatura - '+(h?esc(h.nome):"")+' (Apto '+(q?q.numero:"")+')</h4>'+
'<table style="margin-bottom:8px"><tr><td>Período:</td><td>'+fmtD(r.dataCheckin)+' a '+fmtD(hoje)+' ('+noitesReais+' noite(s))</td></tr>'+
'<tr><td>Tipo Quarto:</td><td>'+(tq?esc(tq.nome):"-")+'</td></tr>'+
'<tr><td>Diárias:</td><td>'+fmtC(diarias)+'</td></tr></table>'+
(temServicos?'<h5 style="margin:8px 0 4px;color:var(--text)">Consumo Detalhado</h5><table><tr><th>Serviço</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th></tr>'+
servicos.map(function(o){var sv=St.fi("sv",o.servicoId);return'<tr><td>'+(sv?esc(sv.nome):"-")+'</td><td>'+o.quantidade+'</td><td>'+fmtC(o.precoUnit)+'</td><td>'+fmtC(o.total)+'</td></tr>'}).join('')+'</table>':'')+
'<table style="margin-top:8px"><tr><td>Taxa ('+taxa+'%):</td><td>'+fmtC(taxaImp)+'</td></tr>'+
'<tr style="font-weight:700"><td>Total:</td><td>'+fmtC(total)+'</td></tr>'+
(jaPago>0?'<tr style="color:var(--pos)"><td>Já pago (sinal/parcial):</td><td>- '+fmtC(jaPago)+'</td></tr><tr style="font-weight:800"><td>Saldo a pagar:</td><td>'+fmtC(saldo)+'</td></tr>':'')+
'</table></div>'+
(saldo<=0?'<div class="alert alert-info" style="margin-bottom:12px">Esta reserva já está totalmente paga. Nenhum valor adicional será cobrado.</div>':'')+
'<div class="form-group"><label>Forma de Pagamento'+(saldo<=0?'':' *')+'</label><select id="coPag">'+
config.pm.map(function(p){return'<option value="'+p+'">'+esc(p.charAt(0).toUpperCase()+p.slice(1))+'</option>'}).join('')+'</select></div>'+
'<div class="form-group"><label>Observações</label><textarea id="coObs" rows="2" placeholder="Observações do checkout"></textarea></div>';

sm("Check-out - Fatura",fatura,'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-secondary" onclick="imprimirFatura()">Imprimir Fatura</button><button class="btn btn-primary" onclick="finalizarCheckout(\''+id+'\')">Finalizar Check-out</button>');}

// Impressao premium da fatura (layout padrao do sistema)
export function imprimirFatura(){
  if(!faturaAtual)return st("Nenhuma fatura para imprimir.","warning");
  var f=faturaAtual;
  var corpo='<div class="cards"><div class="card"><h4>Hóspede</h4><div class="v" style="font-size:14px">'+esc(f.hospede)+'</div></div>'+
    '<div class="card"><h4>Quarto</h4><div class="v" style="font-size:14px">Apto '+esc(f.quarto)+'</div></div>'+
    '<div class="card"><h4>Período</h4><div class="v" style="font-size:13px">'+fmtD(f.checkin)+' a '+fmtD(f.checkout)+'</div></div></div>';
  corpo+='<table><tr><th>Descrição</th><th>Detalhe</th><th>Valor</th></tr>'+
    '<tr><td>Diárias</td><td>'+f.noites+' noite(s) - '+esc(f.tipo)+'</td><td>'+fmtC(f.diarias)+'</td></tr>'+
    f.servicos.map(function(s){return '<tr><td>'+esc(s.nome)+'</td><td>'+s.qtd+' x '+fmtC(s.unit)+'</td><td>'+fmtC(s.total)+'</td></tr>';}).join('')+
    '<tr><td>Taxa de serviço</td><td>'+f.taxa+'%</td><td>'+fmtC(f.taxaImp)+'</td></tr>'+
    '<tr style="font-weight:800"><td>TOTAL</td><td></td><td>'+fmtC(f.total)+'</td></tr>'+
    (f.jaPago>0?'<tr><td>Já pago (sinal/parcial)</td><td></td><td>- '+fmtC(f.jaPago)+'</td></tr><tr style="font-weight:800"><td>SALDO PAGO</td><td></td><td>'+fmtC(f.saldo)+'</td></tr>':'')+
    '</table>';
  imprimirDocumento("Fatura de Hospedagem", "Hóspede: "+f.hospede+(f.documento?(" - "+f.documento):""), corpo);
}

export async function finalizarCheckout(id){var r=St.fi("r",id);if(!r)return;
var hoje=td(),noitesReais=Math.max(1,dB(r.dataCheckin,hoje));
var tq=St.fi("tq",r.tipoQuartoId);
var fimReal=hoje>r.dataCheckin?hoje:r.dataCheckout;
var calcCheckout=calcularDiarias(r.tipoQuartoId, r.dataCheckin, fimReal);
var diarias=calcCheckout.total||(tq?noitesReais*tq.precoDiaria:0);
if(calcCheckout.noites)noitesReais=calcCheckout.noites;
var servicos=St.ga("os").filter(function(o){return o.reservaId===id});
var totalServicos=servicos.reduce(function(s,o){return s+(o.total||0)},0);
var config=St.gc(),taxa=config.tax||0,taxaImp=Math.round(diarias*taxa/100);
var total=diarias+totalServicos+taxaImp;
// abate o que ja foi pago (sinal/parcial): cobra so o saldo
var jaPago=St.ga("pg").filter(function(p){return p.reservaId===id}).reduce(function(s,p){return s+(p.valor||0)},0);
var saldo=total-jaPago; if(saldo<0)saldo=0;
var pag=document.getElementById("coPag"),obs=document.getElementById("coObs");
var btn=document.querySelector("#modalFooter .btn-primary"); if(btn){btn.disabled=true;btn.textContent="Finalizando...";}
// So grava pagamento se houver saldo a cobrar. Se ja pago integralmente, apenas fecha a reserva.
if(saldo>0){
  var _u=getCurrentUser();
  var pagamento={reservaId:id,hospedeId:r.hospedeId,valor:saldo,forma:(pag?pag.value:"dinheiro"),data:hoje,tipo:"final",observacoes:(obs?obs.value.trim():""),criadoEm:new Date().toISOString(),usuarioId:(_u?_u.id:null),usuarioNome:(_u?_u.nome:null)};
  var resPg=await St.inErr("pg",pagamento);
  if(!resPg.ok){
    if(btn){btn.disabled=false;btn.textContent="Confirmar Check-out";}
    return st("Não foi possível registrar o pagamento. Check-out NÃO concluído. Tente novamente.","error"),false;
  }
}
// Atualiza reserva (total cheio, para o historico) e quarto.
var resR=await St.upErr("r",id,{status:"checkout",dataCheckout:hoje,total:total});
if(!resR.ok){
  if(btn){btn.disabled=false;btn.textContent="Confirmar Check-out";}
  return st("Pagamento registrado, mas houve erro ao fechar a reserva. Verifique e tente de novo.","error"),false;
}
St.up("q",r.quartoId,{status:"limpeza",limpezaResponsavel:null,limpezaAtualizadoEm:new Date().toISOString()});
var hsp=St.fi("h",r.hospedeId),qt=St.fi("q",r.quartoId);
auditar("checkout.finalizar","Check-out de "+(hsp?hsp.nome:"hóspede")+(qt?(" - Apto "+qt.numero):"")+" - Total "+fmtC(total)+(jaPago>0?(" (sinal "+fmtC(jaPago)+", saldo "+fmtC(saldo)+")"):"")+" ("+(pag?pag.value:"dinheiro")+")");
st(saldo>0?("Check-out realizado! Saldo cobrado: "+fmtC(saldo)):"Check-out realizado! (já estava pago)","success");
cm();renderCheckout();}
