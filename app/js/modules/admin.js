// Módulo: Painel do Dono (super-admin) — gerencia TODOS os hotéis e mensalidades
import { esc, fmtC, fmtD } from "../utils.js";
import { supabase } from "../supabase.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";
import { suporteConversas, suporteEnviar, suporteMarcarLidas, avaliacoesSuporte, suporteStatusTodos, suporteDefinirStatus } from "../db.js";

var cacheHoteis = [];
var PLANOS = { trial:"Teste Gratis", essencial:"Essencial", profissional:"Profissional" };
var PRECOS = { trial:0, essencial:9900, profissional:19900 }; // centavos
function planoLabel(p){ return PLANOS[p]||p||"Teste Gratis"; }

export async function renderAdmin(){
  var el=document.getElementById("pageContent");
  var u=getCurrentUser();
  if(!u||!u.isOwner){ el.innerHTML='<div class="page-header"><div><h2>Acesso restrito</h2><p>Area exclusiva do administrador do sistema.</p></div></div>'; return; }
  el.innerHTML='<div class="page-header"><div><h2>Painel do Dono</h2><p>Hoteis e mensalidades do HospedaPrime</p></div><div class="page-header-actions"><button class="btn btn-primary" onclick="abrirSuporteDono()">Mensagens de Suporte <span id="supBadge" style="display:none;background:#f16a6e;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px"></span></button></div></div><div id="adminContent"><p style="color:var(--text-mute)">Carregando...</p></div>';
  atualizarBadgeSuporte();
  iniciarPollBadge();
  var c=document.getElementById("adminContent");
  var { data, error } = await supabase.rpc("listar_hoteis_admin");
  if(error){ c.innerHTML='<p style="color:#f16a6e">Erro ao carregar: '+esc(error.message)+'</p>'; return; }
  cacheHoteis = data||[];
  var hoteis=cacheHoteis;
  // resumo financeiro do SaaS
  var resumo={recebido_mes:0,a_receber:0,qtd_atraso:0};
  var rr = await supabase.rpc("resumo_saas");
  if(rr.data && rr.data[0]) resumo = rr.data[0];
  var total=hoteis.length, ativos=hoteis.filter(function(h){return h.status==="ativo"}).length;
  var hoje=new Date().toISOString().slice(0,10);
  function vencido(h){ return h.plano_expira && h.plano_expira < hoje && h.plano!=="trial"; }

  var html='<div class="cards-row">'+
    '<div class="stat-card"><h3>Hoteis</h3><div class="value">'+total+'</div><div class="sub">'+ativos+' ativos</div></div>'+
    '<div class="stat-card"><h3>Recebido no mes</h3><div class="value">'+fmtC(resumo.recebido_mes)+'</div></div>'+
    '<div class="stat-card"><h3>A receber</h3><div class="value">'+fmtC(resumo.a_receber)+'</div></div>'+
    '<div class="stat-card"><h3>Em atraso</h3><div class="value">'+resumo.qtd_atraso+'</div></div>'+
    '</div>';

  if(!hoteis.length){ html+='<p style="color:var(--text-mute)">Nenhum hotel cadastrado ainda.</p>'; }
  else{
    html+='<table><tr><th>Hotel</th><th>Plano</th><th>Expira</th><th>Usuarios</th><th>Status</th><th>Acoes</th></tr>'+
    hoteis.map(function(h){
      var badge=h.status==="ativo"?'<span class="badge badge-success">Ativo</span>':'<span class="badge badge-danger">Suspenso</span>';
      var exp = h.plano_expira?fmtD(h.plano_expira):"-";
      if(vencido(h)) exp='<span style="color:#f16a6e;font-weight:700">'+fmtD(h.plano_expira)+' ⚠</span>';
      return '<tr><td>'+esc(h.nome)+'</td><td>'+esc(planoLabel(h.plano))+'</td><td>'+exp+'</td><td>'+h.qtd_usuarios+'</td><td>'+badge+'</td>'+
      '<td><button class="btn btn-sm btn-primary" onclick="adminGerenciar(\''+h.id+'\')">Gerenciar</button></td></tr>';
    }).join('')+'</table>';
  }
  c.innerHTML=html;
}

// ---- SUPORTE (dono ve e responde conversas de todos os hoteis) ----
function nomeHotel(hid){var h=cacheHoteis.find(function(x){return x.id===hid});return h?h.nome:"Hotel";}

// Atualiza o contador de nao-lidas a cada 15s enquanto o Painel do Dono estiver aberto
var _badgePoll=null;
function iniciarPollBadge(){
  if(_badgePoll)clearInterval(_badgePoll);
  _badgePoll=setInterval(function(){
    if(document.hidden)return;
    if(!document.getElementById("supBadge")){clearInterval(_badgePoll);_badgePoll=null;return;}
    atualizarBadgeSuporte();
  },15000);
}

export async function atualizarBadgeSuporte(){
  try{
    var msgs=await suporteConversas();
    var naoLidas=msgs.filter(function(m){return m.autor==="cliente" && !m.lida});
    var b=document.getElementById("supBadge");
    if(b){ if(naoLidas.length){ b.style.display="inline-block"; b.textContent=naoLidas.length; } else b.style.display="none"; }
  }catch(e){}
}

var _supFiltro="todos";   // filtro da lista de conversas: todos|abertos|finalizados
var _supStatusCache={};   // mapa hotel_id -> status

export async function abrirSuporteDono(){
  pararPollDono();
  sm("Mensagens de Suporte",'<p style="color:var(--text-mute)">Carregando conversas...</p>','<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>');
  var msgs=await suporteConversas();
  try{ _supStatusCache=await suporteStatusTodos(); }catch(e){ _supStatusCache={}; }
  // agrupa por hotel
  var porHotel={};
  msgs.forEach(function(m){ (porHotel[m.hotel_id]=porHotel[m.hotel_id]||[]).push(m); });
  _supPorHotel=porHotel;
  if(!Object.keys(porHotel).length){ document.getElementById("modalBody").innerHTML='<p style="color:var(--text-mute);padding:12px 0">Nenhuma mensagem de suporte ainda.</p>'; return; }
  pintarListaSuporte();
}

var _supPorHotel={};

// Status efetivo do hotel: finalizado (se marcado) senao aberto/respondido conforme ultima mensagem
function statusHotel(hid,conv){
  var s=_supStatusCache[hid];
  if(s && s.status==="finalizado") return "finalizado";
  var ult=conv[conv.length-1];
  return (ult && ult.autor==="suporte") ? "respondido" : "aberto";
}
function badgeStatus(st){
  if(st==="finalizado") return '<span style="flex:none;background:var(--surface-3);color:var(--text-mute);border:1px solid var(--border);border-radius:20px;padding:1px 9px;font-size:11px">Finalizado</span>';
  if(st==="respondido") return '<span style="flex:none;background:rgba(48,164,108,.18);color:#43d18c;border-radius:20px;padding:1px 9px;font-size:11px">Respondido</span>';
  return '<span style="flex:none;background:rgba(241,106,110,.18);color:#f16a6e;border-radius:20px;padding:1px 9px;font-size:11px">Aberto</span>';
}
export function filtrarSuporte(f){ _supFiltro=f; pintarListaSuporte(); }

function pintarListaSuporte(){
  var porHotel=_supPorHotel;
  var ids=Object.keys(porHotel);
  ids.forEach(function(hid){ porHotel[hid].sort(function(a,b){return (a.criado_em||"").localeCompare(b.criado_em||"")}); });
  // filtro
  var visiveis=ids.filter(function(hid){
    var s=statusHotel(hid,porHotel[hid]);
    if(_supFiltro==="abertos") return s!=="finalizado";
    if(_supFiltro==="finalizados") return s==="finalizado";
    return true;
  });
  // ordena por mensagem mais recente
  visiveis.sort(function(a,b){var ua=porHotel[a][porHotel[a].length-1].criado_em,ub=porHotel[b][porHotel[b].length-1].criado_em;return (ub||"").localeCompare(ua||"");});
  var abertos=ids.filter(function(hid){return statusHotel(hid,porHotel[hid])!=="finalizado"}).length;
  var chip=function(f,txt){return '<button class="sup-chip'+(_supFiltro===f?" on":"")+'" onclick="filtrarSuporte(\''+f+'\')">'+txt+'</button>';};
  var filtros='<div class="sup-filtros">'+chip("todos","Todos ("+ids.length+")")+chip("abertos","Abertos ("+abertos+")")+chip("finalizados","Finalizados")+'</div>';
  var lista=visiveis.map(function(hid){
    var conv=porHotel[hid];
    var ult=conv[conv.length-1];
    var naoLidas=conv.filter(function(m){return m.autor==="cliente"&&!m.lida}).length;
    var nome=nomeHotel(hid);
    var ini=(nome||"H").trim().split(/\s+/).map(function(p){return p[0]}).slice(0,2).join("").toUpperCase();
    var prev=(ult.autor==="suporte"?"Voce: ":"")+ult.texto;
    var st=statusHotel(hid,conv);
    return '<div onclick="abrirConversaHotel(\''+hid+'\')" style="cursor:pointer;display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--surface-2);transition:border-color .15s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'+
      '<div style="flex:none;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">'+esc(ini)+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="color:var(--text)">'+esc(nome)+'</b><div style="display:flex;gap:6px;align-items:center">'+(naoLidas?'<span style="flex:none;background:#f16a6e;color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700">'+naoLidas+'</span>':'')+badgeStatus(st)+'</div></div>'+
        '<div style="color:'+(naoLidas?"var(--text)":"var(--text-mute)")+';font-size:12px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(prev)+'</div>'+
      '</div></div>';
  }).join('');
  if(!visiveis.length) lista='<p style="color:var(--text-mute);padding:16px 0;text-align:center">Nenhuma conversa neste filtro.</p>';
  document.getElementById("modalBody").innerHTML=filtros+'<div style="display:flex;flex-direction:column;gap:8px">'+lista+'</div>';
}

var _donoPoll=null;      // timer de atualizacao da conversa aberta no painel do dono
var _donoHid=null;       // hotel da conversa aberta
var _donoUltCount=-1;    // qtd de mensagens ja renderizadas

function pararPollDono(){ if(_donoPoll){clearInterval(_donoPoll);_donoPoll=null;} _donoHid=null; }

// Renderiza a conversa dentro de #donoConversa (re-render so quando muda a quantidade)
async function pintarConversaDono(hid,forcar){
  var caixa=document.getElementById("donoConversa");
  if(!caixa){pararPollDono();return;}
  var msgs=await suporteConversas();
  var conv=msgs.filter(function(m){return m.hotel_id===hid});
  if(!forcar && conv.length===_donoUltCount)return;
  var novas=conv.length>_donoUltCount && _donoUltCount>=0;
  _donoUltCount=conv.length;
  var noFim=caixa.scrollHeight-caixa.scrollTop-caixa.clientHeight<40;
  caixa.innerHTML=window.renderConversa?window.renderConversa(conv,"suporte",{vazio:"Nenhuma mensagem deste hotel ainda."}):"";
  if(noFim||novas||forcar)caixa.scrollTop=caixa.scrollHeight;
  // marca lidas as mensagens do cliente e atualiza o badge
  try{ await suporteMarcarLidas(hid,"cliente"); atualizarBadgeSuporte(); }catch(e){}
}

export async function abrirConversaHotel(hid){
  _donoHid=hid; _donoUltCount=-1;
  var finalizado=_supStatusCache[hid] && _supStatusCache[hid].status==="finalizado";
  var body='<div class="chatbox" id="donoConversa" style="max-height:320px;margin-bottom:12px"><p style="color:var(--text-mute)">Carregando...</p></div>'+
    '<div class="form-group" style="margin:0"><textarea id="donoResposta" rows="2" placeholder="Escreva sua resposta..." '+
    'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();responderSuporte(\''+hid+'\')}"></textarea></div>';
  var btnFinalizar=finalizado
    ? '<button class="btn btn-secondary" onclick="reabrirAtendimento(\''+hid+'\')">Reabrir</button>'
    : '<button class="btn btn-secondary" onclick="finalizarAtendimento(\''+hid+'\')">Finalizar atendimento</button>';
  sm("Conversa - "+esc(nomeHotel(hid)),body,
    '<button class="btn btn-secondary" onclick="abrirSuporteDono()">Voltar</button>'+btnFinalizar+
    '<button class="btn btn-primary" onclick="responderSuporte(\''+hid+'\')">Responder</button>');
  await pintarConversaDono(hid,true);
  setTimeout(function(){var t=document.getElementById("donoResposta");if(t)t.focus();},50);
  // atualiza a conversa a cada 4s enquanto estiver aberta
  pararPollDono(); _donoHid=hid;
  _donoPoll=setInterval(function(){
    if(document.hidden)return;
    if(!document.getElementById("donoConversa")||_donoHid!==hid){pararPollDono();return;}
    pintarConversaDono(hid,false);
  },4000);
}

export async function responderSuporte(hid){
  var t=document.getElementById("donoResposta");
  if(!t||!t.value.trim())return st("Escreva uma resposta.","warning");
  var u=getCurrentUser();
  var texto=t.value.trim();
  t.value="";
  var salvo=await suporteEnviar(hid,"suporte",(u?u.nome:"Suporte"),texto);
  if(!salvo){t.value=texto;return st("Nao foi possivel enviar.","error");}
  await pintarConversaDono(hid,true); // re-pinta so a conversa (mantem foco e poll)
  if(t)t.focus();
}

// Finaliza o atendimento: marca status + envia mensagem de sistema (dispara avaliacao no cliente)
export async function finalizarAtendimento(hid){
  var u=getCurrentUser();
  var nome=u?u.nome:"Suporte";
  var ok=await suporteDefinirStatus(hid,"finalizado",nome);
  if(!ok)return st("Nao foi possivel finalizar.","error");
  await suporteEnviar(hid,"suporte",nome,"[sistema] Atendimento finalizado. Se precisar, e so mandar uma nova mensagem.");
  _supStatusCache[hid]={ hotel_id:hid, status:"finalizado", fechado_por:nome };
  st("Atendimento finalizado.","success");
  abrirConversaHotel(hid); // recarrega com botao Reabrir
}

// Reabre um atendimento finalizado
export async function reabrirAtendimento(hid){
  var ok=await suporteDefinirStatus(hid,"aberto",null);
  if(!ok)return st("Nao foi possivel reabrir.","error");
  _supStatusCache[hid]={ hotel_id:hid, status:"aberto" };
  st("Atendimento reaberto.","success");
  abrirConversaHotel(hid);
}

// Modal de gerenciamento detalhado de um hotel (dados + plano + mensalidades)
export async function adminGerenciar(id){
  var h = cacheHoteis.find(function(x){return x.id===id});
  if(!h)return;
  sm("Gerenciar: "+esc(h.nome),'<p style="color:var(--text-mute)">Carregando...</p>','<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>');
  var { data: mens } = await supabase.rpc("listar_mensalidades",{ p_hotel:id });
  mens = mens||[];
  var hoje=new Date().toISOString().slice(0,10);
  var body =
    '<div class="qmodal-info" style="margin-bottom:16px">'+
      (h.email?'<div class="qmodal-row"><span>E-mail</span><b>'+esc(h.email)+'</b></div>':'')+
      (h.telefone?'<div class="qmodal-row"><span>Telefone</span><b>'+esc(h.telefone)+'</b></div>':'')+
      '<div class="qmodal-row"><span>Usuarios</span><b>'+h.qtd_usuarios+'</b></div>'+
      '<div class="qmodal-row"><span>Cadastro</span><b>'+fmtD((h.criado_em||"").slice(0,10))+'</b></div>'+
      '<div class="qmodal-row"><span>Ultimo acesso</span><b>'+fmtQuando(h.ultimo_acesso)+'</b></div>'+
    '</div>'+
    '<div id="agAvaliacoes" style="margin-bottom:16px"></div>'+
    '<div class="form-grid">'+
    '<div class="form-group"><label>Plano</label><select id="agPlano">'+
      Object.keys(PLANOS).map(function(k){return'<option value="'+k+'"'+(h.plano===k?' selected':'')+'>'+PLANOS[k]+'</option>'}).join('')+
    '</select></div>'+
    '<div class="form-group"><label>Status</label><select id="agStatus">'+
      '<option value="ativo"'+(h.status==="ativo"?' selected':'')+'>Ativo</option>'+
      '<option value="suspenso"'+(h.status==="suspenso"?' selected':'')+'>Suspenso</option>'+
    '</select></div>'+
    '<div class="form-group"><label>Plano expira em</label><input type="date" id="agExpira" value="'+(h.plano_expira||"")+'"></div>'+
    '<div class="form-group" style="display:flex;align-items:end"><button class="btn btn-secondary" style="width:100%" onclick="adminSalvarHotel(\''+id+'\')">Salvar plano/status</button></div>'+
    '</div>'+
    '<hr style="border:none;border-top:1px solid var(--border);margin:18px 0">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="color:var(--text)">Mensalidades</h4><button class="btn btn-sm btn-primary" onclick="adminGerarMensalidade(\''+id+'\')">+ Gerar cobranca do mes</button></div>'+
    (mens.length?
      '<table><tr><th>Referencia</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr>'+
      mens.map(function(m){
        var atrasado = m.status!=="pago" && m.vencimento < hoje;
        var badge = m.status==="pago"?'<span class="badge badge-success">Pago</span>':(atrasado?'<span class="badge badge-danger">Atrasado</span>':'<span class="badge badge-warning">Pendente</span>');
        var acao = m.status==="pago"?('<small style="color:var(--text-mute)">'+fmtD(m.pago_em)+'</small>'):('<button class="btn btn-sm btn-success" onclick="adminRegistrarPagamento(\''+m.id+'\',\''+id+'\')">Registrar pagamento</button>');
        return '<tr><td>'+esc(m.referencia)+'</td><td>'+fmtC(m.valor)+'</td><td>'+fmtD(m.vencimento)+'</td><td>'+badge+'</td><td>'+acao+'</td></tr>';
      }).join('')+'</table>'
      :'<p style="color:var(--text-mute);font-size:14px">Nenhuma mensalidade registrada. Use "Gerar cobranca do mes".</p>');
  document.getElementById("modalBody").innerHTML=body;
  // Carrega avaliacoes de suporte deste hotel
  try{
    var avs=await avaliacoesSuporte(id);
    var box=document.getElementById("agAvaliacoes");
    if(box) box.innerHTML=renderAvaliacoesDono(avs);
  }catch(e){}
}

// Tempo relativo amigavel: "ha 2 dias", "hoje as 14:30", "nunca"
function fmtQuando(iso){
  if(!iso)return"Nunca acessou";
  var d=new Date(iso),agora=new Date();
  var seg=Math.floor((agora-d)/1000);
  var p=function(n){return String(n).padStart(2,"0")};
  var hora=p(d.getHours())+":"+p(d.getMinutes());
  if(seg<60)return"Agora mesmo";
  if(seg<3600)return"Ha "+Math.floor(seg/60)+" min";
  var mesmoDia=d.toDateString()===agora.toDateString();
  if(mesmoDia)return"Hoje as "+hora;
  var ontem=new Date(agora);ontem.setDate(agora.getDate()-1);
  if(d.toDateString()===ontem.toDateString())return"Ontem as "+hora;
  var dias=Math.floor(seg/86400);
  if(dias<30)return"Ha "+dias+" dias";
  return p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear();
}

// Estrelas preenchidas/vazias
function estrelas(n){
  var s="";
  for(var i=1;i<=5;i++){ s+='<span style="color:'+(i<=n?"#f5b301":"var(--border)")+';font-size:15px">&#9733;</span>'; }
  return s;
}

// Bloco de avaliacoes no modal Gerenciar (dono)
function renderAvaliacoesDono(avs){
  if(!avs||!avs.length){
    return '<div style="border-top:1px solid var(--border);padding-top:14px"><h4 style="color:var(--text);margin-bottom:6px">Avaliacoes do suporte</h4>'+
      '<p style="color:var(--text-mute);font-size:13px">Este hotel ainda nao avaliou o atendimento.</p></div>';
  }
  var media=(avs.reduce(function(a,x){return a+x.nota},0)/avs.length);
  var html='<div style="border-top:1px solid var(--border);padding-top:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
      '<h4 style="color:var(--text)">Avaliacoes do suporte</h4>'+
      '<div style="text-align:right"><span style="font-size:18px;font-weight:700;color:var(--text)">'+media.toFixed(1)+'</span> '+estrelas(Math.round(media))+
      '<div style="font-size:11px;color:var(--text-mute)">'+avs.length+' avaliacao'+(avs.length===1?"":"es")+'</div></div>'+
    '</div>'+
    '<div style="display:flex;flex-direction:column;gap:8px;max-height:180px;overflow-y:auto">'+
    avs.map(function(a){
      return '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--surface-2)">'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+estrelas(a.nota)+
        '<small style="color:var(--text-mute)">'+fmtQuando(a.criado_em)+'</small></div>'+
        (a.comentario?'<div style="color:var(--text-dim);font-size:13px;margin-top:6px">'+esc(a.comentario)+'</div>':'')+
        (a.nome?'<div style="color:var(--text-mute);font-size:11px;margin-top:4px">'+esc(a.nome)+'</div>':'')+
      '</div>';
    }).join('')+'</div></div>';
  return html;
}

export async function adminSalvarHotel(id){
  var plano=document.getElementById("agPlano").value;
  var status=document.getElementById("agStatus").value;
  var expira=document.getElementById("agExpira").value||null;
  var { error } = await supabase.from("hoteis").update({ plano:plano, status:status, plano_expira:expira }).eq("id", id);
  if(error){ st("Erro: "+error.message,"error"); return; }
  st("Plano/status atualizados!","success");
  // atualiza cache local
  var h=cacheHoteis.find(function(x){return x.id===id}); if(h){h.plano=plano;h.status=status;h.plano_expira=expira;}
}

export function adminGerarMensalidade(id){
  var h = cacheHoteis.find(function(x){return x.id===id});
  var hoje=new Date();
  var ref=hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0");
  var venc=new Date(hoje.getFullYear(),hoje.getMonth(),10).toISOString().slice(0,10);
  var valorSugerido=(PRECOS[h&&h.plano]||9900)/100;
  sm("Gerar cobranca",
    '<div class="form-group"><label>Mes de referencia</label><input type="text" id="gmRef" value="'+ref+'" placeholder="AAAA-MM"></div>'+
    '<div class="form-group"><label>Valor (R$)</label><input type="number" id="gmValor" value="'+valorSugerido+'" step="0.01" min="0"></div>'+
    '<div class="form-group"><label>Vencimento</label><input type="date" id="gmVenc" value="'+venc+'"></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="adminConfirmarGerar(\''+id+'\')">Gerar</button>');
}

export async function adminConfirmarGerar(id){
  var ref=document.getElementById("gmRef").value.trim();
  var valor=Math.round(parseFloat(document.getElementById("gmValor").value||0)*100);
  var venc=document.getElementById("gmVenc").value;
  if(!ref||!venc)return st("Preencha referencia e vencimento.","error");
  var { error } = await supabase.rpc("gerar_mensalidade",{ p_hotel:id, p_referencia:ref, p_valor:valor, p_vencimento:venc });
  if(error)return st(error.message.indexOf("Ja existe")>=0?"Ja existe cobranca para este mes.":"Erro: "+error.message,"error");
  st("Cobranca gerada!","success");
  cm(); adminGerenciar(id);
}

export function adminRegistrarPagamento(mensalidadeId, hotelId){
  confirmar({titulo:"Registrar pagamento?",msg:"A mensalidade sera marcada como paga e o plano do hotel sera estendido em 1 mes.",okLabel:"Confirmar pagamento",tipo:"info"}, async function(){
    var { error } = await supabase.rpc("registrar_pagamento_mensalidade",{ p_mensalidade:mensalidadeId, p_forma:"manual" });
    if(error){ st("Erro: "+error.message,"error"); return; }
    st("Pagamento registrado! Plano estendido +1 mes.","success");
    // recarrega cache de hoteis e reabre
    var { data } = await supabase.rpc("listar_hoteis_admin"); cacheHoteis=data||[];
    adminGerenciar(hotelId);
  });
}
