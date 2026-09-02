// Módulo: Relatórios profissionais (ocupacao/ADR/RevPAR, receita detalhada,
// desempenho por tipo, reservas e financeiro/lucro) com filtro de periodo e exportacao.
import { esc, fmtC, fmtD, td, dB } from "../utils.js";
import { St, getStatusBadge } from "../store.js";
import { st } from "../ui.js";

var periodo = { fi:"", ff:"" };
var abaAtual = "ocupacao";

export function renderRelatorios(){var el=document.getElementById("pageContent");
el.innerHTML='<div class="page-header"><div><h2>Relatorios</h2><p>Relatorios e estatisticas do hotel</p></div></div>'+
'<div style="display:flex;gap:12px;align-items:end;margin-bottom:16px;flex-wrap:wrap">'+
'<div class="form-group" style="margin:0"><label>Data Inicio</label><input type="date" id="relFi" value="'+esc(periodo.fi)+'"></div>'+
'<div class="form-group" style="margin:0"><label>Data Fim</label><input type="date" id="relFf" value="'+esc(periodo.ff)+'"></div>'+
'<button class="btn btn-primary btn-sm" onclick="aplicarPeriodoRel()">Aplicar</button>'+
'<button class="btn btn-secondary btn-sm" onclick="limparPeriodoRel()">Limpar</button></div>'+
'<div class="tabs">'+
'<div class="tab active" onclick="mudarRelatorio(this,\'ocupacao\')">Ocupacao</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'receita\')">Receita</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'tipos\')">Por Tipo de Quarto</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'reservas\')">Reservas</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'lucro\')">Lucro</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'proximas\')">Chegadas</div>'+
'<div class="tab" onclick="mudarRelatorio(this,\'vip\')">Hospedes Fieis</div>'+
'</div><div id="relatorioContent">'+render(abaAtual)+'</div>';}

export function mudarRelatorio(tab,tipo){tab.parentElement.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active")});tab.classList.add("active");abaAtual=tipo;
document.getElementById("relatorioContent").innerHTML=render(tipo);}

export function aplicarPeriodoRel(){var a=document.getElementById("relFi"),b=document.getElementById("relFf");periodo.fi=a?a.value:"";periodo.ff=b?b.value:"";document.getElementById("relatorioContent").innerHTML=render(abaAtual);}
export function limparPeriodoRel(){periodo.fi="";periodo.ff="";var a=document.getElementById("relFi"),b=document.getElementById("relFf");if(a)a.value="";if(b)b.value="";document.getElementById("relatorioContent").innerHTML=render(abaAtual);}

function render(tipo){
  if(tipo==="ocupacao")return buildOcupacao();
  if(tipo==="receita")return buildReceita();
  if(tipo==="tipos")return buildPorTipo();
  if(tipo==="reservas")return buildReservas();
  if(tipo==="lucro")return buildLucro();
  if(tipo==="proximas")return buildChegadas();
  if(tipo==="vip")return buildVIP();
  return "";
}

function noPer(lista,campo){campo=campo||"data";return lista.filter(function(x){var v=x[campo];if(!v)return false;if(periodo.fi&&v<periodo.fi)return false;if(periodo.ff&&v>periodo.ff)return false;return true;});}
function labelPer(){if(periodo.fi||periodo.ff)return' &middot; '+(periodo.fi?fmtD(periodo.fi):"inicio")+' a '+(periodo.ff?fmtD(periodo.ff):"hoje");return' &middot; todo o periodo';}
function diasPeriodo(){ // numero de dias do periodo (para RevPAR); se sem filtro, usa amplitude das reservas
  if(periodo.fi&&periodo.ff){var d=dB(periodo.fi,periodo.ff);return d>0?d:1;}
  return 30; // padrao mensal quando sem periodo definido
}
function acoesRel(nomeCsv){return '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px"><button class="btn btn-sm btn-secondary" onclick="exportarRelatorioCSV(\''+nomeCsv+'\')">Exportar CSV</button><button class="btn btn-sm btn-secondary" onclick="window.print()">Imprimir</button></div>';}

// reservas que se sobrepoem ao periodo (por checkin)
function reservasNoPeriodo(){var r=St.ga("r");if(!periodo.fi&&!periodo.ff)return r;return r.filter(function(x){var ci=x.dataCheckin;if(!ci)return false;if(periodo.fi&&x.dataCheckout&&x.dataCheckout<periodo.fi)return false;if(periodo.ff&&ci>periodo.ff)return false;return true;});}

// ---- OCUPACAO AVANCADA (taxa, ADR, RevPAR, noites) ----
function buildOcupacao(){
  var quartos=St.ga("q").filter(function(q){return q.ativo!==false});
  var totalQuartos=quartos.length;
  var r=reservasNoPeriodo().filter(function(x){return ["confirmada","checkin","checkout"].indexOf(x.status)>=0});
  var noitesVendidas=r.reduce(function(s,x){return s+(x.noites||0)},0);
  var receitaDiarias=r.reduce(function(s,x){return s+(x.total||0)},0);
  var dias=diasPeriodo();
  var quartoNoitesDisp=totalQuartos*dias;
  var taxaOcup=quartoNoitesDisp?Math.round(noitesVendidas/quartoNoitesDisp*100):0;
  var adr=noitesVendidas?Math.round(receitaDiarias/noitesVendidas):0;      // diaria media
  var revpar=quartoNoitesDisp?Math.round(receitaDiarias/quartoNoitesDisp):0; // receita por quarto disponivel
  // status atual dos quartos
  var ocupados=quartos.filter(function(q){return q.status==="ocupado"}).length;
  var disp=quartos.filter(function(q){return q.status==="disponivel"}).length;
  var manut=quartos.filter(function(q){return q.status==="manutencao"}).length;
  var limp=quartos.filter(function(q){return q.status==="limpeza"}).length;
  var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Ocupacao e Desempenho'+labelPer()+'</h3>'+
  '<div class="cards-row">'+
  '<div class="stat-card"><h3>Taxa de Ocupacao</h3><div class="value">'+taxaOcup+'%</div><div class="sub">'+noitesVendidas+' de '+quartoNoitesDisp+' noites</div></div>'+
  '<div class="stat-card"><h3>Diaria Media (ADR)</h3><div class="value">'+fmtC(adr)+'</div></div>'+
  '<div class="stat-card"><h3>RevPAR</h3><div class="value">'+fmtC(revpar)+'</div><div class="sub">receita/quarto disp.</div></div>'+
  '<div class="stat-card"><h3>Noites Vendidas</h3><div class="value">'+noitesVendidas+'</div></div>'+
  '<div class="stat-card"><h3>Receita de Diarias</h3><div class="value">'+fmtC(receitaDiarias)+'</div></div>'+
  '</div>'+
  '<h3 style="margin:18px 0 10px;color:var(--text)">Status atual dos quartos</h3><table><tr><th>Status</th><th>Qtd</th><th>%</th></tr>'+
  [["Ocupados",ocupados],["Disponiveis",disp],["Em manutencao",manut],["Em limpeza",limp]].map(function(x){var pc=totalQuartos?Math.round(x[1]/totalQuartos*100):0;return'<tr><td>'+x[0]+'</td><td>'+x[1]+'</td><td>'+pc+'%</td></tr>'}).join('')+
  '<tr><td><b>Total</b></td><td><b>'+totalQuartos+'</b></td><td><b>100%</b></td></tr></table>'+
  '</div>'+acoesRel("ocupacao");
  return html;
}

// ---- RECEITA DETALHADA (por dia, diarias vs servicos) ----
function buildReceita(){
  var pg=noPer(St.ga("pg"));
  var totalPago=pg.reduce(function(s,p){return s+(p.valor||0)},0);
  var r=reservasNoPeriodo().filter(function(x){return ["confirmada","checkin","checkout"].indexOf(x.status)>=0});
  var recDiarias=r.reduce(function(s,x){return s+(x.total||0)},0);
  var consumos=noPer(St.ga("os"));
  var recServicos=consumos.reduce(function(s,c){return s+(c.total||0)},0);
  var porDia={};pg.forEach(function(p){porDia[p.data]=(porDia[p.data]||0)+(p.valor||0)});
  var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Receita Detalhada'+labelPer()+'</h3>'+
  '<div class="cards-row">'+
  '<div class="stat-card"><h3>Total Recebido</h3><div class="value" style="color:#43d18c">'+fmtC(totalPago)+'</div></div>'+
  '<div class="stat-card"><h3>Diarias (reservas)</h3><div class="value">'+fmtC(recDiarias)+'</div></div>'+
  '<div class="stat-card"><h3>Servicos/Consumo</h3><div class="value">'+fmtC(recServicos)+'</div></div>'+
  '</div>';
  var dias=Object.keys(porDia).sort().reverse();
  if(dias.length){html+='<h3 style="margin:18px 0 10px;color:var(--text)">Receita por Dia</h3><table><tr><th>Data</th><th>Recebido</th></tr>'+
  dias.map(function(d){return'<tr><td>'+fmtD(d)+'</td><td>'+fmtC(porDia[d])+'</td></tr>'}).join('')+'</table>';}
  else{html+='<p style="color:var(--text-mute);padding:16px 0">Nenhuma receita no periodo.</p>';}
  html+='</div>'+acoesRel("receita");
  return html;
}

// ---- DESEMPENHO POR TIPO DE QUARTO ----
function buildPorTipo(){
  var tq=St.ga("tq"), r=reservasNoPeriodo().filter(function(x){return ["confirmada","checkin","checkout"].indexOf(x.status)>=0});
  var stats={};tq.forEach(function(t){stats[t.id]={nome:t.nome,reservas:0,noites:0,receita:0}});
  r.forEach(function(x){var tid=x.tipoQuartoId;if(!tid){var q=St.fi("q",x.quartoId);tid=q?q.tipoQuartoId:null;}if(tid&&stats[tid]){stats[tid].reservas++;stats[tid].noites+=(x.noites||0);stats[tid].receita+=(x.total||0);}});
  var linhas=Object.keys(stats).map(function(k){return stats[k]}).filter(function(s){return true;});
  var totalRec=linhas.reduce(function(s,x){return s+x.receita},0);
  var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Desempenho por Tipo de Quarto'+labelPer()+'</h3>';
  if(linhas.length){html+='<table><tr><th>Tipo</th><th>Reservas</th><th>Noites</th><th>Receita</th><th>% Receita</th></tr>'+
  linhas.sort(function(a,b){return b.receita-a.receita}).map(function(s){var pc=totalRec?Math.round(s.receita/totalRec*100):0;return'<tr><td>'+esc(s.nome)+'</td><td>'+s.reservas+'</td><td>'+s.noites+'</td><td>'+fmtC(s.receita)+'</td><td>'+pc+'%</td></tr>'}).join('')+
  '<tr><td><b>Total</b></td><td><b>'+linhas.reduce(function(s,x){return s+x.reservas},0)+'</b></td><td><b>'+linhas.reduce(function(s,x){return s+x.noites},0)+'</b></td><td><b>'+fmtC(totalRec)+'</b></td><td><b>100%</b></td></tr></table>';}
  else{html+='<p style="color:var(--text-mute);padding:16px 0">Sem dados de reservas no periodo.</p>';}
  html+='</div>'+acoesRel("por-tipo");
  return html;
}

// ---- RESERVAS (status, cancelamento, estadia media) ----
function buildReservas(){
  var r=reservasNoPeriodo();
  var porStatus={};r.forEach(function(x){porStatus[x.status]=(porStatus[x.status]||0)+1});
  var total=r.length;
  var canceladas=porStatus["cancelada"]||0;
  var taxaCancel=total?Math.round(canceladas/total*100):0;
  var comNoites=r.filter(function(x){return x.noites});
  var estadiaMedia=comNoites.length?(comNoites.reduce(function(s,x){return s+x.noites},0)/comNoites.length):0;
  var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Relatorio de Reservas'+labelPer()+'</h3>'+
  '<div class="cards-row">'+
  '<div class="stat-card"><h3>Total de Reservas</h3><div class="value">'+total+'</div></div>'+
  '<div class="stat-card"><h3>Taxa de Cancelamento</h3><div class="value" style="color:'+(taxaCancel>20?"#f16a6e":"var(--text)")+'">'+taxaCancel+'%</div></div>'+
  '<div class="stat-card"><h3>Estadia Media</h3><div class="value">'+estadiaMedia.toFixed(1)+'</div><div class="sub">noites</div></div>'+
  '</div>'+
  '<h3 style="margin:18px 0 10px;color:var(--text)">Por Status</h3><table><tr><th>Status</th><th>Qtd</th><th>%</th></tr>'+
  Object.keys(porStatus).map(function(s){var pc=total?Math.round(porStatus[s]/total*100):0;return'<tr><td>'+getStatusBadge(s)+'</td><td>'+porStatus[s]+'</td><td>'+pc+'%</td></tr>'}).join('')+'</table>'+
  '</div>'+acoesRel("reservas");
  return html;
}

// ---- LUCRO (receita - despesa por categoria) ----
function buildLucro(){
  var pg=noPer(St.ga("pg")), ds=noPer(St.ga("ds"));
  var receita=pg.reduce(function(s,p){return s+(p.valor||0)},0);
  var despesa=ds.reduce(function(s,d){return s+(d.valor||0)},0);
  var lucro=receita-despesa;var margem=receita?Math.round(lucro/receita*100):0;
  var porCat={};ds.forEach(function(d){var c=d.categoria||"Outros";porCat[c]=(porCat[c]||0)+(d.valor||0)});
  var html='<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Resultado (Lucro)'+labelPer()+'</h3>'+
  '<div class="cards-row">'+
  '<div class="stat-card"><h3>Receita</h3><div class="value" style="color:#43d18c">'+fmtC(receita)+'</div></div>'+
  '<div class="stat-card"><h3>Despesa</h3><div class="value" style="color:#f16a6e">'+fmtC(despesa)+'</div></div>'+
  '<div class="stat-card"><h3>Lucro Liquido</h3><div class="value" style="color:'+(lucro>=0?"#43d18c":"#f16a6e")+'">'+fmtC(lucro)+'</div><div class="sub">margem '+margem+'%</div></div>'+
  '</div>';
  if(Object.keys(porCat).length){html+='<h3 style="margin:18px 0 10px;color:var(--text)">Despesas por Categoria</h3><table><tr><th>Categoria</th><th>Total</th><th>%</th></tr>'+
  Object.keys(porCat).sort(function(a,b){return porCat[b]-porCat[a]}).map(function(c){var pc=despesa?Math.round(porCat[c]/despesa*100):0;return'<tr><td>'+esc(c)+'</td><td>'+fmtC(porCat[c])+'</td><td>'+pc+'%</td></tr>'}).join('')+'</table>';}
  html+='</div>'+acoesRel("lucro");
  return html;
}

// ---- CHEGADAS ----
function buildChegadas(){var hoje=td(),prox=St.ga("r").filter(function(r){return r.dataCheckin>=hoje&&["confirmada","pendente"].indexOf(r.status)>=0}).sort(function(a,b){return a.dataCheckin.localeCompare(b.dataCheckin)}).slice(0,30);
if(!prox.length)return'<div class="report-container"><p style="color:var(--text-mute)">Nenhuma chegada prevista.</p></div>';
return'<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Proximas Chegadas</h3><table><tr><th>Data</th><th>Hospede</th><th>Quarto</th><th>Noites</th><th>Status</th></tr>'+
prox.map(function(r){var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);return'<tr><td>'+fmtD(r.dataCheckin)+'</td><td>'+(h?esc(h.nome):"-")+'</td><td>'+(q?esc("Apto "+q.numero):"-")+'</td><td>'+(r.noites||"-")+'</td><td>'+getStatusBadge(r.status)+'</td></tr>'}).join('')+'</table></div>'+acoesRel("chegadas");}

// ---- HOSPEDES FIEIS ----
function buildVIP(){var count={};St.ga("r").filter(function(r){return r.status==="checkout"}).forEach(function(r){count[r.hospedeId]=(count[r.hospedeId]||0)+1});
var sorted=Object.keys(count).sort(function(a,b){return count[b]-count[a]}).slice(0,15);
if(!sorted.length)return'<div class="report-container"><p style="color:var(--text-mute)">Nenhum hospede com estadias concluidas.</p></div>';
return'<div class="report-container"><h3 style="margin-bottom:16px;color:var(--text)">Top Hospedes - Mais Estadias</h3><table><tr><th>#</th><th>Hospede</th><th>Estadias</th></tr>'+
sorted.map(function(id,i){var h=St.fi("h",id);return'<tr><td>'+(i+1)+'</td><td>'+(h?esc(h.nome):"-")+'</td><td>'+count[id]+'</td></tr>'}).join('')+'</table></div>'+acoesRel("hospedes-fieis");}

// ---- EXPORTACAO CSV (gera a partir da aba atual) ----
function baixarCSV(nome,linhas){var conteudo=linhas.map(function(l){return l.map(function(c){var s=String(c==null?"":c);return '"'+s.replace(/"/g,'""')+'"';}).join(";")}).join("\r\n");var blob=new Blob(["\ufeff"+conteudo],{type:"text/csv;charset=utf-8;"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=nome;document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},100);st("Relatorio exportado.","success");}
function reais(c){return ((c||0)/100).toFixed(2).replace(".",",");}

export function exportarRelatorioCSV(nome){
  var linhas=[];
  if(abaAtual==="receita"){var pg=noPer(St.ga("pg"));var porDia={};pg.forEach(function(p){porDia[p.data]=(porDia[p.data]||0)+(p.valor||0)});linhas.push(["Data","Recebido"]);Object.keys(porDia).sort().forEach(function(d){linhas.push([fmtD(d),reais(porDia[d])]);});}
  else if(abaAtual==="lucro"){var pgL=noPer(St.ga("pg")),dsL=noPer(St.ga("ds"));var rec=pgL.reduce(function(s,p){return s+(p.valor||0)},0),des=dsL.reduce(function(s,d){return s+(d.valor||0)},0);linhas.push(["Indicador","Valor"],["Receita",reais(rec)],["Despesa",reais(des)],["Lucro",reais(rec-des)]);}
  else if(abaAtual==="reservas"){var r=reservasNoPeriodo();var ps={};r.forEach(function(x){ps[x.status]=(ps[x.status]||0)+1});linhas.push(["Status","Quantidade"]);Object.keys(ps).forEach(function(s){linhas.push([s,ps[s]]);});}
  else if(abaAtual==="tipos"){var tq=St.ga("tq"),rr=reservasNoPeriodo().filter(function(x){return ["confirmada","checkin","checkout"].indexOf(x.status)>=0});var stx={};tq.forEach(function(t){stx[t.id]={nome:t.nome,reservas:0,noites:0,receita:0}});rr.forEach(function(x){var tid=x.tipoQuartoId||(St.fi("q",x.quartoId)||{}).tipoQuartoId;if(tid&&stx[tid]){stx[tid].reservas++;stx[tid].noites+=(x.noites||0);stx[tid].receita+=(x.total||0);}});linhas.push(["Tipo","Reservas","Noites","Receita"]);Object.keys(stx).forEach(function(k){var s=stx[k];linhas.push([s.nome,s.reservas,s.noites,reais(s.receita)]);});}
  else{ // ocupacao e demais: exporta resumo simples
    var quartos=St.ga("q").filter(function(q){return q.ativo!==false});var rO=reservasNoPeriodo().filter(function(x){return ["confirmada","checkin","checkout"].indexOf(x.status)>=0});var noites=rO.reduce(function(s,x){return s+(x.noites||0)},0);linhas.push(["Indicador","Valor"],["Total de quartos",quartos.length],["Noites vendidas",noites]);
  }
  baixarCSV((nome||"relatorio")+".csv",linhas);
}
