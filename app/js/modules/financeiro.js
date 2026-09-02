// Módulo: Financeiro completo (Resumo/DRE, Receitas, Despesas, exportacao)
import { esc, fmtC, fmtD, td } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";

var CATEGORIAS_DESPESA = ["Folha de Pagamento","Fornecedores","Contas (agua/luz/internet)","Manutencao","Impostos","Marketing","Outros"];
var FORMAS = ["dinheiro","cartao","pix","boleto","transferencia"];

// filtro de periodo atual (compartilhado entre as abas)
var periodo = { fi:"", ff:"" };

export function renderFinanceiro(){var el=document.getElementById("pageContent");
el.innerHTML='<div class="page-header"><div><h2>Financeiro</h2><p>Controle financeiro completo do hotel</p></div></div>'+
'<div style="display:flex;gap:12px;align-items:end;margin-bottom:16px;flex-wrap:wrap">'+
'<div class="form-group" style="margin:0"><label>Data Inicio</label><input type="date" id="filtroFi" value="'+esc(periodo.fi)+'"></div>'+
'<div class="form-group" style="margin:0"><label>Data Fim</label><input type="date" id="filtroFf" value="'+esc(periodo.ff)+'"></div>'+
'<button class="btn btn-primary btn-sm" onclick="filtrarFinanceiro()">Filtrar</button>'+
'<button class="btn btn-secondary btn-sm" onclick="limparFiltroFinanceiro()">Limpar</button></div>'+
'<div class="tabs">'+
'<div class="tab active" onclick="mudarFinTab(this,\'resumo\')">Resumo</div>'+
'<div class="tab" onclick="mudarFinTab(this,\'receitas\')">Receitas</div>'+
'<div class="tab" onclick="mudarFinTab(this,\'despesas\')">Despesas</div>'+
'</div><div id="financeiroContent">'+buildResumo()+'</div>';}

var abaAtual = "resumo";
export function mudarFinTab(tab,aba){tab.parentElement.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active")});tab.classList.add("active");abaAtual=aba;
document.getElementById("financeiroContent").innerHTML = aba==="resumo"?buildResumo():aba==="receitas"?buildReceitas():buildDespesas();}

export function filtrarFinanceiro(){var fi=document.getElementById("filtroFi"),ff=document.getElementById("filtroFf");
periodo.fi=fi?fi.value:"";periodo.ff=ff?ff.value:"";
document.getElementById("financeiroContent").innerHTML = abaAtual==="resumo"?buildResumo():abaAtual==="receitas"?buildReceitas():buildDespesas();}
export function limparFiltroFinanceiro(){periodo.fi="";periodo.ff="";var a=document.getElementById("filtroFi"),b=document.getElementById("filtroFf");if(a)a.value="";if(b)b.value="";filtrarFinanceiro();}

// aplica o filtro de periodo a uma lista com campo .data
function noPeriodo(lista){return lista.filter(function(x){
  if(periodo.fi && x.data < periodo.fi) return false;
  if(periodo.ff && x.data > periodo.ff) return false;
  return true;
});}

function labelPeriodo(){if(periodo.fi||periodo.ff)return' &middot; '+(periodo.fi?fmtD(periodo.fi):"inicio")+' a '+(periodo.ff?fmtD(periodo.ff):"hoje");return' &middot; todo o periodo';}

// ---- RESUMO / DRE ----
function buildResumo(){
  var pg=noPeriodo(St.ga("pg")), ds=noPeriodo(St.ga("ds")), reservas=St.ga("r");
  var receita=pg.reduce(function(s,p){return s+(p.valor||0)},0);
  var despesa=ds.reduce(function(s,d){return s+(d.valor||0)},0);
  var lucro=receita-despesa;
  var margem=receita?Math.round(lucro/receita*100):0;
  var ticket=pg.length?Math.round(receita/pg.length):0;
  // contas a receber: reservas confirmadas/checkin ainda nao totalmente pagas (previsao)
  var aReceber=reservas.filter(function(r){return ["confirmada","checkin"].indexOf(r.status)>=0}).reduce(function(s,r){
    var pagoDaReserva=St.ga("pg").filter(function(p){return p.reservaId===r.id}).reduce(function(a,p){return a+(p.valor||0)},0);
    var saldo=(r.total||0)-pagoDaReserva; return s+(saldo>0?saldo:0);
  },0);
  var lucroCor = lucro>=0?"#43d18c":"#f16a6e";
  var html='<div class="report-container"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px"><h3 style="color:var(--text)">Resultado do Periodo'+labelPeriodo()+'</h3><button class="btn btn-sm btn-secondary" onclick="exportarResumoCSV()">Exportar CSV</button></div>'+
  '<div class="cards-row">'+
  '<div class="stat-card"><h3>Receita</h3><div class="value" style="color:#43d18c">'+fmtC(receita)+'</div></div>'+
  '<div class="stat-card"><h3>Despesa</h3><div class="value" style="color:#f16a6e">'+fmtC(despesa)+'</div></div>'+
  '<div class="stat-card"><h3>Lucro Liquido</h3><div class="value" style="color:'+lucroCor+'">'+fmtC(lucro)+'</div><div class="sub">margem '+margem+'%</div></div>'+
  '<div class="stat-card"><h3>Ticket Medio</h3><div class="value">'+fmtC(ticket)+'</div><div class="sub">'+pg.length+' pagamento(s)</div></div>'+
  '<div class="stat-card"><h3>A Receber</h3><div class="value" style="color:#f0a83c">'+fmtC(aReceber)+'</div><div class="sub">reservas em aberto</div></div>'+
  '</div></div>';
  html+=buildComparativoMensal();
  return html;
}

// comparativo mes a mes (receita x despesa x lucro) - usa TODO o historico (ignora filtro para visao anual)
function buildComparativoMensal(){
  var pg=St.ga("pg"), ds=St.ga("ds");
  var meses={};
  pg.forEach(function(p){var m=p.data?p.data.slice(0,7):"";if(m){meses[m]=meses[m]||{r:0,d:0};meses[m].r+=(p.valor||0);}});
  ds.forEach(function(x){var m=x.data?x.data.slice(0,7):"";if(m){meses[m]=meses[m]||{r:0,d:0};meses[m].d+=(x.valor||0);}});
  var chaves=Object.keys(meses).sort().reverse().slice(0,12);
  if(!chaves.length)return'<div class="report-container"><p style="color:var(--text-mute)">Sem dados para o comparativo mensal.</p></div>';
  var html='<div class="report-container"><h3 style="margin-bottom:14px;color:var(--text)">Comparativo Mensal (ultimos 12 meses)</h3><table><tr><th>Mes</th><th>Receita</th><th>Despesa</th><th>Lucro</th></tr>'+
  chaves.map(function(m){var v=meses[m];var l=v.r-v.d;return'<tr><td>'+m.split("-").reverse().join("/")+'</td><td style="color:#43d18c">'+fmtC(v.r)+'</td><td style="color:#f16a6e">'+fmtC(v.d)+'</td><td style="color:'+(l>=0?"#43d18c":"#f16a6e")+'">'+fmtC(l)+'</td></tr>'}).join('')+'</table></div>'+
  '<div style="text-align:right"><button class="btn btn-secondary" onclick="window.print()">Imprimir</button></div>';
  return html;
}

// ---- RECEITAS ----
function buildReceitas(){
  var pg=noPeriodo(St.ga("pg")), hospedes=St.ga("h");
  var total=pg.reduce(function(s,p){return s+(p.valor||0)},0);
  var porForma={};pg.forEach(function(p){porForma[p.forma]=(porForma[p.forma]||0)+(p.valor||0)});
  var html='<div class="report-container"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px"><h3 style="color:var(--text)">Receitas'+labelPeriodo()+'</h3><button class="btn btn-sm btn-secondary" onclick="exportarReceitasCSV()">Exportar CSV</button></div>'+
  '<div class="cards-row"><div class="stat-card"><h3>Total Recebido</h3><div class="value" style="color:#43d18c">'+fmtC(total)+'</div></div><div class="stat-card"><h3>Transacoes</h3><div class="value">'+pg.length+'</div></div></div>';
  if(Object.keys(porForma).length){html+='<h3 style="margin:16px 0 10px;color:var(--text)">Por Forma de Pagamento</h3><table><tr><th>Forma</th><th>Total</th><th>%</th></tr>'+
  Object.keys(porForma).map(function(f){var pc=total?Math.round(porForma[f]/total*100):0;return'<tr><td>'+esc(cap(f))+'</td><td>'+fmtC(porForma[f])+'</td><td>'+pc+'%</td></tr>'}).join('')+'</table>';}
  if(pg.length){html+='<h3 style="margin:16px 0 10px;color:var(--text)">Historico</h3><table><tr><th>Data</th><th>Hospede</th><th>Valor</th><th>Forma</th><th>Obs</th></tr>'+
  pg.slice().sort(function(a,b){return (b.data||"").localeCompare(a.data||"")}).slice(0,200).map(function(p){var h=hospedes.find(function(x){return x.id===p.hospedeId});return'<tr><td>'+fmtD(p.data)+'</td><td>'+(h?esc(h.nome):"-")+'</td><td>'+fmtC(p.valor)+'</td><td>'+esc(cap(p.forma||""))+'</td><td>'+esc(p.observacoes||"-")+'</td></tr>'}).join('')+'</table>';}
  else{html+='<p style="padding:20px;text-align:center;color:var(--text-mute)">Nenhuma receita no periodo.</p>';}
  html+='</div>';return html;
}

// ---- DESPESAS ----
function buildDespesas(){
  var ds=noPeriodo(St.ga("ds"));
  var total=ds.reduce(function(s,d){return s+(d.valor||0)},0);
  var porCat={};ds.forEach(function(d){var c=d.categoria||"Outros";porCat[c]=(porCat[c]||0)+(d.valor||0)});
  var html='<div class="report-container"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px"><h3 style="color:var(--text)">Despesas'+labelPeriodo()+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-primary" onclick="showNovaDespesa()">+ Nova Despesa</button><button class="btn btn-sm btn-secondary" onclick="exportarDespesasCSV()">Exportar CSV</button></div></div>'+
  '<div class="cards-row"><div class="stat-card"><h3>Total de Despesas</h3><div class="value" style="color:#f16a6e">'+fmtC(total)+'</div></div><div class="stat-card"><h3>Lancamentos</h3><div class="value">'+ds.length+'</div></div></div>';
  if(Object.keys(porCat).length){html+='<h3 style="margin:16px 0 10px;color:var(--text)">Por Categoria</h3><table><tr><th>Categoria</th><th>Total</th><th>%</th></tr>'+
  Object.keys(porCat).map(function(c){var pc=total?Math.round(porCat[c]/total*100):0;return'<tr><td>'+esc(c)+'</td><td>'+fmtC(porCat[c])+'</td><td>'+pc+'%</td></tr>'}).join('')+'</table>';}
  if(ds.length){html+='<h3 style="margin:16px 0 10px;color:var(--text)">Lancamentos</h3><table><tr><th>Data</th><th>Descricao</th><th>Categoria</th><th>Valor</th><th>Forma</th><th>Acoes</th></tr>'+
  ds.slice().sort(function(a,b){return (b.data||"").localeCompare(a.data||"")}).map(function(d){return'<tr><td>'+fmtD(d.data)+'</td><td>'+esc(d.descricao)+'</td><td>'+esc(d.categoria||"-")+'</td><td style="color:#f16a6e">'+fmtC(d.valor)+'</td><td>'+esc(cap(d.forma||"-"))+'</td><td><button class="btn btn-sm btn-danger" onclick="excluirDespesa(\''+d.id+'\')">Excluir</button></td></tr>'}).join('')+'</table>';}
  else{html+='<p style="padding:20px;text-align:center;color:var(--text-mute)">Nenhuma despesa no periodo. Clique em "+ Nova Despesa".</p>';}
  html+='</div>';return html;
}

export function showNovaDespesa(){
  sm("Nova Despesa",
  '<div class="form-grid">'+
  '<div class="form-group" style="grid-column:1/-1"><label>Descricao *</label><input type="text" id="dsDesc" placeholder="Ex: Conta de energia"></div>'+
  '<div class="form-group"><label>Valor (R$) *</label><input type="number" id="dsValor" step="0.01" min="0" placeholder="0,00"></div>'+
  '<div class="form-group"><label>Data</label><input type="date" id="dsData" value="'+td()+'"></div>'+
  '<div class="form-group"><label>Categoria</label><select id="dsCat">'+CATEGORIAS_DESPESA.map(function(c){return'<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join('')+'</select></div>'+
  '<div class="form-group"><label>Forma de Pagamento</label><select id="dsForma">'+FORMAS.map(function(f){return'<option value="'+f+'">'+cap(f)+'</option>'}).join('')+'</select></div>'+
  '<div class="form-group" style="grid-column:1/-1"><label>Observacoes</label><textarea id="dsObs" rows="2"></textarea></div>'+
  '</div>',
  '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarDespesa()">Salvar</button>');
}

export function salvarDespesa(){
  var desc=document.getElementById("dsDesc"),val=document.getElementById("dsValor"),dt=document.getElementById("dsData"),cat=document.getElementById("dsCat"),fm=document.getElementById("dsForma"),obs=document.getElementById("dsObs");
  if(!desc||!desc.value.trim())return st("Informe a descricao da despesa.","error"),false;
  var v=Math.round(parseFloat(val&&val.value?val.value:0)*100);
  if(!v||v<=0)return st("Informe um valor valido.","error"),false;
  St.in("ds",{descricao:desc.value.trim(),valor:v,data:(dt&&dt.value?dt.value:td()),categoria:(cat?cat.value:"Outros"),forma:(fm?fm.value:"dinheiro"),observacoes:(obs?obs.value.trim():"")});
  st("Despesa registrada!","success");cm();
  document.getElementById("financeiroContent").innerHTML=buildDespesas();
}

export function excluirDespesa(id){
  confirmar({titulo:"Excluir despesa?",msg:"Esta acao nao podera ser desfeita.",okLabel:"Sim, excluir",tipo:"danger"},function(){
    St.rm("ds",id);st("Despesa excluida.","warning");
    document.getElementById("financeiroContent").innerHTML=buildDespesas();
  });
}

// ---- Exportacao CSV ----
function baixarCSV(nome, linhas){
  var conteudo=linhas.map(function(l){return l.map(function(c){var s=String(c==null?"":c);return '"'+s.replace(/"/g,'""')+'"';}).join(";")}).join("\r\n");
  var blob=new Blob(["\ufeff"+conteudo],{type:"text/csv;charset=utf-8;"});
  var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=nome;document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},100);
  st("Arquivo exportado.","success");
}
function reais(c){return ((c||0)/100).toFixed(2).replace(".",",");}

export function exportarReceitasCSV(){
  var pg=noPeriodo(St.ga("pg")),hospedes=St.ga("h");
  var linhas=[["Data","Hospede","Valor","Forma","Observacoes"]];
  pg.slice().sort(function(a,b){return (a.data||"").localeCompare(b.data||"")}).forEach(function(p){var h=hospedes.find(function(x){return x.id===p.hospedeId});linhas.push([fmtD(p.data),h?h.nome:"",reais(p.valor),cap(p.forma||""),p.observacoes||""]);});
  baixarCSV("receitas.csv",linhas);
}
export function exportarDespesasCSV(){
  var ds=noPeriodo(St.ga("ds"));
  var linhas=[["Data","Descricao","Categoria","Valor","Forma","Observacoes"]];
  ds.slice().sort(function(a,b){return (a.data||"").localeCompare(b.data||"")}).forEach(function(d){linhas.push([fmtD(d.data),d.descricao,d.categoria||"",reais(d.valor),cap(d.forma||""),d.observacoes||""]);});
  baixarCSV("despesas.csv",linhas);
}
export function exportarResumoCSV(){
  var pg=noPeriodo(St.ga("pg")),ds=noPeriodo(St.ga("ds"));
  var receita=pg.reduce(function(s,p){return s+(p.valor||0)},0),despesa=ds.reduce(function(s,d){return s+(d.valor||0)},0);
  var linhas=[["Indicador","Valor (R$)"],["Receita",reais(receita)],["Despesa",reais(despesa)],["Lucro Liquido",reais(receita-despesa)],["Transacoes",pg.length],["Ticket Medio",reais(pg.length?Math.round(receita/pg.length):0)]];
  baixarCSV("resumo-financeiro.csv",linhas);
}

function cap(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1);}
