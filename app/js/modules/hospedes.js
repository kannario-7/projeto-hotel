// Módulo: Hóspedes
import { esc, mascDocAuto, mascTel, mascCep, enderecoPorCep, isValidCPF } from "../utils.js";
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
'<div class="form-group"><label>CPF ou CNPJ</label><input type="text" id="hfDoc" value="'+(h?esc(h.documento||""):'')+'" oninput="mascHospedeDoc(this)" placeholder="000.000.000-00"><small id="hfDocMsg" style="color:var(--text-mute);font-size:12px"></small></div>'+
'<div class="form-group"><label>Telefone *</label><input type="text" id="hfTel" value="'+(h?esc(h.telefone||""):'')+'" oninput="mascHospedeTel(this)" placeholder="(11) 99999-9999"></div>'+
'<div class="form-group"><label>Email</label><input type="email" id="hfEmail" value="'+(h?esc(h.email||""):'')+'" placeholder="email@exemplo.com"></div>'+
'<div class="form-group"><label>CEP</label><div style="display:flex;gap:8px"><input type="text" id="hfCep" oninput="mascHospedeCep(this)" placeholder="00000-000" style="flex:1"><button type="button" class="btn btn-secondary" onclick="buscarCepHospede()">Buscar</button></div><small id="hfCepMsg" style="color:var(--text-mute);font-size:12px"></small></div>'+
'<div class="form-group"><label>Endereco</label><input type="text" id="hfEnd" value="'+(h?esc(h.endereco||""):'')+'" placeholder="Rua, bairro, cidade/UF"></div>'+
'<div class="form-group" style="grid-column:1/-1"><label>Observacoes</label><textarea id="hfObs" rows="2">'+(h?esc(h.observacoes||""):'')+'</textarea></div>'+
'<div class="form-group" style="grid-column:1/-1"><label class="pay-opt" style="border:none;padding:6px 0"><input type="checkbox" id="hfConsent"'+((h&&h.consentimentoEm)?' checked':'')+'><span class="pay-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="pay-label">O hospede autoriza o tratamento dos seus dados para fins da hospedagem (LGPD).</span></label>'+
(h&&h.consentimentoEm?'<small style="color:var(--text-mute);font-size:12px">Consentimento registrado em '+esc(new Date(h.consentimentoEm).toLocaleString("pt-BR"))+'</small>':'')+'</div>'+
'</div>';}

// Handlers de mascara/busca (expostos globalmente pelo app.js)
export function mascHospedeDoc(el){
  mascDocAuto(el);
  var msg=document.getElementById("hfDocMsg");if(!msg)return;
  var dig=el.value.replace(/\D/g,"");
  if(dig.length===11){msg.textContent=isValidCPF(dig)?"CPF valido.":"CPF invalido.";msg.style.color=isValidCPF(dig)?"#43d18c":"#f16a6e";}
  else if(dig.length===14){msg.textContent="CNPJ.";msg.style.color="var(--text-mute)";}
  else{msg.textContent="";}
}
export function mascHospedeTel(el){mascTel(el);}
export function mascHospedeCep(el){mascCep(el);}
export async function buscarCepHospede(){
  var cep=document.getElementById("hfCep"),msg=document.getElementById("hfCepMsg"),end=document.getElementById("hfEnd");
  msg.textContent="Buscando...";
  var e=await enderecoPorCep(cep.value);
  if(!e){msg.textContent="CEP nao encontrado.";return;}
  end.value=e;msg.textContent="Endereco preenchido pelo CEP.";
}

export function salvarHospede(id){var n=document.getElementById("hfNome"),d=document.getElementById("hfDoc"),t=document.getElementById("hfTel"),e=document.getElementById("hfEmail"),en=document.getElementById("hfEnd"),o=document.getElementById("hfObs"),cons=document.getElementById("hfConsent");
if(!n||!n.value.trim())return st("Nome e obrigatorio.","error"),false;
if(d&&d.value.trim()){var dig=d.value.replace(/\D/g,"");
  if(dig.length!==11&&dig.length!==14)return st("Documento deve ser CPF (11) ou CNPJ (14 digitos).","error"),false;
  if(dig.length===11&&!isValidCPF(dig))return st("CPF invalido.","error"),false;}
if(!cons||!cons.checked)return st("E necessario o consentimento do hospede (LGPD) para cadastrar.","error"),false;
// registra data/hora do consentimento: preserva a data anterior na edicao se ja existia
var hAtual=id?St.fi("h",id):null;
var consentimentoEm=(hAtual&&hAtual.consentimentoEm)?hAtual.consentimentoEm:new Date().toISOString();
var dados={nome:n.value.trim(),documento:(d?d.value.trim():""),telefone:(t?t.value.trim():""),email:(e?e.value.trim():""),endereco:(en?en.value.trim():""),observacoes:(o?o.value.trim():""),consentimentoEm:consentimentoEm,ativo:true};
if(id){St.up("h",id,dados);st("Hospede atualizado!","success")}
else{St.in("h",dados);st("Hospede cadastrado!","success")}
cm();renderHospedes()}

export function excluirHospede(id){confirmar({titulo:"Excluir hospede?",msg:"Esta acao nao podera ser desfeita.",okLabel:"Sim, excluir",tipo:"danger"},function(){St.rm("h",id);st("Hospede excluido.","warning");renderHospedes()})}
