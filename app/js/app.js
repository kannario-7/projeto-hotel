// Ponto de entrada da aplicação HospedaPrime (versão em nuvem / Supabase)
import * as utils from "./utils.js";
import { St } from "./store.js";
import * as ui from "./ui.js";
import * as changelog from "./changelog.js";
import * as auth from "./auth.js";
import * as nav from "./nav.js";
import * as dashboard from "./modules/dashboard.js";
import * as reservas from "./modules/reservas.js";
import * as hospedes from "./modules/hospedes.js";
import * as quartos from "./modules/quartos.js";
import * as checkin from "./modules/checkin.js";
import * as checkout from "./modules/checkout.js";
import * as financeiro from "./modules/financeiro.js";
import * as servicos from "./modules/servicos.js";
import * as funcionarios from "./modules/funcionarios.js";
import * as governanca from "./modules/governanca.js";
import * as relatorios from "./modules/relatorios.js";
import * as config from "./modules/config.js";
import * as admin from "./modules/admin.js";
import * as usuarios from "./modules/usuarios.js";
import * as impressao from "./modules/impressao.js";
import * as tema from "./modules/tema.js";

// Expõe funções no escopo global para os onclick inline do HTML
function expose(mod){Object.keys(mod).forEach(function(k){if(typeof mod[k]==="function")window[k]=mod[k]})}
[utils,ui,changelog,auth,nav,dashboard,reservas,hospedes,quartos,checkin,checkout,financeiro,servicos,funcionarios,governanca,relatorios,config,admin,usuarios,impressao,tema].forEach(expose);
window.St=St;

// Boot assíncrono
ui.initModalOverlay();
changelog.aplicarVersaoUI();
tema.aplicarTema();

// Listeners de navegação
document.querySelectorAll(".sidebar-nav a").forEach(function(a){a.addEventListener("click",function(){setTimeout(nav.closeSidebar,50)})});
document.addEventListener("click",function(e){var m=document.getElementById("maisMenu");if(m&&m.classList.contains("show")&&!m.contains(e.target)&&!e.target.closest(".bn-item")){m.classList.remove("show")}});
document.querySelectorAll("#maisMenu a.mais-item").forEach(function(a){a.addEventListener("click",nav.fecharMaisMenu)});
window.addEventListener("hashchange",function(){nav.renderPage();nav.closeSidebar()});

// Acessibilidade das abas (.tab sao <div> recriados dinamicamente):
// delegacao global torna-as focaveis (tabindex/role) e ativaveis por teclado (Enter/Espaco).
document.addEventListener("keydown",function(e){
  var t=e.target;
  if(t&&t.classList&&t.classList.contains("tab")&&(e.key==="Enter"||e.key===" "||e.key==="Spacebar")){
    e.preventDefault(); t.click();
  }
});
// Marca as abas (.tab) com atributos de acessibilidade assim que aparecem no DOM.
// Como as telas trocam innerHTML, um MutationObserver cobre todas as tabs (novas e recriadas).
function marcarTabsA11y(raiz){
  (raiz||document).querySelectorAll(".tab").forEach(function(el){
    if(!el.hasAttribute("tabindex"))el.setAttribute("tabindex","0");
    if(!el.hasAttribute("role"))el.setAttribute("role","tab");
    el.setAttribute("aria-selected", el.classList.contains("active")?"true":"false");
  });
}
var _obsA11y=new MutationObserver(function(muts){
  for(var i=0;i<muts.length;i++){ if(muts[i].addedNodes&&muts[i].addedNodes.length){ marcarTabsA11y(document); break; } }
});
_obsA11y.observe(document.body,{childList:true,subtree:true});
marcarTabsA11y(document);

// Boot: trata convite -> senão restaura sessão
var hash = window.location.hash || "";
if(hash.indexOf("#convite=")===0){
  auth.iniciarAceiteConvite(hash.slice("#convite=".length));
} else {
  auth.restaurarSessao().then(function(logado){
    if(logado){ auth.hideLogin(); nav.renderPage(); }
    else { auth.showLogin(); }
  }).catch(function(e){ console.error("Boot:", e); auth.showLogin(); });
}
