// Módulo: Financeiro completo (Resumo/DRE, Receitas, Despesas, Caixa, exportacao)
import { esc, fmtC, fmtD, td } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";

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
'<div class="tab" onclick="mudarFinTab(this,\'contas\')">Contas a Pagar/Receber</div>'+
'<div class="tab" onclick="mudarFinTab(this,\'caixa\')">Caixa</div>'+
'</div><div id="financeiroContent">'+buildResumo()+'</div>';}

var abaAtual = "resumo";
function renderAbaFin(aba){
  if(aba==="resumo")return buildResumo();
  if(aba==="receitas")return buildReceitas();
  if(aba==="despesas")return buildDespesas();
  if(aba==="contas")return buildContas();
  if(aba==="caixa")return buildCaixa();
  return buildResumo();
}
export function mudarFinTab(tab,aba){tab.parentElement.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active")});tab.classList.add("active");abaAtual=aba;
document.getElementById("financeiroContent").innerHTML = renderAbaFin(aba);}

export function filtrarFinanceiro(){var fi=document.getElementById("filtroFi"),ff=document.getElementById("filtroFf");
periodo.fi=fi?fi.value:"";periodo.ff=ff?ff.value:"";
document.getElementById("financeiroContent").innerHTML = renderAbaFin(abaAtual);}
export function limparFiltroFinanceiro(){periodo.fi="";periodo.ff="";var a=document.getElementById("filtroFi"),b=document.getElementById("filtroFf");if(a)a.value="";if(b)b.value="";filtrarFinanceiro();}

// aplica o filtro de periodo a uma lista com campo .data
function noPeriodo(lista){return lista.filter(function(x){
  if(periodo.fi && x.data < periodo.fi) return false;
  if(periodo.ff && x.data > periodo.ff) return false;
  return true;
});}

function labelPeriodo(){if(periodo.fi||periodo.ff)return' &middot; '+(periodo.fi?fmtD(periodo.fi):"inicio")+' a '+(periodo.ff?fmtD(periodo.ff):"hoje");return' &middot; todo o periodo';}

// ---- RESUMO / DRE ----
// despesas efetivadas (pagas) - contas a pagar em aberto nao entram no resultado realizado
function despesasPagas(){return St.ga("ds").filter(function(d){return d.pago!==false;});}

function buildResumo(){
  var pg=noPeriodo(St.ga("pg")), ds=noPeriodo(despesasPagas()), reservas=St.ga("r");
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
  var pg=St.ga("pg"), ds=despesasPagas();
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
  var ds=noPeriodo(despesasPagas());
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

// ---- CONTAS A PAGAR / A RECEBER ----
function buildContas(){
  var hoje=td();
  // A PAGAR: despesas marcadas como nao pagas (pago===false), com vencimento
  var aPagar=St.ga("ds").filter(function(d){return d.pago===false;});
  aPagar.sort(function(a,b){return (a.vencimento||"9999").localeCompare(b.vencimento||"9999")});
  var totalPagar=aPagar.reduce(function(s,d){return s+(d.valor||0)},0);
  var vencidas=aPagar.filter(function(d){return d.vencimento&&d.vencimento<hoje});
  // A RECEBER: reservas confirmada/checkin com saldo (total - pago)
  var aReceber=[];
  St.ga("r").filter(function(r){return ["confirmada","checkin"].indexOf(r.status)>=0}).forEach(function(r){
    var pago=St.ga("pg").filter(function(p){return p.reservaId===r.id}).reduce(function(s,p){return s+(p.valor||0)},0);
    var saldo=(r.total||0)-pago;
    if(saldo>0){var h=St.fi("h",r.hospedeId);aReceber.push({nome:h?h.nome:"-",checkin:r.dataCheckin,checkout:r.dataCheckout,saldo:saldo});}
  });
  var totalReceber=aReceber.reduce(function(s,x){return s+x.saldo},0);

  var html='<div class="report-container"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px"><h3 style="color:var(--text)">Contas a Pagar e a Receber</h3><button class="btn btn-sm btn-primary" onclick="showNovaContaPagar()">+ Conta a Pagar</button></div>'+
  '<div class="cards-row">'+
  '<div class="stat-card"><h3>A Pagar</h3><div class="value" style="color:#f16a6e">'+fmtC(totalPagar)+'</div><div class="sub">'+aPagar.length+' conta(s)'+(vencidas.length?(" &middot; "+vencidas.length+" vencida(s)"):"")+'</div></div>'+
  '<div class="stat-card"><h3>A Receber</h3><div class="value" style="color:#f0a83c">'+fmtC(totalReceber)+'</div><div class="sub">'+aReceber.length+' reserva(s) em aberto</div></div>'+
  '<div class="stat-card"><h3>Saldo Projetado</h3><div class="value" style="color:'+((totalReceber-totalPagar)>=0?"#43d18c":"#f16a6e")+'">'+fmtC(totalReceber-totalPagar)+'</div></div>'+
  '</div>';
  // A PAGAR
  html+='<h3 style="margin:18px 0 10px;color:var(--text)">Contas a Pagar</h3>';
  if(aPagar.length){html+='<table><tr><th>Vencimento</th><th>Descricao</th><th>Categoria</th><th>Valor</th><th>Situacao</th><th>Acao</th></tr>'+
  aPagar.map(function(d){
    var venc=d.vencimento||"";var situacao,cor;
    if(!venc){situacao="Sem data";cor="var(--text-mute)";}
    else if(venc<hoje){situacao="Vencida";cor="#f16a6e";}
    else{var dias=Math.round((new Date(venc)-new Date(hoje))/86400000);situacao=dias===0?"Vence hoje":("Vence em "+dias+"d");cor=dias<=3?"#f0a83c":"var(--text-dim)";}
    return'<tr><td>'+(venc?fmtD(venc):"-")+'</td><td>'+esc(d.descricao)+'</td><td>'+esc(d.categoria||"-")+'</td><td style="color:#f16a6e">'+fmtC(d.valor)+'</td><td style="color:'+cor+'">'+situacao+'</td><td><button class="btn btn-sm btn-success" onclick="marcarPagoDespesa(\''+d.id+'\')">Marcar Pago</button></td></tr>';
  }).join('')+'</table>';}
  else{html+='<p style="color:var(--text-mute);padding:10px 0">Nenhuma conta a pagar em aberto. Use "+ Conta a Pagar" para lancar.</p>';}
  // A RECEBER
  html+='<h3 style="margin:18px 0 10px;color:var(--text)">Contas a Receber (reservas em aberto)</h3>';
  if(aReceber.length){html+='<table><tr><th>Hospede</th><th>Check-in</th><th>Check-out</th><th>Saldo a Receber</th></tr>'+
  aReceber.sort(function(a,b){return (a.checkin||"").localeCompare(b.checkin||"")}).map(function(x){return'<tr><td>'+esc(x.nome)+'</td><td>'+fmtD(x.checkin)+'</td><td>'+fmtD(x.checkout)+'</td><td style="color:#f0a83c">'+fmtC(x.saldo)+'</td></tr>'}).join('')+'</table>';}
  else{html+='<p style="color:var(--text-mute);padding:10px 0">Nenhuma reserva com saldo em aberto.</p>';}
  html+='</div>';
  return html;
}

export function showNovaContaPagar(){
  sm("Nova Conta a Pagar",
  '<div class="form-grid">'+
  '<div class="form-group" style="grid-column:1/-1"><label>Descricao *</label><input type="text" id="cpDesc" placeholder="Ex: Fornecedor de enxoval"></div>'+
  '<div class="form-group"><label>Valor (R$) *</label><input type="number" id="cpValor" step="0.01" min="0"></div>'+
  '<div class="form-group"><label>Vencimento *</label><input type="date" id="cpVenc" value="'+td()+'"></div>'+
  '<div class="form-group"><label>Categoria</label><select id="cpCat">'+CATEGORIAS_DESPESA.map(function(c){return'<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join('')+'</select></div>'+
  '<div class="form-group"><label>Forma prevista</label><select id="cpForma">'+FORMAS.map(function(f){return'<option value="'+f+'">'+cap(f)+'</option>'}).join('')+'</select></div>'+
  '</div>',
  '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarContaPagar()">Salvar</button>');
}
export function salvarContaPagar(){
  var desc=document.getElementById("cpDesc"),val=document.getElementById("cpValor"),venc=document.getElementById("cpVenc"),cat=document.getElementById("cpCat"),fm=document.getElementById("cpForma");
  if(!desc||!desc.value.trim())return st("Informe a descricao.","error"),false;
  var v=Math.round(parseFloat(val&&val.value?val.value:0)*100);
  if(!v||v<=0)return st("Informe um valor valido.","error"),false;
  // conta a pagar = despesa nao paga, com vencimento. data fica igual ao vencimento ate ser paga
  St.in("ds",{descricao:desc.value.trim(),valor:v,data:(venc&&venc.value?venc.value:td()),vencimento:(venc&&venc.value?venc.value:td()),categoria:(cat?cat.value:"Outros"),forma:(fm?fm.value:"boleto"),pago:false,observacoes:""});
  st("Conta a pagar cadastrada!","success");cm();
  document.getElementById("financeiroContent").innerHTML=buildContas();
}
export function marcarPagoDespesa(id){
  St.up("ds",id,{pago:true,pagoEm:td(),data:td()});
  st("Conta marcada como paga!","success");
  document.getElementById("financeiroContent").innerHTML=buildContas();
}

// ---- CAIXA (abertura/fechamento por turno) ----
function caixaAberto(){return St.ga("sc").filter(function(s){return s.status==="aberto"}).sort(function(a,b){return (b.abertoEm||"").localeCompare(a.abertoEm||"")})[0]||null;}
function fmtDataHora(iso){if(!iso)return"-";var d=new Date(iso);var p=function(n){return String(n).padStart(2,"0")};return p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear()+" "+p(d.getHours())+":"+p(d.getMinutes());}

// soma dos pagamentos desde a abertura do caixa (o que o sistema registrou no turno)
function pagamentosDoTurno(sessao){
  if(!sessao)return [];
  var ini=sessao.abertoEm||"";
  return St.ga("pg").filter(function(p){
    // pagamento tem data (dia); usamos criado a partir da data >= dia da abertura
    var dia=(ini||"").slice(0,10);
    return p.data && dia && p.data>=dia;
  });
}

function buildCaixa(){
  var aberto=caixaAberto();
  var html='<div class="report-container"><h3 style="margin-bottom:14px;color:var(--text)">Caixa por Turno</h3>';
  if(aberto){
    var pgT=pagamentosDoTurno(aberto);
    var totalSistema=pgT.reduce(function(s,p){return s+(p.valor||0)},0);
    var porForma={};pgT.forEach(function(p){porForma[p.forma]=(porForma[p.forma]||0)+(p.valor||0)});
    html+='<div class="alert alert-info" style="margin-bottom:14px"><span class="aico-wrap">i</span><span>Caixa <b>ABERTO</b> por '+esc(aberto.usuarioAbertura||"-")+' em '+fmtDataHora(aberto.abertoEm)+'. Fundo de troco: '+fmtC(aberto.valorAbertura)+'.</span></div>'+
    '<div class="cards-row"><div class="stat-card"><h3>Registrado no Sistema</h3><div class="value">'+fmtC(totalSistema)+'</div><div class="sub">'+pgT.length+' pagamento(s) no turno</div></div>'+
    '<div class="stat-card"><h3>Fundo de Troco</h3><div class="value">'+fmtC(aberto.valorAbertura)+'</div></div>'+
    '<div class="stat-card"><h3>Esperado em Caixa</h3><div class="value">'+fmtC(aberto.valorAbertura+totalSistema)+'</div></div></div>';
    if(Object.keys(porForma).length){html+='<h4 style="margin:12px 0 8px;color:var(--text)">Recebido por forma (sistema)</h4><table><tr><th>Forma</th><th>Total</th></tr>'+Object.keys(porForma).map(function(f){return'<tr><td>'+esc(cap(f))+'</td><td>'+fmtC(porForma[f])+'</td></tr>'}).join('')+'</table>';}
    html+='<div style="margin-top:14px"><button class="btn btn-danger" onclick="showFecharCaixa()">Fechar Caixa (conferencia)</button></div>';
  } else {
    html+='<p style="color:var(--text-mute);margin-bottom:14px">Nenhum caixa aberto no momento. Abra o caixa para iniciar um turno.</p><button class="btn btn-primary" onclick="showAbrirCaixa()">Abrir Caixa</button>';
  }
  // historico de fechamentos
  var fechados=St.ga("sc").filter(function(s){return s.status==="fechado"}).sort(function(a,b){return (b.fechadoEm||"").localeCompare(a.fechadoEm||"")}).slice(0,30);
  if(fechados.length){html+='<h3 style="margin:22px 0 10px;color:var(--text)">Historico de Fechamentos</h3><table><tr><th>Abertura</th><th>Fechamento</th><th>Operador</th><th>Sistema</th><th>Contado</th><th>Diferenca</th></tr>'+
  fechados.map(function(s){var contado=(s.contadoDinheiro||0)+(s.contadoCartao||0)+(s.contadoPix||0)+(s.contadoOutros||0);var difCor=s.diferenca===0?"#43d18c":(s.diferenca>0?"#f0a83c":"#f16a6e");var difTxt=s.diferenca===0?"OK":(s.diferenca>0?("Sobra "+fmtC(s.diferenca)):("Falta "+fmtC(-s.diferenca)));return'<tr><td>'+fmtDataHora(s.abertoEm)+'</td><td>'+fmtDataHora(s.fechadoEm)+'</td><td>'+esc(s.usuarioFechamento||s.usuarioAbertura||"-")+'</td><td>'+fmtC(s.valorSistema)+'</td><td>'+fmtC(contado)+'</td><td style="color:'+difCor+'">'+difTxt+'</td></tr>'}).join('')+'</table>';}
  html+='</div>';
  return html;
}

export function showAbrirCaixa(){
  sm("Abrir Caixa",
  '<div class="form-group"><label>Fundo de troco inicial (R$)</label><input type="number" id="cxAbertura" step="0.01" min="0" value="0" placeholder="0,00"></div>'+
  '<p style="color:var(--text-mute);font-size:12px">Valor em dinheiro que ja esta na gaveta no inicio do turno.</p>',
  '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="abrirCaixa()">Abrir</button>');
}
export function abrirCaixa(){
  if(caixaAberto())return st("Ja existe um caixa aberto. Feche-o antes de abrir outro.","warning");
  var v=document.getElementById("cxAbertura");
  var fundo=Math.round(parseFloat(v&&v.value?v.value:0)*100);
  var u=getCurrentUser();
  St.in("sc",{usuarioAbertura:(u?u.nome:"-"),abertoEm:new Date().toISOString(),valorAbertura:fundo,status:"aberto"});
  st("Caixa aberto!","success");cm();
  document.getElementById("financeiroContent").innerHTML=buildCaixa();
}

export function showFecharCaixa(){
  var aberto=caixaAberto();if(!aberto)return st("Nenhum caixa aberto.","error");
  var pgT=pagamentosDoTurno(aberto);var totalSistema=pgT.reduce(function(s,p){return s+(p.valor||0)},0);
  sm("Fechar Caixa - Conferencia",
  '<p style="color:var(--text-dim);font-size:13px;margin-bottom:12px">Conte os valores fisicos e informe abaixo. O sistema registrou <b>'+fmtC(totalSistema)+'</b> neste turno (+ fundo de '+fmtC(aberto.valorAbertura)+').</p>'+
  '<div class="form-grid">'+
  '<div class="form-group"><label>Dinheiro contado (R$)</label><input type="number" id="cxDin" step="0.01" min="0" value="0"></div>'+
  '<div class="form-group"><label>Cartao (R$)</label><input type="number" id="cxCard" step="0.01" min="0" value="0"></div>'+
  '<div class="form-group"><label>PIX (R$)</label><input type="number" id="cxPix" step="0.01" min="0" value="0"></div>'+
  '<div class="form-group"><label>Outros (R$)</label><input type="number" id="cxOut" step="0.01" min="0" value="0"></div>'+
  '<div class="form-group" style="grid-column:1/-1"><label>Observacoes</label><textarea id="cxObs" rows="2"></textarea></div>'+
  '</div>',
  '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-danger" onclick="fecharCaixa()">Fechar e conferir</button>');
}
export function fecharCaixa(){
  var aberto=caixaAberto();if(!aberto)return st("Nenhum caixa aberto.","error");
  var g=function(id){var e=document.getElementById(id);return Math.round(parseFloat(e&&e.value?e.value:0)*100)};
  var din=g("cxDin"),card=g("cxCard"),pix=g("cxPix"),out=g("cxOut");
  var contadoTotal=din+card+pix+out;
  var pgT=pagamentosDoTurno(aberto);var totalSistema=pgT.reduce(function(s,p){return s+(p.valor||0)},0);
  // diferenca: o que sobrou fisicamente (contado - fundo) menos o que o sistema esperava
  var diferenca=(contadoTotal-aberto.valorAbertura)-totalSistema;
  var u=getCurrentUser();
  var obs=document.getElementById("cxObs");
  St.up("sc",aberto.id,{usuarioFechamento:(u?u.nome:"-"),fechadoEm:new Date().toISOString(),contadoDinheiro:din,contadoCartao:card,contadoPix:pix,contadoOutros:out,valorSistema:totalSistema,diferenca:diferenca,observacoes:(obs?obs.value.trim():""),status:"fechado"});
  var msg=diferenca===0?"Caixa fechado. Valores conferem!":(diferenca>0?("Caixa fechado. SOBRA de "+fmtC(diferenca)):("Caixa fechado. FALTA de "+fmtC(-diferenca)));
  st(msg, diferenca===0?"success":"warning");cm();
  document.getElementById("financeiroContent").innerHTML=buildCaixa();
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
  var ds=noPeriodo(despesasPagas());
  var linhas=[["Data","Descricao","Categoria","Valor","Forma","Observacoes"]];
  ds.slice().sort(function(a,b){return (a.data||"").localeCompare(b.data||"")}).forEach(function(d){linhas.push([fmtD(d.data),d.descricao,d.categoria||"",reais(d.valor),cap(d.forma||""),d.observacoes||""]);});
  baixarCSV("despesas.csv",linhas);
}
export function exportarResumoCSV(){
  var pg=noPeriodo(St.ga("pg")),ds=noPeriodo(despesasPagas());
  var receita=pg.reduce(function(s,p){return s+(p.valor||0)},0),despesa=ds.reduce(function(s,d){return s+(d.valor||0)},0);
  var linhas=[["Indicador","Valor (R$)"],["Receita",reais(receita)],["Despesa",reais(despesa)],["Lucro Liquido",reais(receita-despesa)],["Transacoes",pg.length],["Ticket Medio",reais(pg.length?Math.round(receita/pg.length):0)]];
  baixarCSV("resumo-financeiro.csv",linhas);
}

function cap(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1);}
