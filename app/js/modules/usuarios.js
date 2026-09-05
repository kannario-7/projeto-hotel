// Módulo: Usuários do hotel (multi-usuário) — dentro de Configurações
import { esc } from "../utils.js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase.js";
import { st, sm, cm, closeModal } from "../ui.js";
import { getCurrentUser } from "../auth.js";
import { getHotelId, auditar } from "../store.js";

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
    var acoes=(meu&&meu.papel==="admin"&&p.id!==meu.id)?'<button class="btn btn-sm '+(p.ativo!==false?'btn-danger':'btn-success')+'" onclick="toggleUsuarioHotel(\''+p.id+'\','+(p.ativo!==false)+',\''+nomeEsc+'\')">'+(p.ativo!==false?'Desativar':'Ativar')+'</button>':'<span style="color:var(--text-mute);font-size:12px">'+(p.id===meu.id?'voce':'')+'</span>';
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
  '<div class="form-group"><label>Papel</label><select id="nuPapel"><option value="operador">Operador</option><option value="recepcao">Recepcao</option><option value="admin">Administrador</option></select></div>'+
  '<div class="form-group"><label>Turno</label><select id="nuTurno"><option value="">Sem restricao</option><option value="Manha">Manha</option><option value="Tarde">Tarde</option><option value="Noite">Noite</option></select></div>'+
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
  var { data: conv, error: ec } = await supabase.from("convites").insert({ hotel_id:hotelId, nome:n.value.trim(), papel:pa.value, turno:tu.value }).select().single();
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
  '<div class="form-group"><label>Papel</label><select id="cvPapel"><option value="operador">Operador</option><option value="recepcao">Recepcao</option><option value="admin">Administrador</option></select></div>'+
  '<div class="form-group"><label>Turno</label><select id="cvTurno"><option value="">Sem restricao</option><option value="Manha">Manha</option><option value="Tarde">Tarde</option><option value="Noite">Noite</option></select></div>'+
  '<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="gerarConvite()">Gerar link</button></div>',"");
}

export async function gerarConvite(){
  var n=document.getElementById("cvNome"),pa=document.getElementById("cvPapel"),tu=document.getElementById("cvTurno");
  if(!n.value.trim())return st("Informe o nome.","error");
  var { data, error } = await supabase.from("convites").insert({ hotel_id:getHotelId(), nome:n.value.trim(), papel:pa.value, turno:tu.value }).select().single();
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
