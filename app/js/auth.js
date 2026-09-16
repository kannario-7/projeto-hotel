// Autenticação real via Supabase + onboarding de hotel (multi-tenant)
import { esc } from "./utils.js";
import { supabase } from "./supabase.js";
import { St, carregarTudo, setHotelId } from "./store.js";
import { registrarAcesso } from "./db.js";
import { st } from "./ui.js";
import { showChangelog, atualizarBadgeNovidade, temNovidade } from "./changelog.js";
import { renderPage } from "./nav.js";
import { iniciarPresenca, pararPresenca } from "./presenca.js";

var usuarioAtual = null; // { id, nome, papel, hotelId }
var emRecuperacaoSenha = false; // true quando o usuario chegou pelo link de recuperacao de senha

export function getCurrentUser(){ return usuarioAtual; }

// O Supabase dispara PASSWORD_RECOVERY ao abrir o app pelo link de recuperacao.
// Marcamos o estado e mostramos a tela de nova senha, evitando que o boot restaure a sessao normal.
// Blindado: qualquer erro aqui NAO pode travar o carregamento do app.
try{
  supabase.auth.onAuthStateChange(function(event){
    try{
      if(event==="PASSWORD_RECOVERY"){
        emRecuperacaoSenha = true;
        if(document.getElementById("loginContent")) showDefinirNovaSenha();
      }
    }catch(e){ console.error("onAuthStateChange:", e); }
  });
}catch(e){ console.error("Falha ao registrar onAuthStateChange:", e); }

export function isRecuperacaoSenha(){
  return emRecuperacaoSenha || (window.location.hash||"").indexOf("#recuperar")===0;
}

// --- TELAS DE LOGIN / CADASTRO ---
export function showLogin(){
  var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";
  document.body.classList.remove("logged");
  document.getElementById("loginContent").innerHTML=
    '<div class="form-group"><label>E-mail</label><input type="email" id="loginEmail" placeholder="seu@email.com" onkeydown="if(event.key===\'Enter\')fazerLogin()"></div>'+
    '<div class="form-group"><label>Senha</label><input type="password" id="loginPass" placeholder="Sua senha" onkeydown="if(event.key===\'Enter\')fazerLogin()"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="fazerLogin()">Entrar</button>'+
    '<div class="login-links"><a onclick="showEsqueciSenha()">Esqueci minha senha</a></div>'+
    '<div class="login-links">Ainda não tem conta? <a onclick="showCadastro()">Cadastrar meu hotel</a></div>';
  setTimeout(function(){var e=document.getElementById("loginEmail");if(e)e.focus();},50);
}

// --- ESQUECI MINHA SENHA (envia link de recuperacao por e-mail) ---
export function showEsqueciSenha(){
  var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";
  document.body.classList.remove("logged");
  document.getElementById("loginContent").innerHTML=
    '<h3 style="text-align:center;margin-bottom:6px;color:var(--text)">Recuperar senha</h3>'+
    '<p style="text-align:center;color:var(--text-mute);font-size:14px;margin-bottom:18px">Informe seu e-mail. Enviaremos um link para você criar uma nova senha.</p>'+
    '<div class="form-group"><label>E-mail</label><input type="email" id="resetEmail" placeholder="seu@email.com" onkeydown="if(event.key===\'Enter\')enviarResetSenha()"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="enviarResetSenha()">Enviar link de recuperação</button>'+
    '<div class="login-links"><a onclick="showLogin()">Voltar ao login</a></div>';
  setTimeout(function(){var e=document.getElementById("resetEmail");if(e)e.focus();},50);
}

export async function enviarResetSenha(){
  var em=document.getElementById("resetEmail");
  if(!em||!em.value.trim())return erroLogin("Informe seu e-mail.");
  var btn=document.querySelector("#loginContent .btn-primary");
  if(btn){btn.disabled=true;btn.textContent="Enviando...";}
  var { error } = await supabase.auth.resetPasswordForEmail(em.value.trim(), {
    redirectTo: location.origin + "/app#recuperar"
  });
  if(btn){btn.disabled=false;btn.textContent="Enviar link de recuperação";}
  if(error)return erroLogin(error.message||"Não foi possível enviar o e-mail.");
  document.getElementById("loginContent").innerHTML=
    '<div class="confirm-ico" style="margin:8px auto 16px">✉️</div>'+
    '<h3 style="text-align:center;color:var(--text);margin-bottom:8px">Verifique seu e-mail</h3>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:14px;line-height:1.5;margin-bottom:18px">Se existir uma conta com <b>'+esc(em.value.trim())+'</b>, enviamos um link para redefinir a senha. O link expira em 1 hora.</p>'+
    '<div class="login-links"><a onclick="showLogin()">Voltar ao login</a></div>';
}

// --- DEFINIR NOVA SENHA (apos clicar no link de recuperacao) ---
// O Supabase abre o app com uma sessao temporaria de "recovery"; aqui coletamos a nova senha.
export function showDefinirNovaSenha(){
  var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";
  document.body.classList.remove("logged");
  document.getElementById("loginContent").innerHTML=
    '<h3 style="text-align:center;margin-bottom:6px;color:var(--text)">Criar nova senha</h3>'+
    '<p style="text-align:center;color:var(--text-mute);font-size:14px;margin-bottom:18px">Defina a nova senha da sua conta.</p>'+
    '<div class="form-group"><label>Nova senha</label><input type="password" id="novaSenha1" placeholder="Mínimo 6 caracteres" onkeydown="if(event.key===\'Enter\')salvarNovaSenhaRecovery()"></div>'+
    '<div class="form-group"><label>Confirmar nova senha</label><input type="password" id="novaSenha2" placeholder="Repita a senha" onkeydown="if(event.key===\'Enter\')salvarNovaSenhaRecovery()"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="salvarNovaSenhaRecovery()">Salvar nova senha</button>';
  setTimeout(function(){var e=document.getElementById("novaSenha1");if(e)e.focus();},50);
}

export async function salvarNovaSenhaRecovery(){
  var p1=document.getElementById("novaSenha1"),p2=document.getElementById("novaSenha2");
  if(!p1||!p1.value||!p2||!p2.value)return erroLogin("Preencha os dois campos de senha.");
  if(p1.value.length<6)return erroLogin("A senha deve ter ao menos 6 caracteres.");
  if(p1.value!==p2.value)return erroLogin("As senhas não coincidem.");
  var { data, error } = await supabase.auth.updateUser({ password: p1.value });
  if(error)return erroLogin(traduzErro(error.message));
  // limpa o hash de recuperacao e entra normalmente
  window.location.hash = "";
  st("Senha alterada com sucesso!","success");
  var user = data && data.user;
  if(user) await aposAutenticar(user);
  else showLogin();
}

export function showCadastro(){
  document.getElementById("loginContent").innerHTML=
    '<h3 style="text-align:center;margin-bottom:16px;color:var(--text)">Cadastrar Hotel</h3>'+
    '<div class="form-group"><label>Nome do Hotel</label><input type="text" id="cadHotel" placeholder="Hotel Beira-Mar" onkeydown="if(event.key===\'Enter\')fazerCadastro()"></div>'+
    '<div class="form-group"><label>Seu Nome</label><input type="text" id="cadNome" placeholder="Seu nome" onkeydown="if(event.key===\'Enter\')fazerCadastro()"></div>'+
    '<div class="form-group"><label>E-mail</label><input type="email" id="cadEmail" placeholder="seu@email.com" onkeydown="if(event.key===\'Enter\')fazerCadastro()"></div>'+
    '<div class="form-group"><label>Senha</label><input type="password" id="cadSenha" placeholder="Mínimo 6 caracteres" onkeydown="if(event.key===\'Enter\')fazerCadastro()"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="fazerCadastro()">Criar conta e começar</button>'+
    '<div class="login-links">Já tem conta? <a onclick="showLogin()">Fazer login</a></div>';
}

export function hideLogin(){
  document.getElementById("loginOverlay").style.display="none";
  document.body.classList.add("logged");
  if(usuarioAtual){document.getElementById("userInfo").innerHTML=esc(usuarioAtual.nome)+' &nbsp; Sair';filtrarSidebar();atualizarBadgeNovidade();if(temNovidade()){setTimeout(function(){showChangelog(true)},400)}}
}

function traduzErro(msg){
  msg = String(msg||"");
  var m = msg.toLowerCase();
  if(m.indexOf("already registered")>=0 || m.indexOf("already been registered")>=0) return "Este e-mail já possui conta. Clique em \"Fazer login\".";
  if(m.indexOf("invalid login")>=0 || m.indexOf("invalid credentials")>=0) return "E-mail ou senha incorretos.";
  if(m.indexOf("password should be at least")>=0) return "A senha deve ter ao menos 6 caracteres.";
  if(m.indexOf("unable to validate email")>=0 || m.indexOf("invalid email")>=0) return "E-mail inválido.";
  if(m.indexOf("email not confirmed")>=0) return "Confirme seu e-mail antes de entrar.";
  if(m.indexOf("rate limit")>=0 || m.indexOf("too many")>=0) return "Muitas tentativas. Aguarde um instante e tente de novo.";
  return msg;
}
function erroLogin(msg){var e=document.getElementById("loginError");if(e){e.textContent=traduzErro(msg);e.style.display="block"}}

// --- LOGIN ---
export async function fazerLogin(){
  var em=document.getElementById("loginEmail"),pw=document.getElementById("loginPass");
  if(!em||!pw||!em.value||!pw.value)return erroLogin("Preencha e-mail e senha.");
  var { data, error } = await supabase.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
  if(error)return erroLogin("E-mail ou senha incorretos.");
  await aposAutenticar(data.user);
}

// --- CADASTRO (onboarding) ---
export async function fazerCadastro(){
  var hn=document.getElementById("cadHotel"),nm=document.getElementById("cadNome"),em=document.getElementById("cadEmail"),pw=document.getElementById("cadSenha");
  if(!hn.value.trim()||!nm.value.trim()||!em.value.trim()||!pw.value)return erroLogin("Preencha todos os campos.");
  if(pw.value.length<6)return erroLogin("A senha deve ter ao menos 6 caracteres.");
  var { data, error } = await supabase.auth.signUp({ email: em.value.trim(), password: pw.value });
  if(error)return erroLogin(error.message||"Não foi possível criar a conta.");
  // Garante sessão (caso confirmacao de e-mail esteja desativada, já vem logado)
  if(!data.session){
    var log = await supabase.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
    if(log.error)return erroLogin("Conta criada. Confirme o e-mail e faça login.");
    data.user = log.data.user;
  }
  // Cria hotel + perfil admin via função RPC
  var rpc = await supabase.rpc("criar_hotel_e_perfil", { p_hotel_nome: hn.value.trim(), p_admin_nome: nm.value.trim() });
  if(rpc.error)return erroLogin("Erro ao criar hotel: "+rpc.error.message);
  var hotelId = rpc.data;
  // Hotel novo comeca limpo: cliente cadastra seus proprios quartos, tipos e servicos.
  await aposAutenticar(data.user);
}

// Comum a login e cadastro: carrega perfil + dados e entra
async function aposAutenticar(user){
  var { data: perfil, error } = await supabase.from("perfis").select("*").eq("id", user.id).single();
  if(error||!perfil){ st("Perfil não encontrado. Contate o suporte.","error"); await supabase.auth.signOut(); return; }
  usuarioAtual = { id:user.id, nome:perfil.nome, papel:perfil.papel, turno:perfil.turno||"", hotelId:perfil.hotel_id, isOwner:perfil.is_owner===true, permissoes:(perfil.permissoes||null) };
  // Bloqueio automatico: hotel suspenso ou plano vencido (dono sempre entra)
  if(!usuarioAtual.isOwner){
    var liberado = await hotelLiberado();
    if(!liberado){ mostrarBloqueio(); return; }
  }
  setHotelId(perfil.hotel_id);
  await carregarTudo(perfil.hotel_id);
  registrarAcesso(); // marca ultimo acesso (nao bloqueia o fluxo)
  try{ iniciarPresenca(usuarioAtual.id, usuarioAtual.hotelId); }catch(e){} // presenca em tempo real
  hideLogin();
  window.location.hash = "#d";
  renderPage();
}

async function hotelLiberado(){
  try{ var { data } = await supabase.rpc("meu_hotel_liberado"); return data!==false; }
  catch(e){ return true; }
}

function mostrarBloqueio(){
  var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";
  document.body.classList.remove("logged");
  document.getElementById("loginContent").innerHTML=
    '<div class="confirm-ico warning" style="margin:8px auto 16px">🔒</div>'+
    '<h3 style="text-align:center;color:var(--text);margin-bottom:8px">Acesso temporariamente bloqueado</h3>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:14px;line-height:1.5;margin-bottom:18px">Sua assinatura está vencida ou o acesso foi suspenso. Regularize para voltar a usar o HospedaPrime.</p>'+
    '<a class="btn btn-primary" style="width:100%;justify-content:center" href="https://wa.me/5511922144143?text=Ola,%20quero%20regularizar%20a%20assinatura%20do%20HospedaPrime" target="_blank" rel="noopener">Falar no WhatsApp</a>'+
    '<div class="login-links" style="margin-top:14px"><a onclick="logout()">Sair</a></div>';
}

export async function logout(){
  try{ await pararPresenca(); }catch(e){} // sai da presenca antes de deslogar
  await supabase.auth.signOut();
  usuarioAtual = null;
  document.getElementById("userInfo").innerHTML="";
  window.location.hash="#d";
  showLogin();
}

// Restaura sessão ao abrir o app (se já estava logado).
// Blindado: qualquer erro (rede, dados) retorna false para cair no login, em vez de travar a tela.
export async function restaurarSessao(){
  try{
    var { data } = await supabase.auth.getSession();
    if(!(data && data.session)) return false;
    var user = data.session.user;
    var { data: perfil, error: errPerfil } = await supabase.from("perfis").select("*").eq("id", user.id).single();
    if(errPerfil || !perfil) return false;
    usuarioAtual = { id:user.id, nome:perfil.nome, papel:perfil.papel, turno:perfil.turno||"", hotelId:perfil.hotel_id, isOwner:perfil.is_owner===true, permissoes:(perfil.permissoes||null) };
    if(!usuarioAtual.isOwner){
      var liberado = await hotelLiberado();
      if(!liberado){ mostrarBloqueio(); return false; }
    }
    setHotelId(perfil.hotel_id);
    await carregarTudo(perfil.hotel_id);
    registrarAcesso(); // marca ultimo acesso (nao bloqueia o fluxo)
    try{ iniciarPresenca(usuarioAtual.id, usuarioAtual.hotelId); }catch(e){} // presenca em tempo real
    return true;
  }catch(e){
    console.error("Erro ao restaurar sessao:", e);
    return false;
  }
}

// --- ACEITAR CONVITE (multi-usuário por link) ---
var conviteToken = null;
export async function iniciarAceiteConvite(token){
  conviteToken = token;
  var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";
  var { data } = await supabase.rpc("buscar_convite", { p_token: token });
  var info = data && data[0];
  if(!info || !info.valido){
    document.getElementById("loginContent").innerHTML='<h3 style="text-align:center;color:var(--text)">Convite inválido</h3><p style="text-align:center;color:var(--text-mute);font-size:14px;margin-top:8px">Este convite não existe ou já foi utilizado.</p><div class="login-links" style="margin-top:16px"><a onclick="showLogin()">Ir para o login</a></div>';
    return;
  }
  document.getElementById("loginContent").innerHTML=
    '<h3 style="text-align:center;margin-bottom:6px;color:var(--text)">Você foi convidado</h3>'+
    '<p style="text-align:center;color:var(--text-mute);font-size:14px;margin-bottom:18px">Para trabalhar no <b>'+esc(info.hotel_nome)+'</b> como '+esc(info.papel)+'</p>'+
    '<div class="form-group"><label>Seu e-mail</label><input type="email" id="cvEmail" placeholder="seu@email.com" onkeydown="if(event.key===\'Enter\')finalizarConvite()"></div>'+
    '<div class="form-group"><label>Crie uma senha</label><input type="password" id="cvSenha" placeholder="Mínimo 6 caracteres" onkeydown="if(event.key===\'Enter\')finalizarConvite()"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="finalizarConvite()">Aceitar convite e entrar</button>';
}
export async function finalizarConvite(){
  var em=document.getElementById("cvEmail"),pw=document.getElementById("cvSenha");
  if(!em.value.trim()||!pw.value)return erroLogin("Preencha e-mail e senha.");
  if(pw.value.length<6)return erroLogin("A senha deve ter ao menos 6 caracteres.");
  var { data, error } = await supabase.auth.signUp({ email: em.value.trim(), password: pw.value });
  if(error)return erroLogin(error.message||"Não foi possível criar a conta.");
  if(!data.session){
    var log = await supabase.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
    if(log.error)return erroLogin("Conta criada. Confirme o e-mail e acesse o link novamente.");
    data.user = log.data.user;
  }
  var rpc = await supabase.rpc("aceitar_convite", { p_token: conviteToken });
  if(rpc.error)return erroLogin("Erro ao aceitar convite: "+rpc.error.message);
  window.location.hash = "";
  await aposAutenticar(data.user);
}

export function getTurnoAtual(){var h=new Date().getHours();if(h>=6&&h<14)return"Manha";if(h>=14&&h<22)return"Tarde";return"Noite"}

// ===== PERMISSOES (fonte de verdade unica) =====
// Modulos configuraveis por operador (id + rotulo). 'd' (Painel) e sempre liberado, nao entra aqui.
export var MODULOS=[
  {id:"r",nome:"Reservas"},{id:"h",nome:"Hóspedes"},{id:"q",nome:"Quartos"},
  {id:"ci",nome:"Check-in"},{id:"co",nome:"Check-out"},{id:"f",nome:"Financeiro"},
  {id:"s",nome:"Serviços"},{id:"gov",nome:"Limpeza"},{id:"fu",nome:"Funcionários"},
  {id:"rl",nome:"Relatórios"},{id:"cg",nome:"Configurações"}
];
// Padrao por papel. '*' = tudo. Objeto = acesso por modulo (true / false / "view").
// Dashboard ('d') sempre true implicitamente.
export var PADRAO_PERMISSOES={
  admin:"*",
  operador:{r:true,h:true,q:true,ci:true,co:true,f:true,s:true,gov:true,fu:false,rl:"view",cg:false},
  recepcao:{r:true,h:true,q:"view",ci:true,co:true,f:false,s:true,gov:true,fu:false,rl:false,cg:false}
};

// Permissao efetiva de um usuario para um modulo (resolve owner/admin, turno, override e padrao do papel).
// Retorna true | false | "view".
export function permModulo(u, m){
  if(!u) return false;
  if(m==="d") return true;                         // painel sempre
  if(u.isOwner || u.papel==="admin") return true;  // dono e admin veem tudo (nunca se autotravar)
  // fora do turno: so o painel
  if(u.turno && u.turno!=="" && u.turno!==getTurnoAtual()) return false;
  // override por usuario (jsonb permissoes) tem prioridade sobre o padrao do papel
  if(u.permissoes && Object.prototype.hasOwnProperty.call(u.permissoes, m)) return u.permissoes[m];
  var padrao=PADRAO_PERMISSOES[u.papel];
  if(padrao==="*") return true;
  if(padrao && Object.prototype.hasOwnProperty.call(padrao, m)) return padrao[m];
  return false;
}

export function hasAccess(m){ return permModulo(getCurrentUser(), m); }

export function filtrarSidebar(){var u=getCurrentUser();if(!u)return;
  var ta=getTurnoAtual(),foraTurno=u.turno&&u.turno!==""&&u.turno!==ta;
  // aplica visibilidade a um conjunto de links (sidebar, bottom-nav, mais-menu)
  function aplicar(sel, attr){
    document.querySelectorAll(sel).forEach(function(a){
      var mod=attr==="data-nav"?a.getAttribute("data-nav"):(a.getAttribute("href")||"").slice(1);
      if(!mod||mod==="admin")return;
      var perm=permModulo(u, mod);
      // com permissao: remove o display inline e deixa o CSS decidir (preserva .bn-desktop no mobile);
      // sem permissao: esconde de vez.
      a.style.display=perm?"":"none";
    });
  }
  aplicar(".sidebar-nav a","href");
  aplicar(".bottom-nav .bn-item[data-nav]","data-nav");
  aplicar("#maisMenu a.mais-item","href");
  var ol=document.getElementById("ownerLink");if(ol)ol.style.display=u.isOwner?"flex":"none";
  var olm=document.getElementById("ownerLinkMais");if(olm)olm.style.display=u.isOwner?"flex":"none";
  if(foraTurno)document.getElementById("userInfo").innerHTML=esc(u.nome)+' <span style="color:var(--warn);font-size:11px">(Fora do turno - '+u.turno+')</span> &nbsp; Sair'}

