// Módulo: Usuários do hotel (multi-usuário) — dentro de Configurações
import { esc } from "../utils.js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase.js";
import { st, sm, cm, closeModal } from "../ui.js";
import { getCurrentUser, MODULOS, PADRAO_PERMISSOES } from "../auth.js";
import { getHotelId, auditar } from "../store.js";

// Monta os checkboxes de modulos para um papel/permissoes atuais.
// permAtual: objeto {mod:true/false/"view"} (override) ou null (usa padrao do papel).
function checkboxesModulos(papel, permAtual){
  if(papel==="admin") return '<p style="color:var(--text-mute);font-size:13px;margin:4px 0">Administrador tem acesso a tudo.</p>';
  var padrao=PADRAO_PERMISSOES[papel]||{};
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">'+MODULOS.map(function(m){
    var val=(permAtual&&Object.prototype.hasOwnProperty.call(permAtual,m.id))?permAtual[m.id]:(padrao[m.id]);
    var marcado=(val===true||val==="view")?' checked':'';
    return '<label class="pay-opt" style="border:none;padding:6px 4px"><input type="checkbox" class="permChk" data-mod="'+m.id+'"'+marcado+'><span class="pay-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="pay-label">'+esc(m.nome)+'</span></label>';
  }).join('')+'</div>';
}
// Le os checkboxes marcados e monta o objeto permissoes {mod:true/false} para TODOS os modulos.
function lerPermissoesModulos(){
  var out={};
  document.querySelectorAll(".permChk").forEach(function(c){ out[c.getAttribute("data-mod")]=c.checked; });
  return out;
}
// Atualiza os checkboxes quando o papel muda no select (reflete o padrao do novo papel).
export function atualizarPermsPorPapel(prefixo){
  var sel=document.getElementById(prefixo==="cv"?"cvPapel":"nuPapel");
  var box=document.getElementById(prefixo==="cv"?"cvPermsBox":"nuPermsBox");
  if(!sel||!box)return;
  box.innerHTML=checkboxesModulos(sel.value,null);
}

// Renderiza a lista de usuários (perfis) do hotel + convites pendentes
export async function renderUsuariosHotel(){
  var alvo=document.getElementById("configContent");
  if(!alvo)return;
  alvo.innerHTML='<div class="form-container"><p style="color:var(--text-mute)">Carregando usuarios...</p></div>';
  var meu=getCurrentUser();
  var { data: perfis } = await supabase.from("perfis").select("*").eq("hotel_id", getHotelId());
  var { data: convites } = await supabase.from("convites").select("*").eq("usado", false);
  var html='<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Equipe do Hotel</h3>';
  if(meu&&meu.papel==="admin") html+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px"><button class="btn btn-primary" onclick="showNovoUsuarioHotel()">+ Criar usuario</button><button class="btn btn-secondary" onclick="showGerarConvite()">Gerar link de convite</button></div>';
  html+='<table><tr><th>Nome</th><th>Papel</th><th>Turno</th><th>Status</th>'+(meu&&meu.papel==="admin"?'<th>Acoes</th>':'')+'</tr>'+
  (perfis||[]).map(function(p){
    var nomeEsc=(""+(p.nome||"")).replace(/'/g,"\\'");
    var podeGerir=(meu&&meu.papel==="admin"&&p.id!==meu.id);
    var btnPerm=(podeGerir&&p.papel!=="admin"&&p.is_owner!==true)?'<button class="btn btn-sm btn-secondary" onclick="editarPermissoes(\''+p.id+'\')" style="margin-right:4px">Permissoes</button>':'';
    var acoes=podeGerir?(btnPerm+'<button class="btn btn-sm '+(p.ativo!==false?'btn-danger':'btn-success')+'" onclick="toggleUsuarioHotel(\''+p.id+'\','+(p.ativo!==false)+',\''+nomeEsc+'\')">'+(p.ativo!==false?'Desativar':'Ativar')+'</button>'):'<span style="color:var(--text-mute);font-size:12px">'+(p.id===meu.id?'voce':'')+'</span>';
    return '<tr><td>'+esc(p.nome)+'</td><td>'+esc(p.papel)+'</td><td>'+esc(p.turno||"-")+'</td><td>'+(p.ativo!==false?'<span class="badge badge-success">Ativo</span>':'<span class="badge badge-danger">Inativo</span>')+'</td>'+(meu&&meu.papel==="admin"?'<td>'+acoes+'</td>':'')+'</tr>';
  }).join('')+'</table>';
  if(convites&&convites.length){
    html+='<h4 style="margin:18px 0 10px;color:var(--text)">Convites pendentes</h4><table><tr><th>Nome</th><th>Papel</th><th>Link</th></tr>'+
    convites.map(function(c){var link=location.origin+"/app#convite="+c.token;return'<tr><td>'+esc(c.nome)+'</td><td>'+esc(c.papel)+'</td><td><button class="btn btn-sm btn-secondary" onclick="copiarConvite(\''+c.token+'\')">Copiar link</button></td></tr>'}).join('')+'</table>';
  }
  html+='</div>';
  alvo.innerHTML=html;
}

export function showNovoUsuarioHotel(){
  sm("Criar usuario",
  '<div class="form-group"><label>Nome *</label><input type="text" id="nuNome"></div>'+
  '<div class="form-group"><label>E-mail *</label><input type="email" id="nuEmail" placeholder="email@exemplo.com"></div>'+
  '<div class="form-group"><label>Senha *</label><input type="password" id="nuSenha" placeholder="Minimo 6 caracteres"></div>'+
  '<div class="form-group"><label>Papel</label><select id="nuPapel" onchange="atualizarPermsPorPapel(\'nu\')"><option value="operador">Operador</option><option value="recepcao">Recepcao</option><option value="admin">Administrador</option></select></div>'+
  '<div class="form-group"><label>Turno</label><select id="nuTurno"><option value="">Sem restricao</option><option value="Manha">Manha</option><option value="Tarde">Tarde</option><option value="Noite">Noite</option></select></div>'+
  '<div class="form-group"><label>Acesso aos modulos</label><div id="nuPermsBox">'+checkboxesModulos("operador",null)+'</div></div>'+
  '<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoUsuarioHotel()">Criar</button></div>',"");
}

// Criar usuario direto: cria conta no Auth e o perfil vinculado ao hotel.
// Obs: usa signUp; para nao deslogar o admin atual, criamos via convite auto-aceito.
export async function salvarNovoUsuarioHotel(){
  var n=document.getElementById("nuNome"),e=document.getElementById("nuEmail"),s=document.getElementById("nuSenha"),pa=document.getElementById("nuPapel"),tu=document.getElementById("nuTurno");
  if(!n.value.trim()||!e.value.trim()||!s.value)return st("Preencha nome, e-mail e senha.","error");
  if(s.value.length<6)return st("Senha minima de 6 caracteres.","error");
  // Gera um convite e ja o utiliza criando a conta num cliente isolado (nao afeta a sessao do admin)
  var hotelId=getHotelId();
  var perms=pa.value==="admin"?null:lerPermissoesModulos();
  var { data: conv, error: ec } = await supabase.from("convites").insert({ hotel_id:hotelId, nome:n.value.trim(), papel:pa.value, turno:tu.value, permissoes:perms }).select().single();
  if(ec)return st("Erro ao preparar usuario: "+ec.message,"error");
  // cria a conta usando a API REST diretamente (sem afetar a sessao atual)
  try{
    var resp=await fetch(SUPABASE_URL+"/auth/v1/signup",{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:e.value.trim(),password:s.value})});
    var novo=await resp.json();
    var novoToken=novo.access_token;
    if(!novoToken){ st("Usuario criado. Peca para ele confirmar/entrar e aceitar o convite pelo link.","info"); cm(); renderUsuariosHotel(); return; }
    // aceita o convite em nome da nova conta
    await fetch(SUPABASE_URL+"/rest/v1/rpc/aceitar_convite",{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+novoToken,"Content-Type":"application/json"},body:JSON.stringify({p_token:conv.token})});
    st("Usuario criado com sucesso!","success"); cm(); renderUsuariosHotel();
  }catch(err){ st("Erro ao criar usuario.","error"); }
}

export function showGerarConvite(){
  sm("Gerar link de convite",
  '<div class="form-group"><label>Nome da pessoa *</label><input type="text" id="cvNome"></div>'+
  '<div class="form-group"><label>Papel</label><select id="cvPapel" onchange="atualizarPermsPorPapel(\'cv\')"><option value="operador">Operador</option><option value="recepcao">Recepcao</option><option value="admin">Administrador</option></select></div>'+
  '<div class="form-group"><label>Turno</label><select id="cvTurno"><option value="">Sem restricao</option><option value="Manha">Manha</option><option value="Tarde">Tarde</option><option value="Noite">Noite</option></select></div>'+
  '<div class="form-group"><label>Acesso aos modulos</label><div id="cvPermsBox">'+checkboxesModulos("operador",null)+'</div></div>'+
  '<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="gerarConvite()">Gerar link</button></div>',"");
}

export async function gerarConvite(){
  var n=document.getElementById("cvNome"),pa=document.getElementById("cvPapel"),tu=document.getElementById("cvTurno");
  if(!n.value.trim())return st("Informe o nome.","error");
  var perms=pa.value==="admin"?null:lerPermissoesModulos();
  var { data, error } = await supabase.from("convites").insert({ hotel_id:getHotelId(), nome:n.value.trim(), papel:pa.value, turno:tu.value, permissoes:perms }).select().single();
  if(error)return st("Erro: "+error.message,"error");
  var link=location.origin+"/app#convite="+data.token;
  sm("Link de convite gerado",
  '<p style="color:var(--text-dim);margin-bottom:12px">Envie este link para a pessoa. Ao abrir, ela define a senha e entra ja vinculada ao seu hotel.</p>'+
  '<div class="form-group"><input type="text" id="cvLink" value="'+esc(link)+'" readonly></div>',
  '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button><button class="btn btn-primary" onclick="copiarConvite(\''+data.token+'\')">Copiar link</button>');
  renderUsuariosHotel();
}

export function copiarConvite(token){
  var link=location.origin+"/app#convite="+token;
  navigator.clipboard.writeText(link).then(function(){ st("Link copiado!","success"); }, function(){ st(link,"info"); });
}

export async function toggleUsuarioHotel(id, ativoAtual, nome){
  var { error } = await supabase.from("perfis").update({ ativo: !ativoAtual }).eq("id", id);
  if(error)return st("Erro: "+error.message,"error");
  auditar(ativoAtual?"usuario.desativar":"usuario.ativar",(ativoAtual?"Desativou":"Ativou")+" o usuario "+(nome||id));
  st(!ativoAtual?"Usuario ativado!":"Usuario desativado.", !ativoAtual?"success":"warning");
  renderUsuariosHotel();
}

// Abre o modal de permissoes de um usuario existente (so admin)
export async function editarPermissoes(id){
  var meu=getCurrentUser();
  if(!meu||meu.papel!=="admin")return st("Apenas administradores podem alterar permissoes.","error");
  var { data: p, error } = await supabase.from("perfis").select("*").eq("id", id).single();
  if(error||!p)return st("Nao foi possivel carregar o usuario.","error");
  if(p.papel==="admin"||p.is_owner===true)return st("Este usuario ja tem acesso total.","info");
  sm("Permissoes de "+esc(p.nome||""),
    '<p style="color:var(--text-dim);font-size:13px;margin-bottom:8px">Marque os modulos que <b>'+esc(p.nome||"")+'</b> ('+esc(p.papel)+') pode acessar. O Painel fica sempre disponivel.</p>'+
    '<div id="permEditBox">'+checkboxesModulos(p.papel, p.permissoes||null)+'</div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarPermissoes(\''+id+'\')">Salvar</button>');
}

// Salva o override de permissoes do usuario em perfis.permissoes
export async function salvarPermissoes(id){
  var perms=lerPermissoesModulos();
  var { error } = await supabase.from("perfis").update({ permissoes: perms }).eq("id", id);
  if(error)return st("Erro ao salvar: "+error.message,"error");
  auditar("usuario.permissoes","Alterou as permissoes de acesso do usuario "+id);
  st("Permissoes atualizadas!","success");
  cm(); renderUsuariosHotel();
}
