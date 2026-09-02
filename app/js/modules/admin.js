// Módulo: Painel do Dono (super-admin) — gerencia TODOS os hotéis do SaaS
import { esc, fmtD } from "../utils.js";
import { supabase } from "../supabase.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";

var cacheHoteis = [];

var PLANOS = { trial:"Teste Gratis", essencial:"Essencial", profissional:"Profissional" };
function planoLabel(p){ return PLANOS[p]||p||"Teste Gratis"; }

export async function renderAdmin(){
  var el=document.getElementById("pageContent");
  var u=getCurrentUser();
  if(!u||!u.isOwner){ el.innerHTML='<div class="page-header"><div><h2>Acesso restrito</h2><p>Area exclusiva do administrador do sistema.</p></div></div>'; return; }
  el.innerHTML='<div class="page-header"><div><h2>Painel do Dono</h2><p>Todos os hoteis cadastrados no HospedaPrime</p></div></div><div id="adminContent"><p style="color:var(--text-mute)">Carregando...</p></div>';
  var { data, error } = await supabase.rpc("listar_hoteis_admin");
  var c=document.getElementById("adminContent");
  if(error){ c.innerHTML='<p style="color:#f16a6e">Erro ao carregar: '+esc(error.message)+'</p>'; return; }
  cacheHoteis = data||[];
  var hoteis=cacheHoteis;
  var total=hoteis.length, ativos=hoteis.filter(function(h){return h.status==="ativo"}).length;
  var pagantes=hoteis.filter(function(h){return h.plano&&h.plano!=="trial"}).length;
  var html='<div class="cards-row">'+
    '<div class="stat-card"><h3>Hoteis</h3><div class="value">'+total+'</div></div>'+
    '<div class="stat-card"><h3>Ativos</h3><div class="value">'+ativos+'</div></div>'+
    '<div class="stat-card"><h3>Pagantes</h3><div class="value">'+pagantes+'</div></div>'+
    '<div class="stat-card"><h3>Suspensos</h3><div class="value">'+(total-ativos)+'</div></div>'+
    '</div>';
  if(!hoteis.length){ html+='<p style="color:var(--text-mute)">Nenhum hotel cadastrado ainda.</p>'; }
  else{
    html+='<table><tr><th>Hotel</th><th>Plano</th><th>Expira</th><th>Usuarios</th><th>Cadastro</th><th>Status</th><th>Acoes</th></tr>'+
    hoteis.map(function(h){
      var badge=h.status==="ativo"?'<span class="badge badge-success">Ativo</span>':'<span class="badge badge-danger">Suspenso</span>';
      var expira=h.plano_expira?fmtD(h.plano_expira):"-";
      return '<tr><td>'+esc(h.nome)+'</td><td>'+esc(planoLabel(h.plano))+'</td><td>'+expira+'</td><td>'+h.qtd_usuarios+'</td><td>'+fmtD((h.criado_em||"").slice(0,10))+'</td><td>'+badge+'</td>'+
      '<td><button class="btn btn-sm btn-primary" onclick="adminGerenciar(\''+h.id+'\')">Gerenciar</button></td></tr>';
    }).join('')+'</table>';
  }
  c.innerHTML=html;
}

// Modal de gerenciamento detalhado de um hotel
export function adminGerenciar(id){
  var h = cacheHoteis.find(function(x){return x.id===id});
  if(!h)return;
  var hoje = new Date().toISOString().slice(0,10);
  var body =
    '<div class="qmodal-info" style="margin-bottom:16px">'+
      '<div class="qmodal-row"><span>Hotel</span><b>'+esc(h.nome)+'</b></div>'+
      (h.email?'<div class="qmodal-row"><span>E-mail</span><b>'+esc(h.email)+'</b></div>':'')+
      (h.telefone?'<div class="qmodal-row"><span>Telefone</span><b>'+esc(h.telefone)+'</b></div>':'')+
      '<div class="qmodal-row"><span>Usuarios</span><b>'+h.qtd_usuarios+'</b></div>'+
      '<div class="qmodal-row"><span>Cadastro</span><b>'+fmtD((h.criado_em||"").slice(0,10))+'</b></div>'+
    '</div>'+
    '<div class="form-group"><label>Plano</label><select id="agPlano">'+
      Object.keys(PLANOS).map(function(k){return'<option value="'+k+'"'+(h.plano===k?' selected':'')+'>'+PLANOS[k]+'</option>'}).join('')+
    '</select></div>'+
    '<div class="form-group"><label>Status</label><select id="agStatus">'+
      '<option value="ativo"'+(h.status==="ativo"?' selected':'')+'>Ativo</option>'+
      '<option value="suspenso"'+(h.status==="suspenso"?' selected':'')+'>Suspenso</option>'+
    '</select></div>'+
    '<div class="form-group"><label>Plano expira em</label><input type="date" id="agExpira" value="'+(h.plano_expira||"")+'"></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm btn-secondary" onclick="adminExpiraMais(30)">+30 dias</button><button class="btn btn-sm btn-secondary" onclick="adminExpiraMais(365)">+1 ano</button></div>';
  sm("Gerenciar: "+esc(h.nome), body,
    '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button><button class="btn btn-primary" onclick="adminSalvarHotel(\''+id+'\')">Salvar alteracoes</button>');
}

// Botão de atalho para somar dias na data de expiração (a partir de hoje)
export function adminExpiraMais(dias){
  var inp=document.getElementById("agExpira");
  var base=new Date();
  base.setDate(base.getDate()+dias);
  inp.value = base.toISOString().slice(0,10);
}

export async function adminSalvarHotel(id){
  var plano=document.getElementById("agPlano").value;
  var status=document.getElementById("agStatus").value;
  var expira=document.getElementById("agExpira").value||null;
  var { error } = await supabase.from("hoteis").update({ plano:plano, status:status, plano_expira:expira }).eq("id", id);
  if(error){ st("Erro: "+error.message,"error"); return; }
  st("Hotel atualizado!","success");
  cm();
  renderAdmin();
}
