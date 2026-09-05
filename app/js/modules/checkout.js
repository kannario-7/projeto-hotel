// Módulo: Check-out
import { esc, fmtC, fmtD, td, dB } from "../utils.js";
import { St, auditar } from "../store.js";
import { st, sm, cm, closeModal } from "../ui.js";
import { imprimirDocumento } from "./impressao.js";

// guarda os dados da ultima fatura exibida para permitir impressao premium
var faturaAtual = null;

export function renderCheckout(){var el=document.getElementById("pageContent");
var ativas=St.ga("r").filter(function(r){return r.status==="checkin"});
el.innerHTML='<div class="page-header"><div><h2>Check-out</h2><p>Realizar check-out e encerrar estadia</p></div></div>';

if(!ativas.length){el.innerHTML+='<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum hospede em estadia ativa.</p>';return;}

el.innerHTML+='<table><tr><th>Hospede</th><th>Quarto</th><th>Check-in</th><th>Check-out Previsto</th><th>Acoes</th></tr>'+
ativas.map(function(r){var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);return'<tr><td>'+(h?esc(h.nome):"-")+'</td><td>'+(q?esc("Apto "+q.numero):"-")+'</td><td>'+fmtD(r.dataCheckin)+'</td><td>'+fmtD(r.dataCheckout)+'</td><td><button class="btn btn-sm btn-primary" onclick="realizarCheckout(\''+r.id+'\')">Fazer Check-out</button></td></tr>'}).join('')+'</table>';}

export function realizarCheckout(id){var r=St.fi("r",id);if(!r)return;
var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);
var hoje=td(),noitesReais=Math.max(1,dB(r.dataCheckin,hoje));
var tq=St.fi("tq",r.tipoQuartoId);
var diarias=tq?noitesReais*tq.precoDiaria:0;
var servicos=St.ga("os").filter(function(o){return o.reservaId===id});
var totalServicos=servicos.reduce(function(s,o){return s+(o.total||0)},0);
var config=St.gc(),taxa=config.tax||0,taxaImp=Math.round(diarias*taxa/100);
var total=diarias+totalServicos+taxaImp;
var temServicos=servicos.length>0;

// guarda os dados para impressao premium
faturaAtual={ id:id, hospede:(h?h.nome:""), documento:(h?h.documento:""), quarto:(q?q.numero:""),
  checkin:r.dataCheckin, checkout:hoje, noites:noitesReais, tipo:(tq?tq.nome:""),
  diarias:diarias, servicos:servicos.map(function(o){var sv=St.fi("sv",o.servicoId);return {nome:sv?sv.nome:"-",qtd:o.quantidade,unit:o.precoUnit,total:o.total};}),
  taxa:taxa, taxaImp:taxaImp, total:total };

var fatura='<div style="background:var(--surface-2);padding:20px;border-radius:12px;margin-bottom:16px">'+
'<h4 style="margin-bottom:12px;color:var(--text)">Fatura - '+(h?esc(h.nome):"")+' (Apto '+(q?q.numero:"")+')</h4>'+
'<table style="margin-bottom:8px"><tr><td>Periodo:</td><td>'+fmtD(r.dataCheckin)+' a '+fmtD(hoje)+' ('+noitesReais+' noite(s))</td></tr>'+
'<tr><td>Tipo Quarto:</td><td>'+(tq?esc(tq.nome):"-")+'</td></tr>'+
'<tr><td>Diarias:</td><td>'+fmtC(diarias)+'</td></tr></table>'+
(temServicos?'<h5 style="margin:8px 0 4px;color:var(--text)">Consumo Detalhado</h5><table><tr><th>Servico</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th></tr>'+
servicos.map(function(o){var sv=St.fi("sv",o.servicoId);return'<tr><td>'+(sv?esc(sv.nome):"-")+'</td><td>'+o.quantidade+'</td><td>'+fmtC(o.precoUnit)+'</td><td>'+fmtC(o.total)+'</td></tr>'}).join('')+'</table>':'')+
'<table style="margin-top:8px"><tr><td>Taxa ('+taxa+'%):</td><td>'+fmtC(taxaImp)+'</td></tr>'+
'<tr style="font-weight:700"><td>Total:</td><td>'+fmtC(total)+'</td></tr></table></div>'+
'<div class="form-group"><label>Forma de Pagamento *</label><select id="coPag">'+
config.pm.map(function(p){return'<option value="'+p+'">'+esc(p.charAt(0).toUpperCase()+p.slice(1))+'</option>'}).join('')+'</select></div>'+
'<div class="form-group"><label>Observacoes</label><textarea id="coObs" rows="2" placeholder="Observacoes do checkout"></textarea></div>';

sm("Check-out - Fatura",fatura,'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-secondary" onclick="imprimirFatura()">Imprimir Fatura</button><button class="btn btn-primary" onclick="finalizarCheckout(\''+id+'\')">Finalizar Check-out</button>');}

// Impressao premium da fatura (layout padrao do sistema)
export function imprimirFatura(){
  if(!faturaAtual)return st("Nenhuma fatura para imprimir.","warning");
  var f=faturaAtual;
  var corpo='<div class="cards"><div class="card"><h4>Hospede</h4><div class="v" style="font-size:14px">'+esc(f.hospede)+'</div></div>'+
    '<div class="card"><h4>Quarto</h4><div class="v" style="font-size:14px">Apto '+esc(f.quarto)+'</div></div>'+
    '<div class="card"><h4>Periodo</h4><div class="v" style="font-size:13px">'+fmtD(f.checkin)+' a '+fmtD(f.checkout)+'</div></div></div>';
  corpo+='<table><tr><th>Descricao</th><th>Detalhe</th><th>Valor</th></tr>'+
    '<tr><td>Diarias</td><td>'+f.noites+' noite(s) - '+esc(f.tipo)+'</td><td>'+fmtC(f.diarias)+'</td></tr>'+
    f.servicos.map(function(s){return '<tr><td>'+esc(s.nome)+'</td><td>'+s.qtd+' x '+fmtC(s.unit)+'</td><td>'+fmtC(s.total)+'</td></tr>';}).join('')+
    '<tr><td>Taxa de servico</td><td>'+f.taxa+'%</td><td>'+fmtC(f.taxaImp)+'</td></tr>'+
    '<tr style="font-weight:800"><td>TOTAL</td><td></td><td>'+fmtC(f.total)+'</td></tr></table>';
  imprimirDocumento("Fatura de Hospedagem", "Hospede: "+f.hospede+(f.documento?(" - "+f.documento):""), corpo);
}

export async function finalizarCheckout(id){var r=St.fi("r",id);if(!r)return;
var hoje=td(),noitesReais=Math.max(1,dB(r.dataCheckin,hoje));
var tq=St.fi("tq",r.tipoQuartoId);
var diarias=tq?noitesReais*tq.precoDiaria:0;
var servicos=St.ga("os").filter(function(o){return o.reservaId===id});
var totalServicos=servicos.reduce(function(s,o){return s+(o.total||0)},0);
var config=St.gc(),taxa=config.tax||0,taxaImp=Math.round(diarias*taxa/100);
var total=diarias+totalServicos+taxaImp;
var pag=document.getElementById("coPag"),obs=document.getElementById("coObs");
var pagamento={reservaId:id,hospedeId:r.hospedeId,valor:total,forma:(pag?pag.value:"dinheiro"),data:hoje,observacoes:(obs?obs.value.trim():"")};
var btn=document.querySelector("#modalFooter .btn-primary"); if(btn){btn.disabled=true;btn.textContent="Finalizando...";}
// PRIMEIRO grava o pagamento AGUARDANDO o banco. Se falhar, aborta sem marcar checkout
// (evita quarto liberado / reserva fechada sem o pagamento ter sido registrado).
var resPg=await St.inErr("pg",pagamento);
if(!resPg.ok){
  if(btn){btn.disabled=false;btn.textContent="Confirmar Check-out";}
  return st("Nao foi possivel registrar o pagamento. Check-out NAO concluido. Tente novamente.","error"),false;
}
// Pagamento confirmado: agora atualiza reserva e quarto.
var resR=await St.upErr("r",id,{status:"checkout",dataCheckout:hoje,total:total});
if(!resR.ok){
  if(btn){btn.disabled=false;btn.textContent="Confirmar Check-out";}
  return st("Pagamento registrado, mas houve erro ao fechar a reserva. Verifique e tente de novo.","error"),false;
}
St.up("q",r.quartoId,{status:"limpeza"});
var hsp=St.fi("h",r.hospedeId),qt=St.fi("q",r.quartoId);
auditar("checkout.finalizar","Check-out de "+(hsp?hsp.nome:"hospede")+(qt?(" - Apto "+qt.numero):"")+" - Total "+fmtC(total)+" ("+(pag?pag.value:"dinheiro")+")");
st("Check-out realizado! Total: "+fmtC(total),"success");
cm();renderCheckout();}
