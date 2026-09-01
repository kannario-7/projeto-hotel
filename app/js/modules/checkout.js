// Módulo: Check-out
import { esc, fmtC, fmtD, td, dB } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal } from "../ui.js";

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

sm("Check-out - Fatura",fatura,'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="finalizarCheckout(\''+id+'\')">Finalizar Check-out</button>');}

export function finalizarCheckout(id){var r=St.fi("r",id);if(!r)return;
var hoje=td(),noitesReais=Math.max(1,dB(r.dataCheckin,hoje));
var tq=St.fi("tq",r.tipoQuartoId);
var diarias=tq?noitesReais*tq.precoDiaria:0;
var servicos=St.ga("os").filter(function(o){return o.reservaId===id});
var totalServicos=servicos.reduce(function(s,o){return s+(o.total||0)},0);
var config=St.gc(),taxa=config.tax||0,taxaImp=Math.round(diarias*taxa/100);
var total=diarias+totalServicos+taxaImp;
var pag=document.getElementById("coPag"),obs=document.getElementById("coObs");
var pagamento={id:crypto.randomUUID(),reservaId:id,hospedeId:r.hospedeId,valor:total,forma:(pag?pag.value:"dinheiro"),data:hoje,observacoes:(obs?obs.value.trim():"")};
St.in("pg",pagamento);
St.up("r",id,{status:"checkout",dataCheckout:hoje,total:total});
St.up("q",r.quartoId,{status:"limpeza"});
st("Check-out realizado! Total: "+fmtC(total),"success");
cm();renderCheckout();}
