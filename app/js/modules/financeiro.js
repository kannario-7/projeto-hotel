// Módulo: Financeiro
import { esc, fmtC, fmtD, td } from "../utils.js";
import { St } from "../store.js";

export function renderFinanceiro(){var el=document.getElementById("pageContent");
el.innerHTML='<div class="page-header"><div><h2>Financeiro</h2><p>Controle financeiro do hotel</p></div></div>'+
'<div style="display:flex;gap:12px;align-items:end;margin-bottom:16px;flex-wrap:wrap"><div class="form-group" style="margin:0"><label>Data Inicio</label><input type="date" id="filtroFi"></div>'+
'<div class="form-group" style="margin:0"><label>Data Fim</label><input type="date" id="filtroFf"></div>'+
'<button class="btn btn-primary btn-sm" onclick="filtrarFinanceiro()">Filtrar</button>'+
'<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'filtroFi\').value=\'\';document.getElementById(\'filtroFf\').value=\'\';filtrarFinanceiro()">Limpar</button></div><div id="financeiroContent">'+buildFinanceiroContent()+'</div>';}

export function filtrarFinanceiro(){var fi=document.getElementById("filtroFi"),ff=document.getElementById("filtroFf");
var pagamentos=St.ga("pg");if(fi&&fi.value)pagamentos=pagamentos.filter(function(p){return p.data>=fi.value});
if(ff&&ff.value)pagamentos=pagamentos.filter(function(p){return p.data<=ff.value});
document.getElementById("financeiroContent").innerHTML=buildFinanceiroContent(pagamentos);}

function buildFinanceiroContent(pg){if(!pg)pg=St.ga("pg");
var hospedes=St.ga("h");var totalPago=pg.reduce(function(s,p){return s+(p.valor||0)},0);
var hoje=td();var hojePago=pg.filter(function(p){return p.data===hoje}).reduce(function(s,p){return s+(p.valor||0)},0);
var porForma={};pg.forEach(function(p){porForma[p.forma]=(porForma[p.forma]||0)+(p.valor||0)});
var html='<div class="cards-row"><div class="stat-card"><h3>Receita Total</h3><div class="value">'+fmtC(totalPago)+'</div></div>'+
'<div class="stat-card"><h3>Receita Hoje</h3><div class="value">'+fmtC(hojePago)+'</div></div>'+
'<div class="stat-card"><h3>Transacoes</h3><div class="value">'+pg.length+'</div></div></div>';
if(Object.keys(porForma).length){html+='<h3 style="margin-bottom:12px;color:var(--text)">Resumo por Forma de Pagamento</h3><table><tr><th>Forma</th><th>Total</th></tr>'+
Object.keys(porForma).map(function(f){return'<tr><td>'+esc(f.charAt(0).toUpperCase()+f.slice(1))+'</td><td>'+fmtC(porForma[f])+'</td></tr>'}).join('')+'</table>';}
if(pg.length){html+='<h3 style="margin-bottom:12px;color:var(--text)">Historico de Pagamentos</h3><table><tr><th>Data</th><th>Hospede</th><th>Valor</th><th>Forma</th><th>Obs</th></tr>'+
pg.sort(function(a,b){return b.data.localeCompare(a.data)}).slice(0,100).map(function(p){var h=hospedes.find(function(x){return x.id===p.hospedeId});return'<tr><td>'+fmtD(p.data)+'</td><td>'+(h?esc(h.nome):"-")+'</td><td>'+fmtC(p.valor)+'</td><td>'+esc(p.forma.charAt(0).toUpperCase()+p.forma.slice(1))+'</td><td>'+esc(p.observacoes||"-")+'</td></tr>'}).join('')+'</table>';}
else{html+='<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum pagamento neste periodo.</p>';}
return html;}
