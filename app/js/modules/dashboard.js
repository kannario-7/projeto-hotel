// Módulo: Painel de Controle + Mapa de Quartos
import { esc, fmtC, fmtD, td } from "../utils.js";
import { St, getStatusBadge, getPlanoStatus } from "../store.js";
import { sm, closeModal } from "../ui.js";
import { getCurrentUser, getTurnoAtual } from "../auth.js";
import { navTo } from "../nav.js";

// Icones SVG animados dos alertas (substituem emojis). Cada um traz sua propria animacao via classe CSS.
var ALERT_ICONS = {
  // Bloqueio/vencido: circulo com barra, pulsando
  danger:'<svg class="aico aico-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="6.3" y1="6.3" x2="17.7" y2="17.7"/></svg>',
  // Relogio com ponteiro que gira
  clock:'<svg class="aico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line class="aico-hand" x1="12" y1="12" x2="12" y2="7"/><line class="aico-hand2" x1="12" y1="12" x2="15.5" y2="12"/></svg>',
  // Aviso: triangulo com balanco
  warning:'<svg class="aico aico-swing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  // Info: circulo com "i", pulsando suave
  info:'<svg class="aico aico-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  // Ferramenta (manutencao): chave que balanca
  tool:'<svg class="aico aico-swing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.8 2.8-2.2-.6-.6-2.2 2.9-2.8z"/></svg>',
  // Limpeza: vassoura que balanca
  clean:'<svg class="aico aico-swing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 4 9 14"/><path d="M11 6 5 20"/><path d="M5 20l-2-1 2-5 4 2z"/></svg>'
};
function aIco(tipo){ return '<span class="aico-wrap">'+(ALERT_ICONS[tipo]||"")+'</span>'; }

function avisoCadastroHTML(){
  var c = St.gc();
  var faltando = [];
  if(!c.hcnpj || !(""+c.hcnpj).trim()) faltando.push("documento (CNPJ/CPF)");
  if(!c.hend || !(""+c.hend).trim()) faltando.push("endereco");
  if(!c.hcidade || !(""+c.hcidade).trim()) faltando.push("cidade");
  if(!faltando.length) return "";
  return '<div class="alert alert-warning">'+aIco("warning")+'<span><b>Complete o cadastro do seu hotel.</b> Falta: '+esc(faltando.join(", "))+'. <a onclick="navTo(\'#cg\')" style="color:var(--accent-2);text-decoration:underline;cursor:pointer">Completar agora</a></span></div>';
}

function avisoPlanoHTML(){
  var p = getPlanoStatus();
  if(!p || p.dias_restantes==null) return "";
  var d = p.dias_restantes;
  if(d > 5) return ""; // so avisa a partir de 5 dias
  var wa='https://wa.me/5511922144143?text=Ola,%20quero%20renovar%20o%20plano%20do%20HospedaPrime';
  if(d < 0) return '<div class="alert alert-danger">'+aIco("danger")+'<span>Seu plano venceu. Renove para nao perder o acesso. <a href="'+wa+'" target="_blank" rel="noopener" style="color:var(--accent-2);text-decoration:underline">Renovar</a></span></div>';
  if(d === 0) return '<div class="alert alert-warning">'+aIco("clock")+'<span>Seu plano vence <b>hoje</b>. <a href="'+wa+'" target="_blank" rel="noopener" style="color:var(--accent-2);text-decoration:underline">Renovar agora</a></span></div>';
  return '<div class="alert alert-warning">'+aIco("clock")+'<span>Seu plano vence em <b>'+d+' dia'+(d===1?'':'s')+'</b>. <a href="'+wa+'" target="_blank" rel="noopener" style="color:var(--accent-2);text-decoration:underline">Renovar</a></span></div>';
}

export function renderDashboard(){var el=document.getElementById("pageContent");
var config=St.gc(),hoje=td(),mesAtual=hoje.slice(0,7),anoAtual=hoje.slice(0,4);
var u=getCurrentUser(),ta=getTurnoAtual(),infoTurno=u&&u.turno&&u.turno!==""?'<span style="font-size:12px;color:var(--text-mute);margin-left:8px">Turno: '+u.turno+' ('+ta+')</span>':'';
var reservas=St.ga("r"),quartos=St.ga("q"),hospedes=St.ga("h"),servicos=St.ga("sv"),tq=St.ga("tq"),pg=St.ga("pg");
var ativas=reservas.filter(function(r){return["confirmada","pendente","checkin"].includes(r.status)});
var pendentes=reservas.filter(function(r){return r.status==="pendente"});
var checkinsHoje=reservas.filter(function(r){return r.dataCheckin===hoje&&["confirmada","pendente","checkin"].includes(r.status)});
var checkoutsHoje=reservas.filter(function(r){return r.dataCheckout===hoje&&["checkin","confirmada"].includes(r.status)});
var ocupados=quartos.filter(function(q){return q.status==="ocupado"}).length;
var manutencao=quartos.filter(function(q){return q.status==="manutencao"}).length;
var limpeza=quartos.filter(function(q){return q.status==="limpeza"}).length;
var totalQuartos=quartos.filter(function(q){return q.ativo!==false}).length;
var ocPercent=totalQuartos?Math.round(ocupados/totalQuartos*100):0;
var faturamentoHoje=pg.filter(function(p){return p.data===hoje}).reduce(function(s,p){return s+(p.valor||0)},0);
var faturamentoMes=pg.filter(function(p){return p.data&&p.data.slice(0,7)===mesAtual}).reduce(function(s,p){return s+(p.valor||0)},0);
var faturamentoAno=pg.filter(function(p){return p.data&&p.data.slice(0,4)===anoAtual}).reduce(function(s,p){return s+(p.valor||0)},0);

// Hotel recem-criado (sem quartos e sem reservas): mostra guia de primeiros passos
if(quartos.length===0 && reservas.length===0 && hospedes.length===0){
  el.innerHTML='<div class="page-header"><div><h2>Bem-vindo ao HospedaPrime!</h2><p>Vamos preparar seu hotel em 3 passos rapidos'+infoTurno+'</p></div></div>'+
  '<div class="welcome-steps">'+
  '<div class="wstep"><div class="wstep-num">1</div><div class="wstep-body"><b>Cadastre os tipos de quarto</b><p>Standard, Suite, etc. com capacidade e diaria.</p><button class="btn btn-primary btn-sm" onclick="navTo(\'#cg\')">Ir para Configuracoes</button></div></div>'+
  '<div class="wstep"><div class="wstep-num">2</div><div class="wstep-body"><b>Cadastre seus quartos</b><p>Numero, andar e tipo de cada quarto do hotel.</p><button class="btn btn-primary btn-sm" onclick="navTo(\'#q\')">Ir para Quartos</button></div></div>'+
  '<div class="wstep"><div class="wstep-num">3</div><div class="wstep-body"><b>Crie sua primeira reserva</b><p>Com os quartos prontos, ja pode receber hospedes.</p><button class="btn btn-primary btn-sm" onclick="navTo(\'#r\')">Ir para Reservas</button></div></div>'+
  '</div>'+
  '<div class="alerts">'+avisoPlanoHTML()+'</div>';
  return;
}

el.innerHTML='<div class="page-header"><div><h2>Painel de Controle</h2><p>Visao geral do hotel'+infoTurno+'</p></div><div class="page-header-actions"><button class="btn btn-primary" onclick="navTo(\'#r\')">Nova Reserva</button><button class="btn btn-secondary" onclick="navTo(\'#ci\')">Check-in Rapido</button></div></div>'+
'<div class="cards-row">'+
'<div class="stat-card"><h3>Ocupacao</h3><div class="value">'+ocPercent+'%</div><div class="sub">'+ocupados+'/'+totalQuartos+' quartos</div></div>'+
'<div class="stat-card"><h3>Reservas Pendentes</h3><div class="value">'+pendentes.length+'</div></div>'+
'<div class="stat-card"><h3>Check-ins Hoje</h3><div class="value">'+checkinsHoje.length+'</div></div>'+
'<div class="stat-card"><h3>Check-outs Hoje</h3><div class="value">'+checkoutsHoje.length+'</div></div>'+
'<div class="stat-card"><h3>Receita Hoje</h3><div class="value">'+fmtC(faturamentoHoje)+'</div></div>'+
'<div class="stat-card"><h3>Receita do Mes</h3><div class="value">'+fmtC(faturamentoMes)+'</div></div>'+
'<div class="stat-card"><h3>Receita do Ano</h3><div class="value">'+fmtC(faturamentoAno)+'</div></div>'+
'</div>';

var alertas='<div class="alerts">';
alertas+=avisoPlanoHTML();
alertas+=avisoCadastroHTML();
if(checkoutsHoje.length>0)alertas+='<div class="alert alert-warning">'+aIco("warning")+'<span>'+checkoutsHoje.length+' hospede(s) precisam fazer check-out hoje.</span></div>';
if(pendentes.length>0)alertas+='<div class="alert alert-info">'+aIco("info")+'<span>'+pendentes.length+' reserva(s) pendente(s) aguardando confirmacao.</span></div>';
if(ocupados/totalQuartos>0.8)alertas+='<div class="alert alert-warning">'+aIco("warning")+'<span>Ocupacao acima de 80%! Considere verificar disponibilidade.</span></div>';
if(ocupados/totalQuartos<0.3)alertas+='<div class="alert alert-info">'+aIco("info")+'<span>Ocupacao abaixo de 30%. Considere promover o hotel.</span></div>';
if(manutencao>0)alertas+='<div class="alert alert-warning">'+aIco("tool")+'<span>'+manutencao+' quarto(s) em manutencao.</span></div>';
if(limpeza>0)alertas+='<div class="alert alert-info">'+aIco("clean")+'<span>'+limpeza+' quarto(s) aguardando limpeza.</span></div>';
alertas+='</div>';
el.innerHTML+=alertas;

el.innerHTML+=renderMapaQuartos(quartos,reservas,tq);

var prox=ativas.sort(function(a,b){return a.dataCheckin.localeCompare(b.dataCheckin)}).slice(0,5);
if(prox.length){el.innerHTML+='<h3 style="margin-bottom:12px;color:var(--text)">Proximas Reservas</h3><table><tr><th>Hospede</th><th>Quarto</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr>'+
prox.map(function(r){var h=St.fi("h",r.hospedeId),q=St.fi("q",r.quartoId);return'<tr><td>'+(h?esc(h.nome):"-")+'</td><td>'+(q?esc("Apto "+q.numero):"-")+'</td><td>'+fmtD(r.dataCheckin)+'</td><td>'+fmtD(r.dataCheckout)+'</td><td>'+getStatusBadge(r.status)+'</td></tr>'}).join('')+'</table>';}
}

export function reservaAtivaDoQuarto(quartoId,reservas){reservas=reservas||St.ga("r");
var pri={checkin:0,confirmada:1,pendente:2};
var cands=reservas.filter(function(r){return r.quartoId===quartoId&&["checkin","confirmada","pendente"].indexOf(r.status)>=0});
cands.sort(function(a,b){return (pri[a.status]-pri[b.status])||a.dataCheckin.localeCompare(b.dataCheckin)});
return cands[0]||null}

export function renderMapaQuartos(quartos,reservas,tq){quartos=quartos||St.ga("q");reservas=reservas||St.ga("r");tq=tq||St.ga("tq");
var ativos=quartos.filter(function(q){return q.ativo!==false}).sort(function(a,b){return (""+a.numero).localeCompare(""+b.numero)});
if(!ativos.length)return"";
var h='<div class="mapa-head"><h3>Mapa de Quartos</h3><div class="mapa-legenda">'+
'<span class="lg"><i class="dot dot-disponivel"></i>Disponivel</span>'+
'<span class="lg"><i class="dot dot-ocupado"></i>Ocupado</span>'+
'<span class="lg"><i class="dot dot-reservado"></i>Reservado</span>'+
'<span class="lg"><i class="dot dot-limpeza"></i>Limpeza</span>'+
'<span class="lg"><i class="dot dot-manutencao"></i>Manutencao</span>'+
'</div></div>';
h+='<div class="mapa-grid">';
h+=ativos.map(function(q){
var t=tq.filter(function(x){return x.id===q.tipoQuartoId})[0];
var stt=q.status||"disponivel";
var r=(stt==="ocupado"||stt==="reservado")?reservaAtivaDoQuarto(q.id,reservas):null;
var hosp=r?St.fi("h",r.hospedeId):null;
var nome=hosp?hosp.nome:"";
var iniciais=nome?nome.trim().split(/\s+/).slice(0,2).map(function(p){return p[0]}).join("").toUpperCase():"";
var label=stt==="disponivel"?"Livre":stt==="ocupado"?"Ocupado":stt==="reservado"?"Reservado":stt==="limpeza"?"Limpeza":"Manutencao";
return '<div class="qcard qcard-'+stt+'" onclick="detalheQuarto(\''+q.id+'\')" title="Apto '+esc(q.numero)+'">'+
'<div class="qcard-top"><span class="qcard-num">'+esc(q.numero)+'</span><span class="qcard-st">'+label+'</span></div>'+
'<div class="qcard-tipo">'+esc(t?t.nome:"Quarto")+'</div>'+
(nome?'<div class="qcard-hosp"><span class="qcard-avatar">'+esc(iniciais)+'</span><span class="qcard-nome">'+esc(nome)+'</span></div>':'<div class="qcard-vazio">Sem hospede</div>')+
'</div>'}).join('');
h+='</div>';
return '<div class="mapa-wrap">'+h+'</div>'}

export function detalheQuarto(id){var q=St.fi("q",id);if(!q)return;var tq=St.ga("tq");var t=tq.filter(function(x){return x.id===q.tipoQuartoId})[0];
var r=reservaAtivaDoQuarto(q.id);var hosp=r?St.fi("h",r.hospedeId):null;
var stt=q.status||"disponivel";
var label=stt==="disponivel"?"Disponivel":stt==="ocupado"?"Ocupado":stt==="reservado"?"Reservado":stt==="limpeza"?"Em limpeza":"Em manutencao";
var body='<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">'+
'<div class="qmodal-num">'+esc(q.numero)+'</div>'+
'<div><div style="font-family:Sora,sans-serif;font-weight:700;color:var(--text);font-size:18px">Apto '+esc(q.numero)+'</div>'+
'<div style="color:var(--text-mute);font-size:13px">'+esc(t?t.nome:"Quarto")+' &middot; '+(q.andar?("Andar "+q.andar):"")+'</div></div></div>';
body+='<p style="margin-bottom:14px"><span class="badge badge-'+(stt==="disponivel"?"success":stt==="ocupado"?"info":stt==="manutencao"?"danger":"warning")+'">'+label+'</span></p>';
if(hosp){body+='<div class="qmodal-info"><div class="qmodal-row"><span>Hospede</span><b>'+esc(hosp.nome)+'</b></div>'+
(hosp.documento?'<div class="qmodal-row"><span>Documento</span><b>'+esc(hosp.documento)+'</b></div>':'')+
(hosp.telefone?'<div class="qmodal-row"><span>Telefone</span><b>'+esc(hosp.telefone)+'</b></div>':'')+
(r?'<div class="qmodal-row"><span>Check-in</span><b>'+fmtD(r.dataCheckin)+'</b></div><div class="qmodal-row"><span>Check-out</span><b>'+fmtD(r.dataCheckout)+'</b></div>':'')+
(r&&r.total?'<div class="qmodal-row"><span>Total</span><b>'+fmtC(r.total)+'</b></div>':'')+
'</div>'}else{body+='<p style="color:var(--text-mute);font-size:14px">Este quarto nao possui hospede no momento.</p>'}
var footer='<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>';
if(r&&r.status==="confirmada")footer+='<button class="btn btn-success" onclick="closeModal();navTo(\'#ci\')">Ir para Check-in</button>';
if(r&&r.status==="checkin")footer+='<button class="btn btn-primary" onclick="closeModal();navTo(\'#co\')">Ir para Check-out</button>';
sm("Detalhes do Quarto",body,footer)}
