// Navegação e roteamento por hash
import { st } from "./ui.js";
import { hasAccess, filtrarSidebar } from "./auth.js";
import { renderDashboard } from "./modules/dashboard.js";
import { renderReservas } from "./modules/reservas.js";
import { renderHospedes } from "./modules/hospedes.js";
import { renderQuartos } from "./modules/quartos.js";
import { renderCheckin } from "./modules/checkin.js";
import { renderCheckout } from "./modules/checkout.js";
import { renderFinanceiro } from "./modules/financeiro.js";
import { renderServicos } from "./modules/servicos.js";
import { renderFuncionarios } from "./modules/funcionarios.js";
import { renderRelatorios } from "./modules/relatorios.js";
import { renderConfig } from "./modules/config.js";

export function navTo(h){window.location.hash=h}

export function renderPage(){var p=window.location.hash.slice(1)||"d";
document.querySelectorAll(".sidebar-nav a").forEach(function(a){a.classList.toggle("active",a.getAttribute("href")==="#"+p)});
document.querySelectorAll(".bn-item[data-nav]").forEach(function(a){a.classList.toggle("active",a.getAttribute("data-nav")===p)});
var acesso=hasAccess(p);if(acesso===false){st("Acesso negado a este modulo.","error");window.location.hash="d";return}
filtrarSidebar();
switch(p){
case"d":renderDashboard();break;
case"r":renderReservas();break;
case"h":renderHospedes();break;
case"q":renderQuartos();break;
case"ci":renderCheckin();break;
case"co":renderCheckout();break;
case"f":renderFinanceiro();break;
case"s":renderServicos();break;
case"fu":renderFuncionarios();break;
case"rl":renderRelatorios();break;
case"cg":renderConfig();break;
default:renderDashboard();}}

export function toggleSidebar(){document.querySelector(".sidebar").classList.toggle("show");document.getElementById("sidebarBackdrop").classList.toggle("show")}
export function closeSidebar(){document.querySelector(".sidebar").classList.remove("show");document.getElementById("sidebarBackdrop").classList.remove("show")}
export function fecharMaisMenu(){var m=document.getElementById("maisMenu");if(m)m.classList.remove("show")}
export function toggleMaisMenu(ev){if(ev)ev.stopPropagation();
var m=document.getElementById("maisMenu");if(!m)return;
if(m.classList.contains("show")){m.classList.remove("show");return}
var nav=document.getElementById("bottomNav");var r=nav.getBoundingClientRect();
var mob=window.matchMedia("(max-width:768px)").matches;
if(mob){m.style.left="12px";m.style.right="12px";m.style.bottom=(window.innerHeight-r.top+10)+"px"}
else{m.style.left="auto";m.style.right=(window.innerWidth-r.right)+"px";m.style.bottom=(window.innerHeight-r.top+10)+"px"}
m.classList.add("show")}
