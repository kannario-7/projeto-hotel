// Tema claro/escuro. O tema claro e o padrao (:root). O escuro e aplicado
// via atributo data-theme="dark" no <html>. A escolha persiste em localStorage
// (chave hms_theme). Um script inline no <head> ja aplica o tema salvo antes do
// CSS carregar (evita flash); aqui cuidamos do toggle e da sincronia dos icones.

var CHAVE = "hms_theme";

// SVG de sol (tema claro ativo -> clicar vai pro escuro) e lua (escuro ativo).
var ICO_SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/></svg>';
var ICO_LUA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

export function temaAtual(){
  return document.documentElement.getAttribute("data-theme")==="dark" ? "dark" : "light";
}

// Sincroniza icone/rotulo dos botoes de toggle com o tema atual.
export function aplicarTema(){
  var escuro = temaAtual()==="dark";
  // botao da sidebar: mostra o icone do tema PARA O QUAL vai trocar
  var btn = document.getElementById("themeToggle");
  if(btn){ btn.innerHTML = escuro ? ICO_SOL : ICO_LUA; }
  // item do menu Mais
  var icoMais = document.getElementById("themeIcoMais");
  var lblMais = document.getElementById("themeLblMais");
  if(icoMais){ icoMais.innerHTML = escuro ? ICO_SOL : ICO_LUA; }
  if(lblMais){ lblMais.textContent = escuro ? "Modo claro" : "Modo escuro"; }
}

export function toggleTema(){
  var novo = temaAtual()==="dark" ? "light" : "dark";
  if(novo==="dark"){ document.documentElement.setAttribute("data-theme","dark"); }
  else { document.documentElement.removeAttribute("data-theme"); }
  try{ localStorage.setItem(CHAVE, novo); }catch(e){}
  aplicarTema();
}
