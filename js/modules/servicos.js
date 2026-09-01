// Módulo: Serviços e Consumo
import { esc, fmtC, fmtD, td } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";

export function renderServicos(){var el=document.getElementById("pageContent");
var servicos=St.ga("sv"),reservas=St.ga("r"),hospedes=St.ga("h"),os=St.ga("os");
el.innerHTML='<div class="page-header"><div><h2>Servicos</h2><p>Gerenciar servicos e consumo</p></div></div>'+
'<div class="tabs"><div class="tab active" onclick="this.parentElement.querySelector(\'.active\').classList.remove(\'active\');this.classList.add(\'active\');document.getElementById(\'tabServicosLista\').style.display=\'block\';document.getElementById(\'tabServicosConsumo\').style.display=\'none\';renderServicosLista()">Servicos Disponiveis</div>'+
'<div class="tab" onclick="this.parentElement.querySelector(\'.active\').classList.remove(\'active\');this.classList.add(\'active\');document.getElementById(\'tabServicosLista\').style.display=\'none\';document.getElementById(\'tabServicosConsumo\').style.display=\'block\';renderConsumoServicos()">Consumo</div></div>'+
'<div id="tabServicosLista">'+buildServicosTable(servicos)+'</div>'+
'<div id="tabServicosConsumo" style="display:none">'+(os.length?buildConsumoServicosTable(os,reservas,hospedes,servicos):'<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum consumo registrado.</p>')+'</div>';}

function buildServicosTable(servicos){if(!servicos.length)return'<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum servico cadastrado.</p>';
return'<button class="btn btn-primary" onclick="showNovoServico()" style="margin-bottom:16px">+ Novo Servico</button><table><tr><th>Servico</th><th>Preco</th><th>Categoria</th><th>Acoes</th></tr>'+
servicos.map(function(s){return'<tr><td>'+esc(s.nome)+'</td><td>'+fmtC(s.preco)+'</td><td>'+esc(s.categoria||"-")+'</td><td><button class="btn btn-sm btn-primary" onclick="editarServico(\''+s.id+'\')">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirServico(\''+s.id+'\')">Excluir</button></td></tr>'}).join('')+'</table>'}

export function renderServicosLista(){document.getElementById("tabServicosLista").innerHTML=buildServicosTable(St.ga("sv"))}

function buildConsumoServicosTable(os,reservas,hospedes,servicos){return'<button class="btn btn-primary" onclick="showNovoConsumo()" style="margin-bottom:16px">+ Novo Consumo</button><table><tr><th>Data</th><th>Hospede</th><th>Servico</th><th>Qtd</th><th>Total</th><th>Acoes</th></tr>'+
os.sort(function(a,b){return b.data.localeCompare(a.data)}).map(function(o){var r=reservas.find(function(x){return x.id===o.reservaId}),h=hospedes.find(function(x){return r&&x.id===r.hospedeId}),s=servicos.find(function(x){return x.id===o.servicoId});return'<tr><td>'+fmtD(o.data)+'</td><td>'+(h?esc(h.nome):"-")+'</td><td>'+(s?esc(s.nome):"-")+'</td><td>'+o.quantidade+'</td><td>'+fmtC(o.total)+'</td><td><button class="btn btn-sm btn-danger" onclick="excluirConsumo(\''+o.id+'\')">Excluir</button></td></tr>'}).join('')+'</table>'}

export function renderConsumoServicos(){var os=St.ga("os");document.getElementById("tabServicosConsumo").innerHTML=os.length?buildConsumoServicosTable(os,St.ga("r"),St.ga("h"),St.ga("sv")):'<p style="padding:24px;text-align:center;color:var(--text-mute)">Nenhum consumo registrado.</p>';}

export function showNovoServico(){sm("Novo Servico",formServico(null),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarServico()">Salvar</button>')}
export function editarServico(id){sm("Editar Servico",formServico(id),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarServico(\''+id+'\')">Salvar</button>')}

function formServico(id){var s=id?St.fi("sv",id):null;
return'<div class="form-grid">'+
'<div class="form-group"><label>Nome *</label><input type="text" id="sfNome" value="'+(s?esc(s.nome):'')+'"></div>'+
'<div class="form-group"><label>Preco (R$) *</label><input type="number" id="sfPreco" value="'+(s?s.preco/100:'')+'" step="0.01" min="0"></div>'+
'<div class="form-group"><label>Categoria</label><select id="sfCat"><option value="Alimentacao"'+(s&&s.categoria==="Alimentacao"?' selected':'')+'>Alimentacao</option><option value="Lavanderia"'+(s&&s.categoria==="Lavanderia"?' selected':'')+'>Lavanderia</option><option value="Estacionamento"'+(s&&s.categoria==="Estacionamento"?' selected':'')+'>Estacionamento</option><option value="Entretenimento"'+(s&&s.categoria==="Entretenimento"?' selected':'')+'>Entretenimento</option><option value="Bem-Estar"'+(s&&s.categoria==="Bem-Estar"?' selected':'')+'>Bem-Estar</option><option value="Servico de Quarto"'+(s&&s.categoria==="Servico de Quarto"?' selected':'')+'>Servico de Quarto</option><option value="Outros"'+(s&&s.categoria==="Outros"?' selected':'')+'>Outros</option></select></div>'+
'<div class="form-group"><label>Unidade</label><input type="text" id="sfUn" value="'+(s?esc(s.unidade||"unidade"):'unidade')+'"></div>'+
'</div>';}

export function salvarServico(id){var n=document.getElementById("sfNome"),p=document.getElementById("sfPreco"),c=document.getElementById("sfCat"),u=document.getElementById("sfUn");
if(!n||!n.value.trim())return st("Nome obrigatorio.","error"),false;
var preco=Math.round(parseFloat(p?p.value:0)*100);
var dados={nome:n.value.trim(),preco:preco,categoria:(c?c.value.trim():""),unidade:(u?u.value.trim():"unidade"),ativo:true};
if(id){St.up("sv",id,dados);st("Servico atualizado!","success")}
else{St.in("sv",dados);st("Servico cadastrado!","success")}
cm();renderServicos()}

export function excluirServico(id){confirmar({titulo:"Excluir servico?",msg:"Esta acao nao podera ser desfeita.",okLabel:"Sim, excluir",tipo:"danger"},function(){St.rm("sv",id);st("Servico excluido.","warning");renderServicos()})}

export function showNovoConsumo(){sm("Novo Consumo",formConsumo(),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarConsumo()">Salvar</button>')}

function formConsumo(){var ativas=St.ga("r").filter(function(r){return r.status==="checkin"});
var servicos=St.ga("sv").filter(function(s){return s.ativo!==false});
return'<div class="form-grid">'+
'<div class="form-group"><label>Hospede (Estadia Ativa) *</label><select id="osfReserva">'+
(ativas.length?'':'<option value="">Nenhum hospede em estadia</option>')+
ativas.map(function(r){var h=St.fi("h",r.hospedeId);return'<option value="'+r.id+'">'+(h?esc(h.nome):"")+' - Apto '+(St.fi("q",r.quartoId)?St.fi("q",r.quartoId).numero:"")+'</option>'}).join('')+'</select></div>'+
'<div class="form-group"><label>Servico *</label><select id="osfServico">'+servicos.map(function(s){return'<option value="'+s.id+'" data-preco="'+(s.preco||0)+'">'+esc(s.nome)+' - '+fmtC(s.preco)+'</option>'}).join('')+'</select></div>'+
'<div class="form-group"><label>Quantidade</label><input type="number" id="osfQtd" value="1" min="1"></div>'+
'<div class="form-group"><label>Data</label><input type="date" id="osfData" value="'+td()+'"></div>'+
'</div>';}

export function salvarConsumo(){var r=document.getElementById("osfReserva"),s=document.getElementById("osfServico"),q=document.getElementById("osfQtd"),d=document.getElementById("osfData");
if(!r||!s||!r.value)return st("Selecione um hospede em estadia.","error"),false;
var preco=parseFloat(s.options[s.selectedIndex].dataset.preco||0);
var qtd=parseInt(q?q.value:1);
var total=preco*qtd;
St.in("os",{reservaId:r.value,servicoId:s.value,quantidade:qtd,precoUnit:preco,total:total,data:(d?d.value:td())});
st("Consumo registrado!","success");cm();renderServicos()}

export function excluirConsumo(id){St.rm("os",id);st("Consumo excluido.","warning");renderServicos()}
