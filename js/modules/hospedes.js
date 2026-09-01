// Módulo: Hóspedes
import { esc } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";

export function renderHospedes(){var el=document.getElementById("pageContent");
var hospedes=St.ga("h"),reservas=St.ga("r");
el.innerHTML='<div class="page-header"><div><h2>Hospedes</h2><p>Cadastro de hospedes</p></div><div class="page-header-actions"><button class="btn btn-primary" onclick="showNovoHospede()">+ Novo Hospede</button></div></div>';
el.innerHTML+='<div id="hospedesList">'+buildHospedesTable(hospedes,reservas)+'</div>';}

function buildHospedesTable(hospedes,reservas){if(!hospedes.length)return'<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum hospede cadastrado.</p>';
return'<table><tr><th>Nome</th><th>Documento</th><th>Telefone</th><th>Email</th><th>Total Reservas</th><th>Acoes</th></tr>'+
hospedes.map(function(h){var total=reservas.filter(function(r){return r.hospedeId===h.id}).length;return'<tr><td>'+esc(h.nome)+'</td><td>'+esc(h.documento||"-")+'</td><td>'+esc(h.telefone||"-")+'</td><td>'+esc(h.email||"-")+'</td><td>'+total+'</td><td><button class="btn btn-sm btn-primary" onclick="editarHospede(\''+h.id+'\')">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirHospede(\''+h.id+'\')">Excluir</button></td></tr>'}).join('')+'</table>'}

export function showNovoHospede(){sm("Novo Hospede",formHospede(null),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarHospede()">Salvar</button>')}
export function editarHospede(id){sm("Editar Hospede",formHospede(id),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarHospede(\''+id+'\')">Salvar</button>')}

function formHospede(id){var h=id?St.fi("h",id):null;
return'<div class="form-grid">'+
'<div class="form-group"><label>Nome Completo *</label><input type="text" id="hfNome" value="'+(h?esc(h.nome):'')+'" placeholder="Nome do hospede"></div>'+
'<div class="form-group"><label>CPF/ Documento</label><input type="text" id="hfDoc" value="'+(h?esc(h.documento||""):'')+'" placeholder="000.000.000-00"></div>'+
'<div class="form-group"><label>Telefone *</label><input type="text" id="hfTel" value="'+(h?esc(h.telefone||""):'')+'" placeholder="(11)99999-9999"></div>'+
'<div class="form-group"><label>Email</label><input type="email" id="hfEmail" value="'+(h?esc(h.email||""):'')+'" placeholder="email@exemplo.com"></div>'+
'<div class="form-group"><label>Endereco</label><input type="text" id="hfEnd" value="'+(h?esc(h.endereco||""):'')+'" placeholder="Endereco completo"></div>'+
'<div class="form-group"><label>Observacoes</label><textarea id="hfObs" rows="2">'+(h?esc(h.observacoes||""):'')+'</textarea></div>'+
'</div>';}

export function salvarHospede(id){var n=document.getElementById("hfNome"),d=document.getElementById("hfDoc"),t=document.getElementById("hfTel"),e=document.getElementById("hfEmail"),en=document.getElementById("hfEnd"),o=document.getElementById("hfObs");
if(!n||!n.value.trim())return st("Nome e obrigatorio.","error"),false;
if(d&&d.value.trim()&&d.value.replace(/\D/g,"").length!==11)return st("CPF deve ter 11 digitos.","error"),false;
var dados={nome:n.value.trim(),documento:(d?d.value.trim():""),telefone:(t?t.value.trim():""),email:(e?e.value.trim():""),endereco:(en?en.value.trim():""),observacoes:(o?o.value.trim():""),ativo:true};
if(id){St.up("h",id,dados);st("Hospede atualizado!","success")}
else{St.in("h",dados);st("Hospede cadastrado!","success")}
cm();renderHospedes()}

export function excluirHospede(id){confirmar({titulo:"Excluir hospede?",msg:"Esta acao nao podera ser desfeita.",okLabel:"Sim, excluir",tipo:"danger"},function(){St.rm("h",id);st("Hospede excluido.","warning");renderHospedes()})}
