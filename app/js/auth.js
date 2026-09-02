// Autenticação real via Supabase + onboarding de hotel (multi-tenant)
import { esc } from "./utils.js";
import { supabase } from "./supabase.js";
import { St, carregarTudo, setHotelId } from "./store.js";
import { st } from "./ui.js";
import { showChangelog, atualizarBadgeNovidade, temNovidade } from "./changelog.js";
import { renderPage } from "./nav.js";

var usuarioAtual = null; // { id, nome, papel, hotelId }

export function getCurrentUser(){ return usuarioAtual; }

// --- TELAS DE LOGIN / CADASTRO ---
export function showLogin(){
  var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";
  document.getElementById("loginContent").innerHTML=
    '<div class="form-group"><label>E-mail</label><input type="email" id="loginEmail" placeholder="seu@email.com"></div>'+
    '<div class="form-group"><label>Senha</label><input type="password" id="loginPass" placeholder="Sua senha"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="fazerLogin()">Entrar</button>'+
    '<div class="login-links">Ainda nao tem conta? <a onclick="showCadastro()">Cadastrar meu hotel</a></div>';
}

export function showCadastro(){
  document.getElementById("loginContent").innerHTML=
    '<h3 style="text-align:center;margin-bottom:16px;color:var(--text)">Cadastrar Hotel</h3>'+
    '<div class="form-group"><label>Nome do Hotel</label><input type="text" id="cadHotel" placeholder="Hotel Beira-Mar"></div>'+
    '<div class="form-group"><label>Seu Nome</label><input type="text" id="cadNome" placeholder="Seu nome"></div>'+
    '<div class="form-group"><label>E-mail</label><input type="email" id="cadEmail" placeholder="seu@email.com"></div>'+
    '<div class="form-group"><label>Senha</label><input type="password" id="cadSenha" placeholder="Minimo 6 caracteres"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="fazerCadastro()">Criar conta e comecar</button>'+
    '<div class="login-links">Ja tem conta? <a onclick="showLogin()">Fazer login</a></div>';
}

export function hideLogin(){
  document.getElementById("loginOverlay").style.display="none";
  if(usuarioAtual){document.getElementById("userInfo").innerHTML=esc(usuarioAtual.nome)+' &nbsp; Sair';filtrarSidebar();atualizarBadgeNovidade();if(temNovidade()){setTimeout(function(){showChangelog(true)},400)}}
}

function traduzErro(msg){
  msg = String(msg||"");
  var m = msg.toLowerCase();
  if(m.indexOf("already registered")>=0 || m.indexOf("already been registered")>=0) return "Este e-mail ja possui conta. Clique em \"Fazer login\".";
  if(m.indexOf("invalid login")>=0 || m.indexOf("invalid credentials")>=0) return "E-mail ou senha incorretos.";
  if(m.indexOf("password should be at least")>=0) return "A senha deve ter ao menos 6 caracteres.";
  if(m.indexOf("unable to validate email")>=0 || m.indexOf("invalid email")>=0) return "E-mail invalido.";
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
  if(error)return erroLogin(error.message||"Nao foi possivel criar a conta.");
  // Garante sessão (caso confirmacao de e-mail esteja desativada, já vem logado)
  if(!data.session){
    var log = await supabase.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
    if(log.error)return erroLogin("Conta criada. Confirme o e-mail e faca login.");
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
  if(error||!perfil){ st("Perfil nao encontrado. Contate o suporte.","error"); await supabase.auth.signOut(); return; }
  usuarioAtual = { id:user.id, nome:perfil.nome, papel:perfil.papel, turno:perfil.turno||"", hotelId:perfil.hotel_id, isOwner:perfil.is_owner===true };
  // Bloqueio automatico: hotel suspenso ou plano vencido (dono sempre entra)
  if(!usuarioAtual.isOwner){
    var liberado = await hotelLiberado();
    if(!liberado){ mostrarBloqueio(); return; }
  }
  setHotelId(perfil.hotel_id);
  await carregarTudo(perfil.hotel_id);
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
  document.getElementById("loginContent").innerHTML=
    '<div class="confirm-ico warning" style="margin:8px auto 16px">🔒</div>'+
    '<h3 style="text-align:center;color:var(--text);margin-bottom:8px">Acesso temporariamente bloqueado</h3>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:14px;line-height:1.5;margin-bottom:18px">Sua assinatura esta vencida ou o acesso foi suspenso. Regularize para voltar a usar o HospedaPrime.</p>'+
    '<a class="btn btn-primary" style="width:100%;justify-content:center" href="https://wa.me/5511922144143?text=Ola,%20quero%20regularizar%20a%20assinatura%20do%20HospedaPrime" target="_blank" rel="noopener">Falar no WhatsApp</a>'+
    '<div class="login-links" style="margin-top:14px"><a onclick="logout()">Sair</a></div>';
}

export async function logout(){
  await supabase.auth.signOut();
  usuarioAtual = null;
  document.getElementById("userInfo").innerHTML="";
  window.location.hash="#d";
  showLogin();
}

// Restaura sessão ao abrir o app (se já estava logado)
export async function restaurarSessao(){
  var { data } = await supabase.auth.getSession();
  if(data && data.session){
    var user = data.session.user;
    var { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).single();
    if(perfil){
      usuarioAtual = { id:user.id, nome:perfil.nome, papel:perfil.papel, turno:perfil.turno||"", hotelId:perfil.hotel_id, isOwner:perfil.is_owner===true };
      if(!usuarioAtual.isOwner){
        var liberado = await hotelLiberado();
        if(!liberado){ mostrarBloqueio(); return false; }
      }
      setHotelId(perfil.hotel_id);
      await carregarTudo(perfil.hotel_id);
      return true;
    }
  }
  return false;
}

// --- ACEITAR CONVITE (multi-usuário por link) ---
var conviteToken = null;
export async function iniciarAceiteConvite(token){
  conviteToken = token;
  var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";
  var { data } = await supabase.rpc("buscar_convite", { p_token: token });
  var info = data && data[0];
  if(!info || !info.valido){
    document.getElementById("loginContent").innerHTML='<h3 style="text-align:center;color:var(--text)">Convite invalido</h3><p style="text-align:center;color:var(--text-mute);font-size:14px;margin-top:8px">Este convite nao existe ou ja foi utilizado.</p><div class="login-links" style="margin-top:16px"><a onclick="showLogin()">Ir para o login</a></div>';
    return;
  }
  document.getElementById("loginContent").innerHTML=
    '<h3 style="text-align:center;margin-bottom:6px;color:var(--text)">Voce foi convidado</h3>'+
    '<p style="text-align:center;color:var(--text-mute);font-size:14px;margin-bottom:18px">Para trabalhar no <b>'+esc(info.hotel_nome)+'</b> como '+esc(info.papel)+'</p>'+
    '<div class="form-group"><label>Seu e-mail</label><input type="email" id="cvEmail" placeholder="seu@email.com"></div>'+
    '<div class="form-group"><label>Crie uma senha</label><input type="password" id="cvSenha" placeholder="Minimo 6 caracteres"></div>'+
    '<div class="login-error" id="loginError"></div>'+
    '<button class="btn btn-primary" onclick="finalizarConvite()">Aceitar convite e entrar</button>';
}
export async function finalizarConvite(){
  var em=document.getElementById("cvEmail"),pw=document.getElementById("cvSenha");
  if(!em.value.trim()||!pw.value)return erroLogin("Preencha e-mail e senha.");
  if(pw.value.length<6)return erroLogin("A senha deve ter ao menos 6 caracteres.");
  var { data, error } = await supabase.auth.signUp({ email: em.value.trim(), password: pw.value });
  if(error)return erroLogin(error.message||"Nao foi possivel criar a conta.");
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
export function hasAccess(m){var u=getCurrentUser();if(!u)return false;var t=u.papel;
if(t==="admin")return true;
if(u.turno&&u.turno!==""&&u.turno!==getTurnoAtual()){if(m==="d")return true;return false}
if(t==="operador")return m!=="fu"&&m!=="cg";
if(t==="recepcao"){if(m==="f"||m==="fu"||m==="cg"||m==="rl")return false;if(m==="q")return"view";return true}
return false}
export function filtrarSidebar(){var u=getCurrentUser();if(!u)return;
var ta=getTurnoAtual(),foraTurno=u.turno&&u.turno!==""&&u.turno!==ta;
var acessos={admin:true,operador:{d:true,r:true,h:true,q:true,ci:true,co:true,f:true,s:true,fu:false,rl:"view",cg:false},recepcao:{d:true,r:true,h:true,q:"view",ci:true,co:true,f:false,s:true,fu:false,rl:false,cg:false}};
var perm=foraTurno?{d:true}:acessos[u.papel];
document.querySelectorAll(".sidebar-nav a").forEach(function(a){var mod=a.getAttribute("href").slice(1);if(mod==="admin")return;if(perm===true||perm[mod])a.style.display="flex";else a.style.display="none"});
var ol=document.getElementById("ownerLink");if(ol)ol.style.display=u.isOwner?"flex":"none";
var olm=document.getElementById("ownerLinkMais");if(olm)olm.style.display=u.isOwner?"flex":"none";
if(foraTurno)document.getElementById("userInfo").innerHTML=esc(u.nome)+' <span style="color:#f39c12;font-size:11px">(Fora do turno - '+u.turno+')</span> &nbsp; Sair'}
