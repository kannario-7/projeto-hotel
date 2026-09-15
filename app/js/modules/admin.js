// Módulo: Painel do Dono (super-admin) — gerencia TODOS os hotéis e mensalidades
import { esc, fmtC, fmtD } from "../utils.js";
import { supabase } from "../supabase.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";
import { suporteConversas, suporteEnviar, suporteMarcarLidas, avaliacoesSuporte, suporteStatusTodos, suporteDefinirStatus, leadsListar, leadAtualizar, leadExcluir, prospectar, importarProspecto } from "../db.js";
import { showRedefinirSenhaUsuario } from "./usuarios.js";

var cacheHoteis = [];
var PLANOS = { trial:"Teste Grátis", essencial:"Essencial", profissional:"Profissional" };
var PRECOS = { trial:0, essencial:9900, profissional:19900 }; // centavos
function planoLabel(p){ return PLANOS[p]||p||"Teste Grátis"; }

export async function renderAdmin(){
  var el=document.getElementById("pageContent");
  var u=getCurrentUser();
  if(!u||!u.isOwner){ el.innerHTML='<div class="page-header"><div><h2>Acesso restrito</h2><p>Área exclusiva do administrador do sistema.</p></div></div>'; return; }
  el.innerHTML='<div class="page-header"><div><h2>Painel do Dono</h2><p>Hotéis e mensalidades do HospedaPrime</p></div><div class="page-header-actions" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-secondary" onclick="abrirProspeccao()">Prospecção</button><button class="btn btn-secondary" onclick="abrirCRM()">Marketing / CRM <span id="crmBadge" style="display:none;background:var(--coral);color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px"></span></button><button class="btn btn-primary" onclick="abrirSuporteDono()">Mensagens de Suporte <span id="supBadge" style="display:none;background:var(--neg);color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px"></span></button></div></div><div id="adminContent"><p style="color:var(--text-mute)">Carregando...</p></div>';
  atualizarBadgeSuporte();
  atualizarBadgeCRM();
  iniciarPollBadge();
  var c=document.getElementById("adminContent");
  var { data, error } = await supabase.rpc("listar_hoteis_admin");
  if(error){ c.innerHTML='<p style="color:var(--neg)">Erro ao carregar: '+esc(error.message)+'</p>'; return; }
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
    '<div class="stat-card"><h3>Hotéis</h3><div class="value">'+total+'</div><div class="sub">'+ativos+' ativos</div></div>'+
    '<div class="stat-card"><h3>Recebido no mês</h3><div class="value">'+fmtC(resumo.recebido_mes)+'</div></div>'+
    '<div class="stat-card"><h3>A receber</h3><div class="value">'+fmtC(resumo.a_receber)+'</div></div>'+
    '<div class="stat-card"><h3>Em atraso</h3><div class="value">'+resumo.qtd_atraso+'</div></div>'+
    '</div>';

  if(!hoteis.length){ html+='<p style="color:var(--text-mute)">Nenhum hotel cadastrado ainda.</p>'; }
  else{
    html+='<table><tr><th>Hotel</th><th>Plano</th><th>Expira</th><th>Usuários</th><th>Status</th><th>Ações</th></tr>'+
    hoteis.map(function(h){
      var badge=h.status==="ativo"?'<span class="badge badge-success">Ativo</span>':'<span class="badge badge-danger">Suspenso</span>';
      var exp = h.plano_expira?fmtD(h.plano_expira):"-";
      if(vencido(h)) exp='<span style="color:var(--neg);font-weight:700">'+fmtD(h.plano_expira)+' ⚠</span>';
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
  if(st==="respondido") return '<span style="flex:none;background:var(--pos-bg);color:var(--pos);border-radius:20px;padding:1px 9px;font-size:11px">Respondido</span>';
  return '<span style="flex:none;background:var(--neg-bg);color:var(--neg);border-radius:20px;padding:1px 9px;font-size:11px">Aberto</span>';
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
    var prev=(ult.autor==="suporte"?"Você: ":"")+ult.texto;
    var st=statusHotel(hid,conv);
    return '<div onclick="abrirConversaHotel(\''+hid+'\')" style="cursor:pointer;display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--surface-2);transition:border-color .15s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'+
      '<div style="flex:none;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">'+esc(ini)+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="color:var(--text)">'+esc(nome)+'</b><div style="display:flex;gap:6px;align-items:center">'+(naoLidas?'<span style="flex:none;background:var(--neg);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700">'+naoLidas+'</span>':'')+badgeStatus(st)+'</div></div>'+
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
  if(!salvo){t.value=texto;return st("Não foi possível enviar.","error");}
  await pintarConversaDono(hid,true); // re-pinta so a conversa (mantem foco e poll)
  if(t)t.focus();
}

// Finaliza o atendimento: marca status + envia mensagem de sistema (dispara avaliacao no cliente)
export async function finalizarAtendimento(hid){
  var u=getCurrentUser();
  var nome=u?u.nome:"Suporte";
  var ok=await suporteDefinirStatus(hid,"finalizado",nome);
  if(!ok)return st("Não foi possível finalizar.","error");
  await suporteEnviar(hid,"suporte",nome,"[sistema] Atendimento finalizado. Se precisar, é só mandar uma nova mensagem.");
  _supStatusCache[hid]={ hotel_id:hid, status:"finalizado", fechado_por:nome };
  st("Atendimento finalizado.","success");
  abrirConversaHotel(hid); // recarrega com botao Reabrir
}

// Reabre um atendimento finalizado
export async function reabrirAtendimento(hid){
  var ok=await suporteDefinirStatus(hid,"aberto",null);
  if(!ok)return st("Não foi possível reabrir.","error");
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
      '<div class="qmodal-row"><span>Usuários</span><b>'+h.qtd_usuarios+'</b></div>'+
      '<div class="qmodal-row"><span>Cadastro</span><b>'+fmtD((h.criado_em||"").slice(0,10))+'</b></div>'+
      '<div class="qmodal-row"><span>Último acesso</span><b>'+fmtQuando(h.ultimo_acesso)+'</b></div>'+
    '</div>'+
    '<div id="agAvaliacoes" style="margin-bottom:16px"></div>'+
    '<div id="agUsuarios" style="margin-bottom:16px"></div>'+
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
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="color:var(--text)">Mensalidades</h4><button class="btn btn-sm btn-primary" onclick="adminGerarMensalidade(\''+id+'\')">+ Gerar cobrança do mês</button></div>'+
    (mens.length?
      '<table><tr><th>Referência</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr>'+
      mens.map(function(m){
        var atrasado = m.status!=="pago" && m.vencimento < hoje;
        var badge = m.status==="pago"?'<span class="badge badge-success">Pago</span>':(atrasado?'<span class="badge badge-danger">Atrasado</span>':'<span class="badge badge-warning">Pendente</span>');
        var acao = m.status==="pago"?('<small style="color:var(--text-mute)">'+fmtD(m.pago_em)+'</small>'):('<button class="btn btn-sm btn-success" onclick="adminRegistrarPagamento(\''+m.id+'\',\''+id+'\')">Registrar pagamento</button>');
        return '<tr><td>'+esc(m.referencia)+'</td><td>'+fmtC(m.valor)+'</td><td>'+fmtD(m.vencimento)+'</td><td>'+badge+'</td><td>'+acao+'</td></tr>';
      }).join('')+'</table>'
      :'<p style="color:var(--text-mute);font-size:14px">Nenhuma mensalidade registrada. Use "Gerar cobrança do mês".</p>');
  document.getElementById("modalBody").innerHTML=body;
  // Carrega avaliacoes de suporte deste hotel
  try{
    var avs=await avaliacoesSuporte(id);
    var box=document.getElementById("agAvaliacoes");
    if(box) box.innerHTML=renderAvaliacoesDono(avs);
  }catch(e){}
  // Carrega os usuarios deste hotel (dono pode ler via RLS) para redefinir senha
  carregarUsuariosHotelDono(id);
}

// Lista os usuarios de um hotel no modal do dono, com botao para redefinir senha.
// O dono tem SELECT em perfis de qualquer hotel (politica perfis_select => sou_dono()).
async function carregarUsuariosHotelDono(hotelId){
  var box=document.getElementById("agUsuarios");
  if(!box)return;
  box.innerHTML='<div style="border-top:1px solid var(--border);padding-top:14px"><h4 style="color:var(--text);margin-bottom:6px">Usuários</h4><p style="color:var(--text-mute);font-size:13px">Carregando...</p></div>';
  var { data: perfis, error } = await supabase.from("perfis").select("id,nome,papel,is_owner,ativo").eq("hotel_id", hotelId);
  if(error){ box.innerHTML='<div style="border-top:1px solid var(--border);padding-top:14px"><h4 style="color:var(--text);margin-bottom:6px">Usuários</h4><p style="color:var(--neg);font-size:13px">Erro ao carregar: '+esc(error.message)+'</p></div>'; return; }
  if(!perfis||!perfis.length){ box.innerHTML='<div style="border-top:1px solid var(--border);padding-top:14px"><h4 style="color:var(--text);margin-bottom:6px">Usuários</h4><p style="color:var(--text-mute);font-size:13px">Nenhum usuário neste hotel.</p></div>'; return; }
  var linhas=perfis.map(function(p){
    var nomeEsc=(""+(p.nome||"")).replace(/'/g,"\\'");
    var st2=p.ativo!==false?'<span class="badge badge-success">Ativo</span>':'<span class="badge badge-danger">Inativo</span>';
    var btn='<button class="btn btn-sm btn-secondary" onclick="showRedefinirSenhaUsuario(\''+p.id+'\',\''+nomeEsc+'\')">Redefinir senha</button>';
    return '<tr><td>'+esc(p.nome||"-")+'</td><td>'+esc(p.papel||"-")+(p.is_owner?" (dono)":"")+'</td><td>'+st2+'</td><td>'+btn+'</td></tr>';
  }).join('');
  box.innerHTML='<div style="border-top:1px solid var(--border);padding-top:14px"><h4 style="color:var(--text);margin-bottom:10px">Usuários</h4>'+
    '<table><tr><th>Nome</th><th>Papel</th><th>Status</th><th></th></tr>'+linhas+'</table></div>';
}

// Tempo relativo amigavel: "ha 2 dias", "hoje as 14:30", "nunca"
function fmtQuando(iso){
  if(!iso)return"Nunca acessou";
  var d=new Date(iso),agora=new Date();
  var seg=Math.floor((agora-d)/1000);
  var p=function(n){return String(n).padStart(2,"0")};
  var hora=p(d.getHours())+":"+p(d.getMinutes());
  if(seg<60)return"Agora mesmo";
  if(seg<3600)return"Há "+Math.floor(seg/60)+" min";
  var mesmoDia=d.toDateString()===agora.toDateString();
  if(mesmoDia)return"Hoje às "+hora;
  var ontem=new Date(agora);ontem.setDate(agora.getDate()-1);
  if(d.toDateString()===ontem.toDateString())return"Ontem às "+hora;
  var dias=Math.floor(seg/86400);
  if(dias<30)return"Há "+dias+" dias";
  return p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear();
}

// Estrelas preenchidas/vazias
function estrelas(n){
  var s="";
  for(var i=1;i<=5;i++){ s+='<span style="color:'+(i<=n?"var(--star)":"var(--border)")+';font-size:15px">&#9733;</span>'; }
  return s;
}

// Bloco de avaliacoes no modal Gerenciar (dono)
function renderAvaliacoesDono(avs){
  if(!avs||!avs.length){
    return '<div style="border-top:1px solid var(--border);padding-top:14px"><h4 style="color:var(--text);margin-bottom:6px">Avaliações do suporte</h4>'+
      '<p style="color:var(--text-mute);font-size:13px">Este hotel ainda não avaliou o atendimento.</p></div>';
  }
  var media=(avs.reduce(function(a,x){return a+x.nota},0)/avs.length);
  var html='<div style="border-top:1px solid var(--border);padding-top:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
      '<h4 style="color:var(--text)">Avaliações do suporte</h4>'+
      '<div style="text-align:right"><span style="font-size:18px;font-weight:700;color:var(--text)">'+media.toFixed(1)+'</span> '+estrelas(Math.round(media))+
      '<div style="font-size:11px;color:var(--text-mute)">'+avs.length+' avaliação'+(avs.length===1?"":"ões")+'</div></div>'+
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
  sm("Gerar cobrança",
    '<div class="form-group"><label>Mês de referência</label><input type="text" id="gmRef" value="'+ref+'" placeholder="AAAA-MM"></div>'+
    '<div class="form-group"><label>Valor (R$)</label><input type="number" id="gmValor" value="'+valorSugerido+'" step="0.01" min="0"></div>'+
    '<div class="form-group"><label>Vencimento</label><input type="date" id="gmVenc" value="'+venc+'"></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="adminConfirmarGerar(\''+id+'\')">Gerar</button>');
}

export async function adminConfirmarGerar(id){
  var ref=document.getElementById("gmRef").value.trim();
  var valor=Math.round(parseFloat(document.getElementById("gmValor").value||0)*100);
  var venc=document.getElementById("gmVenc").value;
  if(!ref||!venc)return st("Preencha referência e vencimento.","error");
  var { error } = await supabase.rpc("gerar_mensalidade",{ p_hotel:id, p_referencia:ref, p_valor:valor, p_vencimento:venc });
  if(error)return st(error.message.indexOf("Ja existe")>=0?"Já existe cobrança para este mês.":"Erro: "+error.message,"error");
  st("Cobrança gerada!","success");
  cm(); adminGerenciar(id);
}

export function adminRegistrarPagamento(mensalidadeId, hotelId){
  confirmar({titulo:"Registrar pagamento?",msg:"A mensalidade será marcada como paga e o plano do hotel será estendido em 1 mês.",okLabel:"Confirmar pagamento",tipo:"info"}, async function(){
    var { error } = await supabase.rpc("registrar_pagamento_mensalidade",{ p_mensalidade:mensalidadeId, p_forma:"manual" });
    if(error){ st("Erro: "+error.message,"error"); return; }
    st("Pagamento registrado! Plano estendido +1 mês.","success");
    // recarrega cache de hoteis e reabre
    var { data } = await supabase.rpc("listar_hoteis_admin"); cacheHoteis=data||[];
    adminGerenciar(hotelId);
  });
}

// =====================================================================
// MARKETING / CRM  (captação e gestão de leads — só o dono acessa)
// =====================================================================
var _leadsCache = [];
var _crmFiltro = "todos";
var _crmBusca = "";

// Rótulos e ordem do funil
var CRM_STATUS = [
  { id:"novo",       label:"Novo" },
  { id:"contatado",  label:"Contatado" },
  { id:"negociando", label:"Negociando" },
  { id:"ganho",      label:"Ganho" },
  { id:"perdido",    label:"Perdido" }
];
function crmLabel(s){ var f=CRM_STATUS.find(function(x){return x.id===s}); return f?f.label:s; }
function crmBadgeClass(s){
  if(s==="ganho")return "badge-success";
  if(s==="perdido")return "badge-danger";
  if(s==="negociando")return "badge-warning";
  if(s==="contatado")return "badge-info";
  return "badge-neutral"; // novo
}

// Botões rápidos de funil na linha, conforme o status atual do lead.
// Mostra os próximos passos lógicos + sempre o "Gerenciar".
function crmBtn(id, status, label, classe){
  return '<button class="btn btn-sm '+classe+'" style="margin-right:4px" onclick="crmMoverStatus(\''+id+'\',\''+status+'\')">'+label+'</button>';
}
function crmBotoesFunil(l){
  var b="";
  if(l.status==="novo"){
    b+=crmBtn(l.id,"contatado","Contatado","btn-success");
    b+=crmBtn(l.id,"negociando","Negociando","btn-secondary");
  } else if(l.status==="contatado"){
    b+=crmBtn(l.id,"negociando","Negociando","btn-primary");
    b+=crmBtn(l.id,"ganho","Ganhou","btn-success");
    b+=crmBtn(l.id,"perdido","Perdeu","btn-danger");
  } else if(l.status==="negociando"){
    b+=crmBtn(l.id,"ganho","Ganhou","btn-success");
    b+=crmBtn(l.id,"perdido","Perdeu","btn-danger");
  }
  // ganho/perdido: sem botões de avanço, só gerenciar
  b+='<button class="btn btn-sm btn-secondary" onclick="crmAbrirLead(\''+l.id+'\')">Gerenciar</button>';
  return b;
}

// Só dígitos, para montar link de WhatsApp
function soDigitos(t){ return (""+(t||"")).replace(/\D/g,""); }

// Mensagens de abordagem por WhatsApp (centralizadas para fácil ajuste).
// Objetivo: gerar curiosidade e convidar à resposta, sem soar como spam.
// PROSPECÇÃO (contato frio): usa o nome do estabelecimento.
function msgProspeccao(nomeLocal){
  var alvo = nomeLocal ? nomeLocal : 'a sua pousada';
  return 'Oi! Tudo bem por aí no '+alvo+'?\n\n'+
    'Dou uma pergunta rápida: hoje as reservas e o caixa de vocês ainda vivem na planilha ou no caderno?\n\n'+
    'A gente ajuda hotéis e pousadas a colocarem tudo num lugar só — mapa de quartos, check-in e financeiro — e o caixa do dia fecha em menos de 1 minuto.\n\n'+
    'Dá pra ver a ocupação e o quanto entrou sem abrir mil abas. Posso te mostrar rapidinho como funciona? O teste é grátis por 7 dias, sem cartão.';
}
// LEAD (já demonstrou interesse pelo site): tom de retomada.
function msgLead(nomeLead){
  var ola = nomeLead ? ('Oi, '+nomeLead+'!') : 'Oi!';
  return ola+' Aqui é do HospedaPrime.\n\n'+
    'Vi que você se interessou pelo sistema. Separei uma demonstração rápida, feita pro seu tipo de hotel.\n\n'+
    'Quando fica bom pra você dar uma olhada?';
}

// Abre o CRM em modal grande
export async function abrirCRM(){
  sm("Marketing / CRM",'<p style="color:var(--text-mute)">Carregando leads...</p>','<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>');
  var _b=document.querySelector("#modalOverlay .modal"); if(_b)_b.classList.add("modal-wide");
  _leadsCache = await leadsListar();
  pintarCRM();
}

function crmResumo(){
  var r={ total:_leadsCache.length };
  CRM_STATUS.forEach(function(s){ r[s.id]=_leadsCache.filter(function(l){return l.status===s.id}).length; });
  return r;
}

export function crmFiltrar(status){ _crmFiltro=status; pintarCRM(); }
export function crmBuscar(termo){
  _crmBusca=(termo||"").toLowerCase().trim();
  // repinta só a lista, preservando o foco do campo de busca
  pintarCRMLista();
}

function pintarCRM(){
  var box=document.getElementById("modalBody");
  if(!box) return;
  var r=crmResumo();

  // cards de resumo do funil (compactos) — clicáveis para filtrar
  var cards='<div class="crm-cards">'+
    '<div class="crm-card'+(_crmFiltro==="todos"?" on":"")+'" onclick="crmFiltrar(\'todos\')" style="cursor:pointer"><h4>Total</h4><div class="n">'+r.total+'</div></div>'+
    CRM_STATUS.map(function(s){
      return '<div class="crm-card'+(_crmFiltro===s.id?" on":"")+'" onclick="crmFiltrar(\''+s.id+'\')" style="cursor:pointer"><h4>'+s.label+'</h4><div class="n">'+(r[s.id]||0)+'</div></div>';
    }).join('')+'</div>';

  // filtros
  var chips='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
    '<button class="btn btn-sm '+(_crmFiltro==="todos"?"btn-primary":"btn-secondary")+'" onclick="crmFiltrar(\'todos\')">Todos</button>'+
    CRM_STATUS.map(function(s){
      return '<button class="btn btn-sm '+(_crmFiltro===s.id?"btn-primary":"btn-secondary")+'" onclick="crmFiltrar(\''+s.id+'\')">'+s.label+'</button>';
    }).join('')+'</div>';

  // campo de busca (por nome, cidade, telefone ou e-mail)
  var busca='<input type="text" id="crmBuscaInput" placeholder="Buscar por nome, cidade, telefone ou e-mail..." value="'+esc(_crmBusca)+'" oninput="crmBuscar(this.value)" style="width:100%;padding:10px 13px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);margin-bottom:14px">';

  box.innerHTML=cards+chips+busca+'<div id="crmLista"></div>';
  pintarCRMLista();
}

// Monta apenas a lista (tabela) do CRM, aplicando filtro de status + termo de busca.
// Repintar só esta parte preserva o foco no campo de busca enquanto digita.
function pintarCRMLista(){
  var alvo=document.getElementById("crmLista");
  if(!alvo)return;
  var termo=_crmBusca;
  var lista=_leadsCache.filter(function(l){
    if(_crmFiltro!=="todos" && l.status!==_crmFiltro) return false;
    if(!termo) return true;
    var alvoTxt=((l.nome||"")+" "+(l.cidade||"")+" "+(l.telefone||"")+" "+(l.email||"")).toLowerCase();
    return alvoTxt.indexOf(termo)>=0;
  });

  if(!lista.length){
    alvo.innerHTML='<p style="color:var(--text-mute);padding:16px 0;text-align:center">'+(termo?'Nenhum lead encontrado para "'+esc(termo)+'".':'Nenhum lead '+(_crmFiltro==="todos"?"":"neste status")+' ainda. Os contatos enviados pelo site aparecem aqui.')+'</p>';
    return;
  }
  alvo.innerHTML='<div class="crm-tabela"><table><tr><th>Nome</th><th>Contato</th><th>Origem</th><th>Status</th><th>Quando</th><th>Ações</th></tr>'+
    lista.map(function(l){
      var contato=[];
      if(l.telefone){
        var wa='https://wa.me/55'+soDigitos(l.telefone)+'?text='+encodeURIComponent(l.origem==="prospeccao"?msgProspeccao(l.nome):msgLead(l.nome));
        // ao abrir o WhatsApp, marca automaticamente como Contatado (se ainda for Novo)
        contato.push('<a href="'+wa+'" target="_blank" rel="noopener" title="Chamar no WhatsApp" onclick="crmMarcarContatado(\''+l.id+'\')">'+esc(l.telefone)+'</a>');
      }
      if(l.email){
        var mail='mailto:'+esc(l.email)+'?subject='+encodeURIComponent('HospedaPrime — seu contato')+'&body='+encodeURIComponent('Olá '+(l.nome||'')+',\n\nRecebemos o seu interesse no HospedaPrime.');
        contato.push('<a href="'+mail+'" title="Enviar e-mail" onclick="crmMarcarContatado(\''+l.id+'\')">'+esc(l.email)+'</a>');
      }
      var quando=l.criado_em?fmtQuando(l.criado_em):"-";
      // botões rápidos de funil conforme o status atual
      var acoes=crmBotoesFunil(l);
      return '<tr>'+
        '<td>'+esc(l.nome||"-")+(l.mensagem?'<br><small style="color:var(--text-mute)">'+esc(l.mensagem)+'</small>':'')+'</td>'+
        '<td style="font-size:13px">'+(contato.length?contato.join('<br>'):'-')+'</td>'+
        '<td><small>'+esc(l.origem||"-")+'</small></td>'+
        '<td><span class="badge '+crmBadgeClass(l.status)+'">'+esc(crmLabel(l.status))+'</span></td>'+
        '<td><small>'+quando+'</small></td>'+
        '<td style="white-space:nowrap">'+acoes+'</td>'+
      '</tr>';
    }).join('')+'</table></div>';
}

// Modal de detalhe/gestão de um lead
export function crmAbrirLead(id){
  var l=_leadsCache.find(function(x){return x.id===id});
  if(!l)return;
  var opcoes=CRM_STATUS.map(function(s){
    return '<option value="'+s.id+'"'+(l.status===s.id?' selected':'')+'>'+s.label+'</option>';
  }).join('');
  var linhaContato=[];
  if(l.telefone){
    var wa='https://wa.me/55'+soDigitos(l.telefone)+'?text='+encodeURIComponent(l.origem==="prospeccao"?msgProspeccao(l.nome):msgLead(l.nome));
    linhaContato.push('<a class="btn btn-sm btn-success" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>');
  }
  if(l.email){
    var mail='mailto:'+esc(l.email)+'?subject='+encodeURIComponent('HospedaPrime — seu contato');
    linhaContato.push('<a class="btn btn-sm btn-secondary" href="'+mail+'" target="_blank" rel="noopener">E-mail</a>');
  }
  sm("Lead: "+esc(l.nome||""),
    '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-size:14px;color:var(--text-dim)">'+
      (l.telefone?'<div><b>Telefone:</b> '+esc(l.telefone)+'</div>':'')+
      (l.email?'<div><b>E-mail:</b> '+esc(l.email)+'</div>':'')+
      '<div><b>Origem:</b> '+esc(l.origem||"-")+'</div>'+
      (l.mensagem?'<div><b>Mensagem:</b> '+esc(l.mensagem)+'</div>':'')+
    '</div>'+
    (linhaContato.length?'<div style="display:flex;gap:8px;margin-bottom:14px">'+linhaContato.join('')+'</div>':'')+
    '<div class="form-group"><label>Status</label><select id="crmStatus">'+opcoes+'</select></div>'+
    '<div class="form-group"><label>Anotações internas</label><textarea id="crmNotas" rows="3" placeholder="Observações sobre o contato...">'+esc(l.notas||"")+'</textarea></div>',
    '<button class="btn btn-danger" onclick="crmExcluir(\''+l.id+'\')" style="margin-right:auto">Excluir</button>'+
    '<button class="btn btn-secondary" onclick="abrirCRM()">Voltar</button>'+
    '<button class="btn btn-primary" onclick="crmSalvarLead(\''+l.id+'\')">Salvar</button>');
}

export async function crmSalvarLead(id){
  var s=document.getElementById("crmStatus"), n=document.getElementById("crmNotas");
  var ok=await leadAtualizar(id, s?s.value:null, n?n.value:null);
  if(!ok)return st("Não foi possível salvar o lead.","error");
  st("Lead atualizado!","success");
  _leadsCache = await leadsListar();
  abrirCRM();
}

// Marca um lead como "contatado" — só avança se ainda estiver "novo"
// (não rebaixa quem já está em negociação/ganho). Usado automaticamente ao
// clicar no WhatsApp/e-mail.
export async function crmMarcarContatado(id){
  var l=_leadsCache.find(function(x){return x.id===id});
  if(!l) return;
  if(l.status!=="novo") return; // já foi movido; não faz nada
  await crmMoverStatus(id, "contatado");
}

// Move um lead para qualquer status do funil (botões rápidos da linha).
export async function crmMoverStatus(id, status){
  var l=_leadsCache.find(function(x){return x.id===id});
  if(!l || l.status===status) return;
  var ok=await leadAtualizar(id, status, null);
  if(!ok){ st("Não foi possível atualizar o status.","error"); return; }
  l.status=status; // atualiza cache local
  st("Movido para "+crmLabel(status)+".","success");
  pintarCRM(); // repinta cards + lista
  atualizarBadgeCRM();
}

export function crmExcluir(id){
  confirmar({titulo:"Excluir lead?",msg:"Este contato será removido do CRM. Esta ação não pode ser desfeita.",okLabel:"Sim, excluir",tipo:"danger"}, async function(){
    var ok=await leadExcluir(id);
    if(!ok)return st("Não foi possível excluir.","error");
    st("Lead excluído.","warning");
    _leadsCache = await leadsListar();
    abrirCRM();
  });
}

// Badge de leads novos no cabeçalho do Painel do Dono
export async function atualizarBadgeCRM(){
  try{
    var leads=await leadsListar();
    var novos=leads.filter(function(l){return l.status==="novo"}).length;
    var b=document.getElementById("crmBadge");
    if(b){ if(novos){ b.style.display="inline-block"; b.textContent=novos; } else b.style.display="none"; }
  }catch(e){}
}

// =====================================================================
// PROSPECÇÃO  (busca ativa de hotéis/pousadas via Google Places)
// =====================================================================
var _prospResultados = [];

export function abrirProspeccao(){
  sm("Prospecção de clientes",
    '<p style="color:var(--text-mute);font-size:13px;margin-bottom:12px">Busque estabelecimentos e salve os interessantes no seu CRM para depois entrar em contato. Ex.: <i>pousadas em Ubatuba</i>, <i>hotéis em Campos do Jordão</i>.</p>'+
    '<div style="display:flex;gap:8px;margin-bottom:14px">'+
      '<input type="text" id="prospQ" placeholder="O que buscar e onde..." style="flex:1;padding:11px 13px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text)" onkeydown="if(event.key===\'Enter\')buscarProspeccao()">'+
      '<button class="btn btn-primary" onclick="buscarProspeccao()">Buscar</button>'+
    '</div>'+
    '<div id="prospResultado"><p style="color:var(--text-mute);font-size:13px">Os resultados aparecem aqui.</p></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>');
  var _b=document.querySelector("#modalOverlay .modal"); if(_b)_b.classList.add("modal-wide");
}

export async function buscarProspeccao(){
  var campo=document.getElementById("prospQ");
  var alvo=document.getElementById("prospResultado");
  var q=campo?campo.value.trim():"";
  if(q.length<3){ if(alvo)alvo.innerHTML='<p style="color:var(--neg);font-size:13px">Digite o que buscar. Ex.: pousadas em Ubatuba.</p>'; return; }
  if(alvo)alvo.innerHTML='<p style="color:var(--text-mute)">Buscando...</p>';
  var r=await prospectar(q);
  if(!r.ok){
    alvo.innerHTML='<p style="color:var(--neg);font-size:13px">'+esc(r.error||"Falha na busca.")+'</p>';
    return;
  }
  _prospResultados=r.resultados;
  pintarProspeccao();
}

function pintarProspeccao(){
  var alvo=document.getElementById("prospResultado");
  if(!alvo)return;
  if(!_prospResultados.length){
    alvo.innerHTML='<p style="color:var(--text-mute);font-size:13px">Nenhum resultado. Tente outra busca.</p>';
    return;
  }
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
    '<b style="color:var(--text);font-size:13px">'+_prospResultados.length+' encontrado(s)</b>'+
    '<button class="btn btn-sm btn-primary" onclick="salvarTodosProspeccao()">Salvar todos no CRM</button></div>';
  html+='<div class="crm-tabela"><table><tr><th>Nome</th><th>Contato</th><th>Cidade</th><th>Nota</th><th></th></tr>'+
    _prospResultados.map(function(p,i){
      var contato=[];
      if(p.telefone){
        var waP='https://wa.me/55'+soDigitos(p.telefone)+'?text='+encodeURIComponent(msgProspeccao(p.nome));
        contato.push('<a href="'+waP+'" target="_blank" rel="noopener" title="Chamar no WhatsApp">'+esc(p.telefone)+'</a>');
      }
      if(p.site) contato.push('<a href="'+esc(p.site)+'" target="_blank" rel="noopener">site</a>');
      var nota=(p.avaliacao!=null?(p.avaliacao+(p.qtd_avaliacoes?(' ('+p.qtd_avaliacoes+')'):'')):'-');
      return '<tr>'+
        '<td>'+esc(p.nome||"-")+(p.endereco?'<br><small style="color:var(--text-mute)">'+esc(p.endereco)+'</small>':'')+'</td>'+
        '<td style="font-size:13px">'+(contato.length?contato.join('<br>'):'-')+'</td>'+
        '<td><small>'+esc(p.cidade||"-")+'</small></td>'+
        '<td><small>'+nota+'</small></td>'+
        '<td><button class="btn btn-sm btn-secondary" onclick="salvarProspecto('+i+')" id="prospBtn'+i+'">Salvar</button></td>'+
      '</tr>';
    }).join('')+'</table></div>';
  alvo.innerHTML=html;
}

export async function salvarProspecto(i){
  var p=_prospResultados[i];
  if(!p)return;
  var btn=document.getElementById("prospBtn"+i);
  if(btn){ btn.disabled=true; btn.textContent="Salvando..."; }
  var r=await importarProspecto(p);
  if(!r.ok){ st("Não foi possível salvar: "+esc(r.error||""),"error"); if(btn){btn.disabled=false;btn.textContent="Salvar";} return; }
  if(btn){ btn.textContent="No CRM ✓"; btn.className="btn btn-sm btn-success"; }
  st("Prospecto salvo no CRM!","success");
  atualizarBadgeCRM();
}

export async function salvarTodosProspeccao(){
  if(!_prospResultados.length)return;
  st("Salvando "+_prospResultados.length+" no CRM...","info");
  var ok=0;
  for(var i=0;i<_prospResultados.length;i++){
    var r=await importarProspecto(_prospResultados[i]);
    if(r.ok){ ok++; var b=document.getElementById("prospBtn"+i); if(b){b.textContent="No CRM ✓";b.className="btn btn-sm btn-success";b.disabled=true;} }
  }
  st(ok+" prospecto(s) salvos no CRM. Duplicados foram ignorados.","success");
  atualizarBadgeCRM();
}
