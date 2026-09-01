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
import * as relatorios from "./modules/relatorios.js";
import * as config from "./modules/config.js";

// Expõe funções no escopo global para os onclick inline do HTML
function expose(mod){Object.keys(mod).forEach(function(k){if(typeof mod[k]==="function")window[k]=mod[k]})}
[utils,ui,changelog,auth,nav,dashboard,reservas,hospedes,quartos,checkin,checkout,financeiro,servicos,funcionarios,relatorios,config].forEach(expose);
window.St=St;

// Boot assíncrono
ui.initModalOverlay();
changelog.aplicarVersaoUI();

// Listeners de navegação
document.querySelectorAll(".sidebar-nav a").forEach(function(a){a.addEventListener("click",function(){setTimeout(nav.closeSidebar,50)})});
document.addEventListener("click",function(e){var m=document.getElementById("maisMenu");if(m&&m.classList.contains("show")&&!m.contains(e.target)&&!e.target.closest(".bn-item")){m.classList.remove("show")}});
document.querySelectorAll("#maisMenu a.mais-item").forEach(function(a){a.addEventListener("click",nav.fecharMaisMenu)});
window.addEventListener("hashchange",function(){nav.renderPage();nav.closeSidebar()});

// Tenta restaurar sessão; se logado, entra; senão, mostra login
auth.restaurarSessao().then(function(logado){
  if(logado){ auth.hideLogin(); nav.renderPage(); }
  else { auth.showLogin(); }
});
