// Módulo: Funcionários
import { esc } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";

export function renderFuncionarios(){var el=document.getElementById("pageContent");
var funcionarios=St.ga("fa");
el.innerHTML='<div class="page-header"><div><h2>Funcionarios</h2><p>Gerenciar equipe do hotel</p></div><div class="page-header-actions"><button class="btn btn-primary" onclick="showNovoFuncionario()">+ Novo Funcionario</button></div></div>';

if(!funcionarios.length){el.innerHTML+='<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum funcionario cadastrado.</p>';return;}

el.innerHTML+='<table><tr><th>Nome</th><th>Cargo</th><th>Telefone</th><th>Email</th><th>Turno</th><th>Ativo</th><th>Acoes</th></tr>'+
funcionarios.map(function(f){return'<tr><td>'+esc(f.nome)+'</td><td>'+esc(f.cargo||"-")+'</td><td>'+esc(f.telefone||"-")+'</td><td>'+esc(f.email||"-")+'</td><td>'+esc(f.turno||"-")+'</td><td>'+(f.ativo!==false?'<span class="badge badge-success">Sim</span>':'<span class="badge badge-danger">Nao</span>')+'</td><td><button class="btn btn-sm btn-primary" onclick="editarFuncionario(\''+f.id+'\')">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirFuncionario(\''+f.id+'\')">Excluir</button></td></tr>'}).join('')+'</table>';}

export function showNovoFuncionario(){sm("Novo Funcionario",formFuncionario(null),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarFuncionario()">Salvar</button>')}
export function editarFuncionario(id){sm("Editar Funcionario",formFuncionario(id),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarFuncionario(\''+id+'\')">Salvar</button>')}

function formFuncionario(id){var f=id?St.fi("fa",id):null;
return'<div class="form-grid">'+
'<div class="form-group"><label>Nome *</label><input type="text" id="ffNome" value="'+(f?esc(f.nome):'')+'"></div>'+
'<div class="form-group"><label>Cargo *</label><select id="ffCargo"><option value="Recepcionista"'+(f&&f.cargo==="Recepcionista"?' selected':'')+'>Recepcionista</option><option value="Camareira"'+(f&&f.cargo==="Camareira"?' selected':'')+'>Camareira</option><option value="Gerente"'+(f&&f.cargo==="Gerente"?' selected':'')+'>Gerente</option><option value="Manutencao"'+(f&&f.cargo==="Manutencao"?' selected':'')+'>Manutencao</option><option value="Cozinha"'+(f&&f.cargo==="Cozinha"?' selected':'')+'>Cozinha</option><option value="Seguranca"'+(f&&f.cargo==="Seguranca"?' selected':'')+'>Seguranca</option><option value="Outro"'+(f&&f.cargo==="Outro"?' selected':'')+'>Outro</option></select></div>'+
'<div class="form-group"><label>Telefone</label><input type="text" id="ffTel" value="'+(f?esc(f.telefone||""):'')+'"></div>'+
'<div class="form-group"><label>Email</label><input type="email" id="ffEmail" value="'+(f?esc(f.email||""):'')+'"></div>'+
'<div class="form-group"><label>Turno</label><select id="ffTurno"><option value="Manha"'+(f&&f.turno==="Manha"?' selected':'')+'>Manha (06-14h)</option><option value="Tarde"'+(f&&f.turno==="Tarde"?' selected':'')+'>Tarde (14-22h)</option><option value="Noite"'+(f&&f.turno==="Noite"?' selected':'')+'>Noite (22-06h)</option><option value="Administrativo"'+(f&&f.turno==="Administrativo"?' selected':'')+'>Administrativo</option></select></div>'+
'<div class="form-group"><label>Salario (R$)</label><input type="number" id="ffSal" value="'+(f&&f.salario?(f.salario/100).toFixed(2):'')+'" step="0.01" min="0"></div>'+
'</div>';}

export function salvarFuncionario(id){var n=document.getElementById("ffNome"),c=document.getElementById("ffCargo"),t=document.getElementById("ffTel"),e=document.getElementById("ffEmail"),tu=document.getElementById("ffTurno"),s=document.getElementById("ffSal");
if(!n||!n.value.trim())return st("Nome obrigatorio.","error"),false;
var salario=s&&s.value?Math.round(parseFloat(s.value)*100):0;
var dados={nome:n.value.trim(),cargo:(c?c.value:""),telefone:(t?t.value.trim():""),email:(e?e.value.trim():""),turno:(tu?tu.value:""),salario:salario,ativo:true};
if(id){St.up("fa",id,dados);st("Funcionario atualizado!","success")}
else{St.in("fa",dados);st("Funcionario cadastrado!","success")}
cm();renderFuncionarios()}

export function excluirFuncionario(id){confirmar({titulo:"Excluir funcionario?",msg:"Esta acao nao podera ser desfeita.",okLabel:"Sim, excluir",tipo:"danger"},function(){St.rm("fa",id);st("Funcionario excluido.","warning");renderFuncionarios()})}
