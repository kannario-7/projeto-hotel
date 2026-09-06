// Módulo: Quartos
import { esc, fmtC } from "../utils.js";
import { St } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";

export function renderQuartos(){var el=document.getElementById("pageContent");
var quartos=St.ga("q"),tq=St.ga("tq");
el.innerHTML='<div class="page-header"><div><h2>Quartos</h2><p>Gerenciar quartos do hotel</p></div><div class="page-header-actions"><button class="btn btn-primary" onclick="showNovoQuarto()">+ Novo Quarto</button></div></div>';

var porAndar={};quartos.filter(function(q){return q.ativo!==false}).forEach(function(q){if(!porAndar[q.andar])porAndar[q.andar]=[];porAndar[q.andar].push(q)});
var html='';
Object.keys(porAndar).sort().forEach(function(a){html+='<h3 style="margin:16px 0 8px;color:var(--text)">Andar '+a+'</h3><div class="grid-cards">';
porAndar[a].forEach(function(q){var t=tq.find(function(x){return x.id===q.tipoQuartoId});html+='<div class="room-card"><div class="room-number">Apto '+q.numero+'</div><div class="room-type">'+(t?esc(t.nome):"")+' - '+(t?fmtC(t.precoDiaria):"")+'/noite</div><div><span class="room-status '+q.status+'">'+esc(q.status.charAt(0).toUpperCase()+q.status.slice(1))+'</span></div>'+
'<div class="room-actions">'+
(q.status==="disponivel"?('<button class="btn btn-sm btn-primary" onclick="showManutencaoQuarto(\''+q.id+'\')">Manutencao</button>'):'')+
(q.status==="manutencao"?('<button class="btn btn-sm btn-success" onclick="liberarQuarto(\''+q.id+'\')">Liberar</button>'):'')+
(q.status==="limpeza"?('<button class="btn btn-sm btn-success" onclick="liberarQuarto(\''+q.id+'\')">Limpo</button>'):'')+
'<button class="btn btn-sm btn-secondary" onclick="editarQuarto(\''+q.id+'\')">Editar</button>'+
(q.icalToken?'<button class="btn btn-sm btn-secondary" onclick="mostrarLinkIcal(\''+q.id+'\')" title="Sincronizar datas com Airbnb/Booking">Calendario</button>':'')+
'<button class="btn btn-sm btn-danger" onclick="excluirQuarto(\''+q.id+'\')">Excluir</button></div></div>'});
html+='</div>'});
el.innerHTML+=html;}

export function showManutencaoQuarto(id){St.up("q",id,{status:"manutencao"});st("Quarto em manutencao.","warning");renderQuartos()}
export function liberarQuarto(id){St.up("q",id,{status:"disponivel"});st("Quarto disponivel.","success");renderQuartos()}

// Link de calendario (iCal) do quarto: cola-se no Airbnb/Booking para bloquearem as datas ocupadas aqui.
export function mostrarLinkIcal(id){
  var q=St.fi("q",id); if(!q)return;
  if(!q.icalToken)return st("Este quarto ainda nao tem link de calendario. Rode a atualizacao do banco (schema-28).","error");
  var link=location.origin+"/api/ical?t="+q.icalToken;
  sm("Calendario do Apto "+esc(q.numero),
    '<p style="color:var(--text-dim);font-size:13px;margin-bottom:12px">Cole este link no <b>Airbnb</b> ou <b>Booking</b> (em "Importar calendario" / "Sincronizar calendarios"). Eles vao bloquear automaticamente as datas ja ocupadas neste quarto.</p>'+
    '<div class="form-group"><input type="text" id="icalLink" value="'+esc(link)+'" readonly></div>'+
    '<p style="color:var(--text-mute);font-size:12px">Sincroniza apenas as <b>datas ocupadas</b> (nao inclui preco nem dados do hospede). As plataformas atualizam periodicamente, entao pode haver algumas horas de defasagem.</p>',
    '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button><button class="btn btn-primary" onclick="copiarLinkIcal()">Copiar link</button>');
}
export function copiarLinkIcal(){
  var el=document.getElementById("icalLink"); if(!el)return;
  navigator.clipboard.writeText(el.value).then(function(){ st("Link copiado!","success"); }, function(){ st(el.value,"info"); });
}

export function excluirQuarto(id){
  var q=St.fi("q",id);if(!q)return;
  // Impede excluir quarto com reserva ativa (pendente/confirmada/checkin)
  var ativas=St.ga("r").filter(function(r){return r.quartoId===id&&["pendente","confirmada","checkin"].indexOf(r.status)>=0});
  if(ativas.length){st("Nao e possivel excluir: o Apto "+q.numero+" tem "+ativas.length+" reserva(s) ativa(s). Cancele ou finalize antes.","error");return;}
  if(q.status==="ocupado"){st("Nao e possivel excluir: o Apto "+q.numero+" esta ocupado.","error");return;}
  confirmar({titulo:"Excluir o Apto "+q.numero+"?",msg:"O quarto sera removido da lista. O historico de reservas antigas e mantido.",okLabel:"Sim, excluir",tipo:"danger"},function(){
    // Exclusao logica: marca inativo (preserva historico de reservas que referenciam o quarto)
    St.up("q",id,{ativo:false});
    st("Quarto excluido.","warning");
    renderQuartos();
  });
}

export function showNovoQuarto(){sm("Novo Quarto",formQuarto(null),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarQuarto()">Salvar</button>')}
export function editarQuarto(id){sm("Editar Quarto",formQuarto(id),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarQuarto(\''+id+'\')">Salvar</button>')}

function formQuarto(id){var q=id?St.fi("q",id):null;
var tq=St.ga("tq").filter(function(t){return t.ativo!==false});
return'<div class="form-grid">'+
'<div class="form-group"><label>Numero *</label><input type="text" id="qfNum" value="'+(q?esc(q.numero):'')+'"></div>'+
'<div class="form-group"><label>Andar *</label><input type="number" id="qfAndar" value="'+(q?q.andar:'1')+'"></div>'+
'<div class="form-group"><label>Tipo de Quarto *</label><select id="qfTipo">'+tq.map(function(t){return'<option value="'+t.id+'"'+(q&&q.tipoQuartoId===t.id?' selected':'')+'>'+esc(t.nome)+'</option>'}).join('')+'</select></div>'+
'<div class="form-group"><label>Status</label><select id="qfStatus"><option value="disponivel"'+(q&&q.status==="disponivel"?' selected':'')+'>Disponivel</option><option value="manutencao"'+(q&&q.status==="manutencao"?' selected':'')+'>Manutencao</option><option value="limpeza"'+(q&&q.status==="limpeza"?' selected':'')+'>Limpeza</option></select></div>'+
'</div>';}

export function salvarQuarto(id){var n=document.getElementById("qfNum"),a=document.getElementById("qfAndar"),t=document.getElementById("qfTipo"),s=document.getElementById("qfStatus");
if(!n||!n.value.trim())return st("Numero obrigatorio.","error"),false;
var dados={numero:n.value.trim(),andar:parseInt(a?a.value:1),tipoQuartoId:t?t.value:null,status:s?s.value:"disponivel",ativo:true};
if(id){St.up("q",id,dados);st("Quarto atualizado!","success")}
else{St.in("q",dados);st("Quarto cadastrado!","success")}
cm();renderQuartos()}
