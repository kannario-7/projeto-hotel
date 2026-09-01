// Autenticação e controle de acesso
import { esc } from "./utils.js";
import { St } from "./store.js";
import { st } from "./ui.js";
import { showChangelog, atualizarBadgeNovidade, temNovidade } from "./changelog.js";
import { renderPage } from "./nav.js";

export function showLogin(){var overlay=document.getElementById("loginOverlay");overlay.style.display="flex";var usuarios=St.ga("u");if(!usuarios.length){document.getElementById("loginContent").innerHTML='<h3 style="text-align:center;margin-bottom:16px;color:var(--text)">Primeiro Acesso</h3><p style="text-align:center;color:var(--text-mute);font-size:14px;margin-bottom:20px">Cadastre o usuario administrador do sistema</p><div class="form-group"><label>Nome</label><input type="text" id="sAdmNome" placeholder="Admin"></div><div class="form-group"><label>Login</label><input type="text" id="sAdmLogin" placeholder="admin"></div><div class="form-group"><label>Senha</label><input type="password" id="sAdmSenha" placeholder="1234"></div><div class="form-group"><label>Confirmar Senha</label><input type="password" id="sAdmConf" placeholder="1234"></div><div class="login-error" id="loginError"></div><button class="btn btn-primary" onclick="setupAdmin()">Criar Administrador</button>';return}
document.getElementById("loginContent").innerHTML='<div class="form-group"><label>Usuario</label><input type="text" id="loginUser" value="admin"></div><div class="form-group"><label>Senha</label><input type="password" id="loginPass" value="1234"></div><div class="login-error" id="loginError"></div><button class="btn btn-primary" onclick="fazerLogin()">Entrar</button>';}
export function hideLogin(){document.getElementById("loginOverlay").style.display="none";var u=getCurrentUser();if(u){document.getElementById("userInfo").innerHTML=esc(u.nome)+' &nbsp; Sair';filtrarSidebar();atualizarBadgeNovidade();if(temNovidade()){setTimeout(function(){showChangelog(true)},400)}}}
export function setupAdmin(){var n=document.getElementById("sAdmNome"),l=document.getElementById("sAdmLogin"),s=document.getElementById("sAdmSenha"),c=document.getElementById("sAdmConf");if(!n||!l||!s||!c)return;if(!n.value.trim()||!l.value.trim()||!s.value.trim())return document.getElementById("loginError").textContent="Preencha todos os campos.",document.getElementById("loginError").style.display="block";if(s.value!==c.value)return document.getElementById("loginError").textContent="Senhas nao conferem.",document.getElementById("loginError").style.display="block";St.in("u",{nome:n.value.trim(),login:l.value.trim(),senha:s.value,tipo:"admin",ativo:true});st("Administrador criado! Faca o login.","success");showLogin()}
export function showSetupAdminForce(){document.getElementById("loginContent").innerHTML='<h3 style="text-align:center;margin-bottom:16px;color:var(--text)">Novo Administrador</h3><div class="form-group"><label>Nome</label><input type="text" id="sAdmNome" placeholder="Admin"></div><div class="form-group"><label>Login</label><input type="text" id="sAdmLogin" placeholder="admin"></div><div class="form-group"><label>Senha</label><input type="password" id="sAdmSenha" placeholder="1234"></div><div class="form-group"><label>Confirmar Senha</label><input type="password" id="sAdmConf" placeholder="1234"></div><div class="login-error" id="loginError"></div><button class="btn btn-primary" onclick="setupAdmin()">Criar Administrador</button><div class="login-links"><a onclick="showLogin()">Voltar ao login</a></div>';}
export function fazerLogin(){var l=document.getElementById("loginUser"),s=document.getElementById("loginPass"),e=document.getElementById("loginError");if(!l||!s)return;var user=St.ga("u").find(function(u){return u.login===l.value&&u.senha===s.value&&u.ativo!==false});if(user){sessionStorage.setItem("hms_user",JSON.stringify(user));hideLogin();renderPage()}else{e.textContent="Usuario ou senha incorretos.";e.style.display="block"}}
export function logout(){sessionStorage.removeItem("hms_user");document.getElementById("userInfo").innerHTML="";window.location.hash="#d";showLogin()}
export function getCurrentUser(){try{return JSON.parse(sessionStorage.getItem("hms_user"))}catch(e){return null}}
export function getTurnoAtual(){var h=new Date().getHours();if(h>=6&&h<14)return"Manha";if(h>=14&&h<22)return"Tarde";return"Noite"}
export function hasAccess(m){var u=getCurrentUser();if(!u)return false;var t=u.tipo;
if(t==="admin")return true;
if(u.turno&&u.turno!==""&&u.turno!==getTurnoAtual()){if(m==="d")return true;return false}
if(t==="operador")return m!=="fu"&&m!=="cg";
if(t==="recepcao"){if(m==="f"||m==="fu"||m==="cg"||m==="rl")return false;if(m==="q")return"view";return true}
return false}
export function filtrarSidebar(){var u=getCurrentUser();if(!u)return;
var ta=getTurnoAtual(),foraTurno=u.turno&&u.turno!==""&&u.turno!==ta;
var acessos={admin:true,operador:{d:true,r:true,h:true,q:true,ci:true,co:true,f:true,s:true,fu:false,rl:"view",cg:false},recepcao:{d:true,r:true,h:true,q:"view",ci:true,co:true,f:false,s:true,fu:false,rl:false,cg:false}};
var perm=foraTurno?{d:true}:acessos[u.tipo];
document.querySelectorAll(".sidebar-nav a").forEach(function(a){var mod=a.getAttribute("href").slice(1);if(perm===true||perm[mod])a.style.display="flex";else a.style.display="none"});
if(foraTurno)document.getElementById("userInfo").innerHTML=esc(u.nome)+' <span style="color:#f39c12;font-size:11px">(Fora do turno - '+u.turno+')</span> &nbsp; Sair'}
