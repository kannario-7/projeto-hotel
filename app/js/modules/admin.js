// Módulo: Painel do Dono (super-admin) — gerencia TODOS os hotéis do SaaS
import { esc, fmtD } from "../utils.js";
import { supabase } from "../supabase.js";
import { st, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";

export async function renderAdmin(){
  var el=document.getElementById("pageContent");
  var u=getCurrentUser();
  if(!u||!u.isOwner){ el.innerHTML='<div class="page-header"><div><h2>Acesso restrito</h2><p>Area exclusiva do administrador do sistema.</p></div></div>'; return; }
  el.innerHTML='<div class="page-header"><div><h2>Painel do Dono</h2><p>Todos os hoteis cadastrados no HospedaPrime</p></div></div><div id="adminContent"><p style="color:var(--text-mute)">Carregando...</p></div>';
  var { data, error } = await supabase.rpc("listar_hoteis_admin");
  var c=document.getElementById("adminContent");
  if(error){ c.innerHTML='<p style="color:#f16a6e">Erro ao carregar: '+esc(error.message)+'</p>'; return; }
  var hoteis=data||[];
  var total=hoteis.length, ativos=hoteis.filter(function(h){return h.status==="ativo"}).length;
  var html='<div class="cards-row">'+
    '<div class="stat-card"><h3>Hoteis</h3><div class="value">'+total+'</div></div>'+
    '<div class="stat-card"><h3>Ativos</h3><div class="value">'+ativos+'</div></div>'+
    '<div class="stat-card"><h3>Suspensos</h3><div class="value">'+(total-ativos)+'</div></div>'+
    '</div>';
  if(!hoteis.length){ html+='<p style="color:var(--text-mute)">Nenhum hotel cadastrado ainda.</p>'; }
  else{
    html+='<table><tr><th>Hotel</th><th>Plano</th><th>Usuarios</th><th>Cadastro</th><th>Status</th><th>Acoes</th></tr>'+
    hoteis.map(function(h){
      var badge=h.status==="ativo"?'<span class="badge badge-success">Ativo</span>':'<span class="badge badge-danger">Suspenso</span>';
      var acao=h.status==="ativo"
        ?'<button class="btn btn-sm btn-danger" onclick="adminSuspender(\''+h.id+'\')">Suspender</button>'
        :'<button class="btn btn-sm btn-success" onclick="adminAtivar(\''+h.id+'\')">Ativar</button>';
      return '<tr><td>'+esc(h.nome)+'</td><td>'+esc(h.plano||"trial")+'</td><td>'+h.qtd_usuarios+'</td><td>'+fmtD((h.criado_em||"").slice(0,10))+'</td><td>'+badge+'</td><td>'+acao+'</td></tr>';
    }).join('')+'</table>';
  }
  c.innerHTML=html;
}

export function adminSuspender(id){ confirmar({titulo:"Suspender hotel?",msg:"O acesso deste hotel sera bloqueado ate ser reativado.",okLabel:"Suspender",tipo:"danger"}, async function(){ await mudarStatus(id,"suspenso"); }); }
export async function adminAtivar(id){ await mudarStatus(id,"ativo"); }

async function mudarStatus(id, status){
  var { error } = await supabase.from("hoteis").update({ status: status }).eq("id", id);
  if(error){ st("Erro: "+error.message,"error"); return; }
  st("Hotel "+(status==="ativo"?"ativado":"suspenso")+"!", status==="ativo"?"success":"warning");
  renderAdmin();
}
