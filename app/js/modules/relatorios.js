// Módulo: Relatórios
import { esc, fmtC, fmtD, td } from "../utils.js";
import { St, getStatusBadge } from "../store.js";

export function renderRelatorios(){var el=document.getElementById("pageContent");
var reservas=St.ga("r"),quartos=St.ga("q"),tq=St.ga("tq");
el.innerHTML='<div class="page-header"><div><h2>Relatorios</h2><p>Relatorios e estatisticas do hotel</p></div></div>'+
'<div class="tabs">'+
'<div class="tab active" onclick="mudarRelatorio(this,\'ocupacao\')">Ocupacao</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'receita\')">Receita</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'proximas\')">Proximas Chegadas</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'vip\')">Hospedes Fieis</div>'+
'</div><div id="relatorioContent">'+buildRelatorioOcupacao(reservas,quartos,tq)+'</div>';}

export function mudarRelatorio(tab,tipo){tab.parentElement.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active")});tab.classList.add("active");
var reservas=St.ga("r"),quartos=St.ga("q"),hospedes=St.ga("h"),pagamentos=St.ga("pg"),tq=St.ga("tq");
var html="";
if(tipo==="ocupacao")html=buildRelatorioOcupacao(reservas,quartos,tq);
else if(tipo==="receita")html=buildRelatorioReceita(pagamentos);
else if(tipo==="proximas")html=buildRelatorioChegadas(reservas,hospedes,quartos);
else if(tipo==="vip")html=buildRelatorioVIP(reservas,hospedes);
document.getElementById("relatorioContent").innerHTML=html;}

function buildRelatorioOcupacao(reservas,quartos,tq){var total=quartos.filter(function(q){return q.ativo!==false}).length;
var ocupados=quartos.filter(function(q){return q.status==="ocupado"}).length;
var disponiveis=quartos.filter(function(q){return q.status==="disponivel"}).length;
var manutencao=quartos.filter(function(q){return q.status==="manutencao"}).length;
var limpeza=quartos.filter(function(q){return q.status==="limpeza"}).length;
return'<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Taxa de Ocupacao</h3>'+
'<div class="cards-row">'+
'<div class="stat-card"><h3>Total Quartos</h3><div class="value">'+total+'</div></div>'+
'<div class="stat-card"><h3>Ocupados</h3><div class="value">'+ocupados+'</div><div class="sub">'+(total?Math.round(ocupados/total*100):0)+'%</div></div>'+
'<div class="stat-card"><h3>Disponiveis</h3><div class="value">'+disponiveis+'</div></div>'+
'<div class="stat-card"><h3>Manutencao</h3><div class="value">'+manutencao+'</div></div>'+
'<div class="stat-card"><h3>Limpeza</h3><div class="value">'+limpeza+'</div></div>'+
'</div></div>'+
'<div style="text-align:right"><button class="btn btn-secondary" onclick="window.print()">Imprimir Relatorio</button></div>';}

function buildRelatorioReceita(pagamentos){var total=pagamentos.reduce(function(s,p){return s+(p.valor||0)},0);
var porMes={};pagamentos.forEach(function(p){var mes=p.data?p.data.slice(0,7):"";if(mes){porMes[mes]=(porMes[mes]||0)+(p.valor||0)}});
var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Receita Total: '+fmtC(total)+'</h3>';
if(Object.keys(porMes).length){html+='<table><tr><th>Mes</th><th>Receita</th></tr>'+
Object.keys(porMes).sort().reverse().map(function(m){return'<tr><td>'+m+'</td><td>'+fmtC(porMes[m])+'</td></tr>'}).join('')+'</table>';}
else{html+='<p style="color:var(--text-mute)">Nenhuma receita registrada.</p>';}
html+='</div><div style="text-align:right"><button class="btn btn-secondary" onclick="window.print()">Imprimir Relatorio</button></div>';return html;}

function buildRelatorioChegadas(reservas,hospedes,quartos){var hoje=td(),prox=reservas.filter(function(r){return r.dataCheckin>=hoje&&["confirmada","pendente"].includes(r.status)}).sort(function(a,b){return a.dataCheckin.localeCompare(b.dataCheckin)}).slice(0,20);
if(!prox.length)return'<div class="report-container"><p style="color:var(--text-mute)">Nenhuma chegada prevista.</p></div>';
var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Proximas Chegadas</h3><table><tr><th>Data</th><th>Hospede</th><th>Quarto</th><th>Noites</th><th>Status</th></tr>'+
prox.map(function(r){var h=hospedes.find(function(x){return x.id===r.hospedeId}),q=quartos.find(function(x){return x.id===r.quartoId});return'<tr><td>'+fmtD(r.dataCheckin)+'</td><td>'+(h?esc(h.nome):"-")+'</td><td>'+(q?esc("Apto "+q.numero):"-")+'</td><td>'+(r.noites||"-")+'</td><td>'+getStatusBadge(r.status)+'</td></tr>'}).join('')+'</table></div>'+
'<div style="text-align:right"><button class="btn btn-secondary" onclick="window.print()">Imprimir Relatorio</button></div>';return html;}

function buildRelatorioVIP(reservas,hospedes){var count={};reservas.filter(function(r){return r.status==="checkout"}).forEach(function(r){count[r.hospedeId]=(count[r.hospedeId]||0)+1});
var sorted=Object.keys(count).sort(function(a,b){return count[b]-count[a]}).slice(0,10);
if(!sorted.length)return'<div class="report-container"><p style="color:var(--text-mute)">Nenhum hospede com estadias concluidas.</p></div>';
var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Top Hospedes - Mais Estadias</h3><table><tr><th>#</th><th>Hospede</th><th>Estadias</th></tr>'+
sorted.map(function(id,i){var h=hospedes.find(function(x){return x.id===id});return'<tr><td>'+(i+1)+'</td><td>'+(h?esc(h.nome):"-")+'</td><td>'+count[id]+'</td></tr>'}).join('')+'</table></div>'+
'<div style="text-align:right"><button class="btn btn-secondary" onclick="window.print()">Imprimir Relatorio</button></div>';return html;}
