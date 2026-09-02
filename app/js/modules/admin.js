// Módulo: Painel do Dono (super-admin) — gerencia TODOS os hotéis e mensalidades
import { esc, fmtC, fmtD } from "../utils.js";
import { supabase } from "../supabase.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";

var cacheHoteis = [];
var PLANOS = { trial:"Teste Gratis", essencial:"Essencial", profissional:"Profissional" };
var PRECOS = { trial:0, essencial:9900, profissional:19900 }; // centavos
function planoLabel(p){ return PLANOS[p]||p||"Teste Gratis"; }

export async function renderAdmin(){
  var el=document.getElementById("pageContent");
  var u=getCurrentUser();
  if(!u||!u.isOwner){ el.innerHTML='<div class="page-header"><div><h2>Acesso restrito</h2><p>Area exclusiva do administrador do sistema.</p></div></div>'; return; }
  el.innerHTML='<div class="page-header"><div><h2>Painel do Dono</h2><p>Hoteis e mensalidades do HospedaPrime</p></div></div><div id="adminContent"><p style="color:var(--text-mute)">Carregando...</p></div>';
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
    '</div>'+
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
