// Módulo: Configurações
import { esc, fmtC } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";
import { renderUsuariosHotel } from "./usuarios.js";

export function renderConfig(){var el=document.getElementById("pageContent");
var config=St.gc();
el.innerHTML='<div class="page-header"><div><h2>Configuracoes</h2><p>Configurar dados do hotel e sistema</p></div></div>'+
'<div class="tabs">'+
'<div class="tab active" onclick="mudarConfigTab(this,\'hotel\')">Hotel</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'tp\')">Tipos de Quarto</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'pg\')">Pagamento</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'us\')">Usuarios</div>'+
'</div><div id="configContent">'+formConfigHotel(config)+'</div>';}

export function mudarConfigTab(tab,aba){tab.parentElement.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active")});tab.classList.add("active");
var config=St.gc(),tq=St.ga("tq"),html="";
if(aba==="us"){document.getElementById("configContent").innerHTML="";renderUsuariosHotel();return;}
if(aba==="hotel")html=formConfigHotel(config);
else if(aba==="tp")html=formConfigTipoQuarto(tq);
else if(aba==="pg")html=formConfigPagamento(config);
document.getElementById("configContent").innerHTML=html;}

function formConfigHotel(c){return'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Dados do Hotel</h3><div class="form-grid">'+
'<div class="form-group"><label>Nome do Hotel</label><input type="text" id="cfgNome" value="'+esc(c.hn||"")+'"></div>'+
'<div class="form-group"><label>CNPJ</label><input type="text" id="cfgCnpj" value="'+esc(c.hcnpj||"")+'"></div>'+
'<div class="form-group"><label>Telefone</label><input type="text" id="cfgTel" value="'+esc(c.htel||"")+'"></div>'+
'<div class="form-group"><label>Email</label><input type="email" id="cfgEmail" value="'+esc(c.hemail||"")+'"></div>'+
'<div class="form-group"><label>Horario Check-in</label><input type="time" id="cfgHci" value="'+esc(c.hci||"14:00")+'"></div>'+
'<div class="form-group"><label>Horario Check-out</label><input type="time" id="cfgHco" value="'+esc(c.hco||"12:00")+'"></div>'+
'<div class="form-group"><label>Taxa de Servico (%)</label><input type="number" id="cfgTax" value="'+(c.tax||10)+'" min="0" max="100"></div>'+
'</div><div class="form-actions"><button class="btn btn-primary" onclick="salvarConfigHotel()">Salvar</button></div></div>'}

export function salvarConfigHotel(){var cfg=St.gc();
var n=document.getElementById("cfgNome"),c=document.getElementById("cfgCnpj"),t=document.getElementById("cfgTel"),e=document.getElementById("cfgEmail");
var hci=document.getElementById("cfgHci"),hco=document.getElementById("cfgHco"),tax=document.getElementById("cfgTax");
cfg.hn=n?n.value:"Hotel";cfg.hcnpj=c?c.value:"";cfg.htel=t?t.value:"";cfg.hemail=e?e.value:"";
cfg.hci=hci?hci.value:"14:00";cfg.hco=hco?hco.value:"12:00";cfg.tax=parseFloat(tax?tax.value:10);
St.sc(cfg);st("Configuracoes salvas!","success");}

function formConfigTipoQuarto(tq){var html='<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Tipos de Quarto</h3>';
if(tq.length){html+='<table><tr><th>Nome</th><th>Capacidade</th><th>Preco Diaria</th><th>Acoes</th></tr>'+
tq.map(function(t){return'<tr><td>'+esc(t.nome)+'</td><td>'+t.capacidade+' pessoa(s)</td><td>'+fmtC(t.precoDiaria)+'</td><td><button class="btn btn-sm btn-primary" onclick="editarTipoQuarto(\''+t.id+'\')">Editar</button></td></tr>'}).join('')+'</table>';}
html+='<div class="form-actions"><button class="btn btn-primary" onclick="showNovoTipoQuarto()">+ Novo Tipo</button></div></div>';return html;}

export function showNovoTipoQuarto(){sm("Novo Tipo de Quarto",'<div class="form-group"><label>Nome</label><input type="text" id="tqfNome"></div>'+
'<div class="form-group"><label>Capacidade (pessoas)</label><input type="number" id="tqfCap" value="2" min="1"></div>'+
'<div class="form-group"><label>Preco da Diaria (R$)</label><input type="number" id="tqfPreco" step="0.01" min="0"></div>'+
'<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarTipoQuarto()">Salvar</button></div>',"")}

export function editarTipoQuarto(id){var t=St.fi("tq",id);if(!t)return;
sm("Editar Tipo de Quarto",'<div class="form-group"><label>Nome</label><input type="text" id="tqfNome" value="'+esc(t.nome)+'"></div>'+
'<div class="form-group"><label>Capacidade (pessoas)</label><input type="number" id="tqfCap" value="'+t.capacidade+'" min="1"></div>'+
'<div class="form-group"><label>Preco da Diaria (R$)</label><input type="number" id="tqfPreco" step="0.01" min="0" value="'+(t.precoDiaria/100).toFixed(2)+'"></div>'+
'<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarTipoQuarto(\''+id+'\')">Salvar</button></div>',"")}

export function salvarTipoQuarto(id){var n=document.getElementById("tqfNome"),c=document.getElementById("tqfCap"),p=document.getElementById("tqfPreco");
if(!n||!n.value.trim())return st("Nome obrigatorio.","error"),false;
var dados={nome:n.value.trim(),capacidade:parseInt(c?c.value:2),precoDiaria:Math.round(parseFloat(p?p.value:0)*100),ativo:true};
if(id){St.up("tq",id,dados);st("Tipo atualizado!","success")}
else{St.in("tq",dados);st("Tipo cadastrado!","success")}
cm();renderConfig()}

function formConfigPagamento(c){return'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Formas de Pagamento</h3>'+
'<p style="color:var(--text-mute);margin-bottom:16px">Selecione as formas de pagamento aceitas pelo hotel:</p>'+
["dinheiro","cartao","debito","credito","pix","boleto","cheque"].map(function(p){return'<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-soft);cursor:pointer"><input type="checkbox" value="'+p+'" '+(c.pm&&c.pm.includes(p)?'checked':'')+' style="width:auto"> <span>'+esc(p.charAt(0).toUpperCase()+p.slice(1))+'</span></label>'}).join('')+
'<div class="form-actions"><button class="btn btn-primary" onclick="salvarFormasPagamento()">Salvar</button></div></div>'+
'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Dados do Sistema</h3>'+
'<button class="btn btn-danger" onclick="restaurarDados()">Restaurar Dados Padrao</button>'+
'<p style="color:var(--text-mute);font-size:12px;margin-top:8px">Isso apagara todos os dados e recriara os dados iniciais.</p></div>'}

export function salvarFormasPagamento(){var cfg=St.gc();cfg.pm=[];
document.querySelectorAll("#configContent input[type=checkbox]").forEach(function(cb){if(cb.checked)cfg.pm.push(cb.value)});
if(!cfg.pm.length)return st("Selecione ao menos uma forma.","error"),false;
St.sc(cfg);st("Formas de pagamento salvas!","success");}

export function restaurarDados(){st("Esta acao nao esta disponivel na versao em nuvem.","info")}
