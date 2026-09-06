// Módulo: Governanca / Limpeza (housekeeping)
// Fila de quartos aguardando limpeza, atribuicao de camareira e conclusao.
// Reusa o ciclo de status existente (limpeza -> disponivel); so adiciona metadados.
import { esc } from "../utils.js";
import { St, auditar } from "../store.js";
import { st } from "../ui.js";

function nomeFuncionario(id){ if(!id)return""; var f=St.fi("fa",id); return f?f.nome:""; }

// Tempo de espera amigavel desde que o quarto entrou na fila
function fmtEspera(iso){
  if(!iso)return"";
  var d=new Date(iso), ag=new Date(), seg=Math.floor((ag-d)/1000);
  if(seg<60)return"agora";
  if(seg<3600)return"ha "+Math.floor(seg/60)+" min";
  if(seg<86400)return"ha "+Math.floor(seg/3600)+"h";
  return"ha "+Math.floor(seg/86400)+"d";
}

export function renderGovernanca(){
  var el=document.getElementById("pageContent");
  var quartos=St.ga("q").filter(function(q){return q.ativo!==false;});
  var tq=St.ga("tq");
  var fila=quartos.filter(function(q){return q.status==="limpeza";})
    .sort(function(a,b){return (a.limpezaAtualizadoEm||"").localeCompare(b.limpezaAtualizadoEm||"");}); // mais antigo primeiro
  var manut=quartos.filter(function(q){return q.status==="manutencao";});

  el.innerHTML='<div class="page-header"><div><h2>Limpeza</h2><p>Quartos aguardando limpeza e manutencao</p></div></div>';

  // Resumo
  el.innerHTML+='<div class="cards-row">'+
    '<div class="stat-card"><h3>Aguardando limpeza</h3><div class="value" style="color:var(--ciano)">'+fila.length+'</div></div>'+
    '<div class="stat-card"><h3>Em manutencao</h3><div class="value" style="color:var(--neg)">'+manut.length+'</div></div>'+
    '<div class="stat-card"><h3>Disponiveis</h3><div class="value" style="color:var(--pos)">'+quartos.filter(function(q){return q.status==="disponivel";}).length+'</div></div>'+
    '</div>';

  // Fila de limpeza
  el.innerHTML+='<h3 style="margin:18px 0 10px;color:var(--text)">Fila de limpeza</h3>';
  if(!fila.length){
    el.innerHTML+='<p style="padding:18px;text-align:center;color:var(--text-mute);background:var(--surface);border:1px solid var(--border);border-radius:12px">Nenhum quarto aguardando limpeza. Tudo em ordem!</p>';
  } else {
    var camareiras=St.ga("fa").filter(function(f){return f.ativo!==false && (f.cargo==="Camareira"||f.cargo==="Outro");});
    el.innerHTML+='<div style="overflow-x:auto"><table><tr><th>Quarto</th><th>Tipo</th><th>Na fila</th><th>Responsavel</th><th>Acoes</th></tr>'+
    fila.map(function(q){
      var t=tq.find(function(x){return x.id===q.tipoQuartoId;});
      var opts='<option value="">Sem responsavel</option>'+camareiras.map(function(c){return '<option value="'+c.id+'"'+(q.limpezaResponsavel===c.id?' selected':'')+'>'+esc(c.nome)+'</option>';}).join('');
      return '<tr>'+
        '<td><b>Apto '+esc(q.numero)+'</b>'+(q.andar?' <small style="color:var(--text-mute)">(andar '+q.andar+')</small>':'')+'</td>'+
        '<td>'+esc(t?t.nome:"Quarto")+'</td>'+
        '<td>'+esc(fmtEspera(q.limpezaAtualizadoEm))+'</td>'+
        '<td><select onchange="atribuirCamareira(\''+q.id+'\',this.value)" style="min-width:150px">'+opts+'</select></td>'+
        '<td><button class="btn btn-sm btn-success" onclick="marcarQuartoLimpo(\''+q.id+'\')">Marcar como limpo</button></td>'+
      '</tr>';
    }).join('')+'</table></div>';
    if(!camareiras.length){
      el.innerHTML+='<p style="color:var(--text-mute);font-size:13px;margin-top:8px">Dica: cadastre funcionarios com cargo "Camareira" em Funcionarios para atribui-los a limpeza.</p>';
    }
  }

  // Manutencao (visao rapida)
  if(manut.length){
    el.innerHTML+='<h3 style="margin:22px 0 10px;color:var(--text)">Em manutencao</h3><div style="overflow-x:auto"><table><tr><th>Quarto</th><th>Tipo</th><th>Acoes</th></tr>'+
    manut.map(function(q){var t=tq.find(function(x){return x.id===q.tipoQuartoId;});return '<tr><td><b>Apto '+esc(q.numero)+'</b></td><td>'+esc(t?t.nome:"Quarto")+'</td><td><button class="btn btn-sm btn-success" onclick="marcarQuartoLimpo(\''+q.id+'\')">Liberar (disponivel)</button></td></tr>';}).join('')+'</table></div>';
  }
}

// Atribui (ou remove) a camareira responsavel pela limpeza do quarto
export function atribuirCamareira(quartoId, funcId){
  St.up("q",quartoId,{limpezaResponsavel:funcId||null,limpezaAtualizadoEm:new Date().toISOString()});
  var q=St.fi("q",quartoId);
  auditar("limpeza.atribuir", funcId?("Atribuiu "+nomeFuncionario(funcId)+" ao Apto "+(q?q.numero:"")):("Removeu responsavel do Apto "+(q?q.numero:"")));
  st(funcId?("Responsavel: "+nomeFuncionario(funcId)):"Responsavel removido.","success");
  renderGovernanca();
}

// Marca o quarto como limpo -> volta a disponivel, limpando os metadados de limpeza
export function marcarQuartoLimpo(quartoId){
  var q=St.fi("q",quartoId); if(!q)return;
  St.up("q",quartoId,{status:"disponivel",limpezaResponsavel:null,limpezaAtualizadoEm:null});
  auditar("limpeza.concluir","Apto "+q.numero+" liberado (limpo/disponivel)");
  st("Apto "+q.numero+" pronto e disponivel!","success");
  renderGovernanca();
}
