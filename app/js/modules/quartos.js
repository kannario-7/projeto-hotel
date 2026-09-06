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

// Central de calendario (iCal) do quarto: exportar (nosso link) + importar (links das OTAs) + sincronizar.
export function mostrarLinkIcal(id){
  var q=St.fi("q",id); if(!q)return;
  if(!q.icalToken)return st("Este quarto ainda nao tem calendario. Rode a atualizacao do banco (schema-28).","error");
  var link=location.origin+"/api/ical?t="+q.icalToken;
  var urls=Array.isArray(q.icalUrls)?q.icalUrls:[];
  var linhasImport=urls.map(function(u,i){
    var val=(u&&u.url)?u.url:u;
    return '<div style="display:flex;gap:6px;margin-bottom:6px"><input type="text" class="icalExtUrl" value="'+esc(val)+'" placeholder="https://...ics" style="flex:1"><button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">x</button></div>';
  }).join('');
  sm("Calendario do Apto "+esc(q.numero),
    '<h4 style="color:var(--text);margin:0 0 6px">1. Exportar (bloquear no Airbnb/Booking)</h4>'+
    '<p style="color:var(--text-dim);font-size:13px;margin-bottom:8px">Cole este link no Airbnb/Booking (Importar calendario). Eles bloqueiam as datas ocupadas aqui.</p>'+
    '<div class="form-group" style="display:flex;gap:6px"><input type="text" id="icalLink" value="'+esc(link)+'" readonly style="flex:1"><button type="button" class="btn btn-secondary" onclick="copiarLinkIcal()">Copiar</button></div>'+
    '<hr style="border:none;border-top:1px solid var(--border);margin:14px 0">'+
    '<h4 style="color:var(--text);margin:0 0 6px">2. Importar (bloquear aqui o que foi vendido la)</h4>'+
    '<p style="color:var(--text-dim);font-size:13px;margin-bottom:8px">Cole aqui os links de calendario (.ics) do Airbnb/Booking <b>deste quarto</b>. Ao sincronizar, as datas vendidas la ficam bloqueadas aqui.</p>'+
    '<div id="icalExtBox">'+linhasImport+'</div>'+
    '<button type="button" class="btn btn-sm btn-secondary" onclick="addIcalUrlLinha()">+ Adicionar link</button>'+
    '<p style="color:var(--text-mute);font-size:12px;margin-top:10px">Sincroniza apenas datas ocupadas (nao preco/hospede). Atualizacao periodica.</p>',
    '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>'+
    '<button class="btn btn-secondary" onclick="salvarIcalUrls(\''+id+'\')">Salvar links</button>'+
    '<button class="btn btn-primary" onclick="sincronizarIcal(\''+id+'\')">Salvar e sincronizar agora</button>');
}
export function addIcalUrlLinha(){
  var box=document.getElementById("icalExtBox"); if(!box)return;
  var div=document.createElement("div");
  div.style="display:flex;gap:6px;margin-bottom:6px";
  div.innerHTML='<input type="text" class="icalExtUrl" placeholder="https://...ics" style="flex:1"><button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">x</button>';
  box.appendChild(div);
}
function lerIcalUrls(){
  var out=[];
  document.querySelectorAll(".icalExtUrl").forEach(function(el){ var v=el.value.trim(); if(v) out.push({url:v}); });
  return out;
}
export async function salvarIcalUrls(id){
  var urls=lerIcalUrls();
  var res=await St.upErr("q",id,{icalUrls:urls});
  if(!res.ok)return st("Nao foi possivel salvar os links.","error"),false;
  st("Links de calendario salvos.","success");
  return true;
}
export async function sincronizarIcal(id){
  var q=St.fi("q",id); if(!q)return;
  var ok=await salvarIcalUrls(id); if(ok===false)return;
  var btn=document.querySelector("#modalFooter .btn-primary"); if(btn){btn.disabled=true;btn.textContent="Sincronizando...";}
  try{
    var resp=await fetch(location.origin+"/api/sync-ical?t="+q.icalToken);
    var data=await resp.json();
    if(data && data.ok){
      st((data.criados||0)+" data(s) bloqueada(s)"+(data.pulados?(", "+data.pulados+" ignorada(s) por conflito"):"")+".","success");
      // recarrega os dados para o mapa refletir os bloqueios
      if(window.St && window.location){ /* re-render simples: fecha modal e re-renderiza quartos */ }
      cm(); renderQuartos();
    } else {
      st("Nao foi possivel sincronizar. Verifique os links.","error");
      if(btn){btn.disabled=false;btn.textContent="Salvar e sincronizar agora";}
    }
  }catch(e){
    st("Erro ao sincronizar. Tente novamente.","error");
    if(btn){btn.disabled=false;btn.textContent="Salvar e sincronizar agora";}
  }
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
