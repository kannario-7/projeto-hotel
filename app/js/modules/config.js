// Módulo: Configurações
import { esc, fmtC, fmtD, td } from "../utils.js";
import { mascCep, mascTel } from "../utils.js";
import { St, carregarTudo, getHotelId, auditar, carregarAuditoria } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";
import { renderUsuariosHotel } from "./usuarios.js";
import { sugerirTarifas } from "./tarifas-core.js";
import { supabase } from "../supabase.js";

export function renderConfig(){var el=document.getElementById("pageContent");
var config=St.gc();
el.innerHTML='<div class="page-header"><div><h2>Configuracoes</h2><p>Configurar dados do hotel e sistema</p></div></div>'+
'<div class="tabs">'+
'<div class="tab active" onclick="mudarConfigTab(this,\'hotel\')">Hotel</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'tp\')">Tipos de Quarto</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'pg\')">Pagamento</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'tf\')">Tarifas</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'us\')">Usuarios</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'at\')">Atividades</div>'+
'</div><div id="configContent">'+formConfigHotel(config)+'</div>';
setTimeout(initFormHotel,0);}

export function mudarConfigTab(tab,aba){tab.parentElement.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active")});tab.classList.add("active");
var config=St.gc(),tq=St.ga("tq"),html="";
if(aba==="us"){document.getElementById("configContent").innerHTML="";renderUsuariosHotel();return;}
if(aba==="at"){document.getElementById("configContent").innerHTML='<p style="color:var(--text-mute)">Carregando atividades...</p>';renderAtividades();return;}
if(aba==="hotel")html=formConfigHotel(config);
else if(aba==="tp")html=formConfigTipoQuarto(tq);
else if(aba==="tf")html=formConfigTarifas(tq);
else if(aba==="pg")html=formConfigPagamento(config);
document.getElementById("configContent").innerHTML=html;
if(aba==="hotel")setTimeout(initFormHotel,0);}

// ---- Aba Atividades (trilha de auditoria) ----
// Fallback legivel para acoes ainda nao mapeadas: "dominio.acao_x" -> "Dominio acao x"
function rotularAcao(a){
  if(!a)return"Acao";
  var txt=String(a).replace(/[._]/g," ").trim();
  return txt.charAt(0).toUpperCase()+txt.slice(1);
}
var ACAO_LABEL={
  "reserva.cancelar":{t:"Reserva cancelada",c:"var(--neg)"},
  "reserva.trocar_quarto":{t:"Troca de quarto",c:"var(--warn)"},
  "checkin.realizar":{t:"Check-in",c:"var(--pos)"},
  "checkout.finalizar":{t:"Check-out",c:"var(--accent-2)"},
  "caixa.abrir":{t:"Caixa aberto",c:"var(--pos)"},
  "caixa.fechar":{t:"Caixa fechado",c:"var(--ciano)"},
  "hotel.apagar_dados":{t:"Dados apagados",c:"var(--neg)"},
  "usuario.desativar":{t:"Usuario desativado",c:"var(--neg)"},
  "usuario.ativar":{t:"Usuario ativado",c:"var(--pos)"},
  "pagamento.registrar":{t:"Pagamento registrado",c:"var(--pos)"},
  "tarifa.criar":{t:"Tarifa criada",c:"var(--accent)"},
  "tarifa.editar":{t:"Tarifa editada",c:"var(--warn)"},
  "tarifa.excluir":{t:"Tarifa excluida",c:"var(--neg)"}
};
function quandoRel(iso){
  if(!iso)return"";
  var d=new Date(iso),ag=new Date(),seg=Math.floor((ag-d)/1000),p=function(n){return String(n).padStart(2,"0")};
  var hora=p(d.getHours())+":"+p(d.getMinutes());
  if(seg<60)return"agora";
  if(seg<3600)return"ha "+Math.floor(seg/60)+" min";
  if(d.toDateString()===ag.toDateString())return"hoje "+hora;
  var ont=new Date(ag);ont.setDate(ag.getDate()-1);
  if(d.toDateString()===ont.toDateString())return"ontem "+hora;
  return p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear()+" "+hora;
}
export async function renderAtividades(){
  var box=document.getElementById("configContent");
  if(!box)return;
  var itens=[];
  try{ itens=await carregarAuditoria(200); }catch(e){ itens=[]; }
  if(!itens.length){ box.innerHTML='<div class="form-container"><p style="color:var(--text-mute)">Nenhuma atividade registrada ainda. As acoes importantes (cancelamentos, check-in/out, caixa) aparecerao aqui.</p></div>'; return; }
  var linhas=itens.map(function(a){
    var meta=ACAO_LABEL[a.acao]||{t:rotularAcao(a.acao),c:"var(--text-mute)"};
    return '<tr>'+
      '<td style="white-space:nowrap"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+meta.c+';margin-right:7px"></span>'+esc(meta.t)+'</td>'+
      '<td>'+esc(a.detalhe||"")+'</td>'+
      '<td style="white-space:nowrap">'+esc(a.usuario_nome||"-")+'</td>'+
      '<td style="white-space:nowrap;color:var(--text-mute)">'+esc(quandoRel(a.criado_em))+'</td>'+
    '</tr>';
  }).join('');
  box.innerHTML='<div class="form-container"><h3 style="margin-bottom:6px;color:var(--text)">Atividades recentes</h3>'+
    '<p style="color:var(--text-mute);font-size:13px;margin-bottom:14px">Registro de quem fez o que no sistema (ultimas 200 acoes).</p>'+
    '<div style="overflow-x:auto"><table><tr><th>Acao</th><th>Detalhe</th><th>Usuario</th><th>Quando</th></tr>'+linhas+'</table></div></div>';
}

var UF_LISTA=["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function formConfigHotel(c){
  var tipoDoc=c.htipodoc||"cnpj";
  var ufOpts='<option value="">UF</option>'+UF_LISTA.map(function(u){return'<option value="'+u+'"'+(c.huf===u?' selected':'')+'>'+u+'</option>'}).join('');
  return'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Dados do Hotel</h3><div class="form-grid">'+
'<div class="form-group"><label>Nome do Hotel</label><input type="text" id="cfgNome" value="'+esc(c.hn||"")+'"></div>'+
'<div class="form-group"><label>Razao Social</label><input type="text" id="cfgRazao" value="'+esc(c.hrazao||"")+'"></div>'+
'<div class="form-group"><label>Tipo de documento</label><select id="cfgTipoDoc" onchange="onTipoDocChange()"><option value="cnpj"'+(tipoDoc==="cnpj"?' selected':'')+'>CNPJ</option><option value="cpf"'+(tipoDoc==="cpf"?' selected':'')+'>CPF</option></select></div>'+
'<div class="form-group"><label id="cfgDocLabel">'+(tipoDoc==="cpf"?"CPF":"CNPJ")+'</label><div style="display:flex;gap:8px"><input type="text" id="cfgCnpj" value="'+esc(c.hcnpj||"")+'" oninput="mascaraDoc(this)" placeholder="'+(tipoDoc==="cpf"?"000.000.000-00":"00.000.000/0000-00")+'" style="flex:1"><button type="button" class="btn btn-secondary" id="cfgBuscaDoc" onclick="buscarDocumento()"'+(tipoDoc==="cpf"?' style="display:none"':'')+'>Buscar</button></div><small id="cfgDocMsg" style="color:var(--text-mute);font-size:12px"></small></div>'+
'<div class="form-group"><label>Telefone</label><input type="text" id="cfgTel" value="'+esc(c.htel||"")+'" oninput="mascaraTel(this)" placeholder="(00) 00000-0000"></div>'+
'<div class="form-group"><label>Email</label><input type="email" id="cfgEmail" value="'+esc(c.hemail||"")+'"></div>'+
'</div>'+
'<h3 style="margin:22px 0 14px;color:var(--text)">Localizacao</h3><div class="form-grid">'+
'<div class="form-group"><label>CEP</label><div style="display:flex;gap:8px"><input type="text" id="cfgCep" value="'+esc(c.hcep||"")+'" oninput="mascaraCep(this)" placeholder="00000-000" style="flex:1"><button type="button" class="btn btn-secondary" onclick="buscarCep()">Buscar</button></div><small id="cfgCepMsg" style="color:var(--text-mute);font-size:12px"></small></div>'+
'<div class="form-group"><label>Endereco (rua/av.)</label><input type="text" id="cfgEnd" value="'+esc(c.hend||"")+'"></div>'+
'<div class="form-group"><label>Numero</label><input type="text" id="cfgNum" value="'+esc(c.hnum||"")+'"></div>'+
'<div class="form-group"><label>Complemento</label><input type="text" id="cfgCompl" value="'+esc(c.hcompl||"")+'"></div>'+
'<div class="form-group"><label>Bairro</label><input type="text" id="cfgBairro" value="'+esc(c.hbairro||"")+'"></div>'+
'<div class="form-group"><label>Estado (UF)</label><select id="cfgUf" onchange="carregarCidadesUf()">'+ufOpts+'</select></div>'+
'<div class="form-group"><label>Cidade</label><select id="cfgCidade" data-atual="'+esc(c.hcidade||"")+'"><option value="'+esc(c.hcidade||"")+'">'+(c.hcidade?esc(c.hcidade):"Selecione a UF primeiro")+'</option></select></div>'+
'</div>'+
'<h3 style="margin:22px 0 14px;color:var(--text)">Operacao</h3><div class="form-grid">'+
'<div class="form-group"><label>Horario Check-in</label><input type="time" id="cfgHci" value="'+esc(c.hci||"14:00")+'"></div>'+
'<div class="form-group"><label>Horario Check-out</label><input type="time" id="cfgHco" value="'+esc(c.hco||"12:00")+'"></div>'+
'<div class="form-group"><label>Taxa de Servico (%)</label><input type="number" id="cfgTax" value="'+(c.tax||10)+'" min="0" max="100"></div>'+
'</div><div class="form-actions"><button class="btn btn-primary" onclick="salvarConfigHotel()">Salvar</button></div></div>'}

// Ao renderizar a aba Hotel, se ja houver UF salva, carrega a lista de cidades para permitir troca
export function initFormHotel(){
  var uf=document.getElementById("cfgUf");
  if(uf&&uf.value) carregarCidadesUf();
}

export function salvarConfigHotel(){var cfg=St.gc();
var g=function(id){var el=document.getElementById(id);return el?el.value:"";};
cfg.hn=g("cfgNome")||"Hotel";cfg.hrazao=g("cfgRazao");cfg.htipodoc=g("cfgTipoDoc")||"cnpj";cfg.hcnpj=g("cfgCnpj");
cfg.htel=g("cfgTel");cfg.hemail=g("cfgEmail");
cfg.hcep=g("cfgCep");cfg.hend=g("cfgEnd");cfg.hnum=g("cfgNum");cfg.hcompl=g("cfgCompl");cfg.hbairro=g("cfgBairro");cfg.huf=g("cfgUf");cfg.hcidade=g("cfgCidade");
cfg.hci=g("cfgHci")||"14:00";cfg.hco=g("cfgHco")||"12:00";cfg.tax=parseFloat(g("cfgTax")||10);
St.sc(cfg);st("Configuracoes salvas!","success");}

// ---- Mascaras ----
export function mascaraDoc(el){
  var tipo=document.getElementById("cfgTipoDoc");tipo=tipo?tipo.value:"cnpj";
  var v=el.value.replace(/\D/g,"");
  if(tipo==="cpf"){v=v.slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");}
  else{v=v.slice(0,14).replace(/(\d{2})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1/$2").replace(/(\d{4})(\d{1,2})$/,"$1-$2");}
  el.value=v;
}
// wrappers finos sobre utils (mantem o nome usado nos onclick inline)
export function mascaraCep(el){mascCep(el);}
export function mascaraTel(el){mascTel(el);}

export function onTipoDocChange(){
  var tipo=document.getElementById("cfgTipoDoc").value;
  var lbl=document.getElementById("cfgDocLabel"),inp=document.getElementById("cfgCnpj"),btn=document.getElementById("cfgBuscaDoc");
  lbl.textContent=tipo==="cpf"?"CPF":"CNPJ";
  inp.placeholder=tipo==="cpf"?"000.000.000-00":"00.000.000/0000-00";
  inp.value="";btn.style.display=tipo==="cpf"?"none":"";
  document.getElementById("cfgDocMsg").textContent="";
}

// ---- APIs ----
export async function buscarCep(){
  var el=document.getElementById("cfgCep"),msg=document.getElementById("cfgCepMsg");
  var cep=(el.value||"").replace(/\D/g,"");
  if(cep.length!==8){msg.textContent="Informe um CEP com 8 digitos.";return;}
  msg.textContent="Buscando...";
  try{
    var r=await fetch("https://viacep.com.br/ws/"+cep+"/json/");
    var d=await r.json();
    if(d.erro){msg.textContent="CEP nao encontrado.";return;}
    if(d.logradouro)document.getElementById("cfgEnd").value=d.logradouro;
    if(d.bairro)document.getElementById("cfgBairro").value=d.bairro;
    if(d.uf){var uf=document.getElementById("cfgUf");uf.value=d.uf;await carregarCidadesUf(d.localidade);}
    msg.textContent="Endereco preenchido pelo CEP.";
  }catch(e){msg.textContent="Erro ao buscar o CEP.";}
}

export async function carregarCidadesUf(cidadeSelecionar){
  var uf=document.getElementById("cfgUf"),sel=document.getElementById("cfgCidade");
  if(!uf||!sel)return;
  var sigla=uf.value;
  var alvo=cidadeSelecionar||sel.getAttribute("data-atual")||sel.value;
  if(!sigla){sel.innerHTML='<option value="">Selecione a UF primeiro</option>';return;}
  sel.innerHTML='<option value="">Carregando...</option>';
  try{
    var r=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+sigla+"/municipios?orderBy=nome");
    var cidades=await r.json();
    sel.innerHTML='<option value="">Selecione a cidade</option>'+cidades.map(function(c){return'<option value="'+esc(c.nome)+'"'+(alvo===c.nome?' selected':'')+'>'+esc(c.nome)+'</option>'}).join('');
  }catch(e){sel.innerHTML='<option value="">Erro ao carregar cidades</option>';}
}

export async function buscarDocumento(){
  var inp=document.getElementById("cfgCnpj"),msg=document.getElementById("cfgDocMsg");
  var cnpj=(inp.value||"").replace(/\D/g,"");
  if(cnpj.length!==14){msg.textContent="Informe um CNPJ com 14 digitos.";return;}
  msg.textContent="Buscando dados na Receita...";
  try{
    var r=await fetch("https://brasilapi.com.br/api/cnpj/v1/"+cnpj);
    if(!r.ok){msg.textContent="CNPJ nao encontrado.";return;}
    var d=await r.json();
    if(d.razao_social)document.getElementById("cfgRazao").value=d.razao_social;
    if(d.nome_fantasia&&!document.getElementById("cfgNome").value)document.getElementById("cfgNome").value=d.nome_fantasia;
    if(d.cep)document.getElementById("cfgCep").value=(""+d.cep).replace(/\D/g,"").replace(/(\d{5})(\d)/,"$1-$2");
    if(d.logradouro)document.getElementById("cfgEnd").value=d.logradouro;
    if(d.numero)document.getElementById("cfgNum").value=d.numero;
    if(d.bairro)document.getElementById("cfgBairro").value=d.bairro;
    if(d.ddd_telefone_1){var t=document.getElementById("cfgTel");t.value=d.ddd_telefone_1;mascaraTel(t);}
    if(d.uf){var uf=document.getElementById("cfgUf");uf.value=d.uf;await carregarCidadesUf(d.municipio);}
    msg.textContent="Dados preenchidos pelo CNPJ.";
  }catch(e){msg.textContent="Erro ao consultar o CNPJ.";}
}

function formConfigTipoQuarto(tq){var html='<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Tipos de Quarto</h3>';
if(tq.length){html+='<table><tr><th>Nome</th><th>Capacidade</th><th>Preco Diaria</th><th>Acoes</th></tr>'+
tq.map(function(t){return'<tr><td>'+esc(t.nome)+'</td><td>'+t.capacidade+' pessoa(s)</td><td>'+fmtC(t.precoDiaria)+'</td><td><button class="btn btn-sm btn-primary" onclick="editarTipoQuarto(\''+t.id+'\')">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirTipoQuarto(\''+t.id+'\')">Excluir</button></td></tr>'}).join('')+'</table>';}
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

export function excluirTipoQuarto(id){
  var t=St.fi("tq",id);if(!t)return;
  // Impede excluir tipo com quartos ativos usando ele
  var usando=St.ga("q").filter(function(q){return q.tipoQuartoId===id&&q.ativo!==false});
  if(usando.length){st("Nao e possivel excluir: "+usando.length+" quarto(s) usam o tipo \""+t.nome+"\". Altere ou exclua esses quartos antes.","error");return;}
  confirmar({titulo:"Excluir o tipo \""+t.nome+"\"?",msg:"O tipo de quarto sera removido. Reservas antigas que o referenciam sao mantidas.",okLabel:"Sim, excluir",tipo:"danger"},function(){
    St.up("tq",id,{ativo:false});
    st("Tipo de quarto excluido.","warning");
    renderConfig();
  });
}

// ================= ABA TARIFAS (temporada / fim de semana) =================
var DIAS_SEM=[["0","Dom"],["1","Seg"],["2","Ter"],["3","Qua"],["4","Qui"],["5","Sex"],["6","Sab"]];
function nomeTipo(id){var t=St.fi("tq",id);return t?t.nome:"Tipo";}
function descRegra(t){
  if(t.tipoRegra==="periodo"){ return "Temporada: "+ (t.dataInicio?t.dataInicio.split("-").reverse().join("/"):"?") + " a " + (t.dataFim?t.dataFim.split("-").reverse().join("/"):"?"); }
  var ds=(t.diasSemana||[]).map(function(d){var x=DIAS_SEM[d];return x?x[1]:d;}).join(", ");
  return "Dias da semana: "+(ds||"-");
}

function formConfigTarifas(tq){
  tq=(tq||St.ga("tq")).filter(function(t){return t.ativo!==false;});
  var tarifas=St.ga("tf");
  var html='<div class="form-container"><h3 style="margin-bottom:6px;color:var(--text)">Tarifas por temporada e dia da semana</h3>'+
    '<p style="color:var(--text-mute);font-size:13px;margin-bottom:16px">Defina precos diferentes por periodo (alta/baixa temporada, feriados) ou por dias da semana. Sem regra, vale o preco padrao do tipo de quarto.</p>';
  if(!tq.length){ html+='<p style="color:var(--text-mute)">Cadastre tipos de quarto antes de criar tarifas.</p></div>'; return html; }
  if(tarifas.length){
    html+='<table><tr><th>Tipo</th><th>Regra</th><th>Quando</th><th>Preco</th><th>Acoes</th></tr>'+
    tarifas.sort(function(a,b){return (a.tipoQuartoId||"").localeCompare(b.tipoQuartoId||"");}).map(function(t){
      return '<tr><td>'+esc(nomeTipo(t.tipoQuartoId))+'</td>'+
        '<td>'+esc(t.nome||(t.tipoRegra==="periodo"?"Temporada":"Fim de semana"))+'</td>'+
        '<td>'+esc(descRegra(t))+'</td>'+
        '<td>'+fmtC(t.preco)+'</td>'+
        '<td><button class="btn btn-sm btn-primary" onclick="editarTarifa(\''+t.id+'\')">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirTarifa(\''+t.id+'\')">Excluir</button></td></tr>';
    }).join('')+'</table>';
  } else {
    html+='<p style="color:var(--text-mute)">Nenhuma tarifa especial cadastrada. Vale o preco padrao de cada tipo de quarto.</p>';
  }
  html+='<div class="form-actions"><button class="btn btn-primary" onclick="showNovaTarifa()">+ Nova tarifa</button></div></div>';
  // Assistente de precos (sugestoes por ocupacao) — renderizado a parte
  html+='<div class="form-container"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px"><h3 style="color:var(--text)">Assistente de precos</h3><button class="btn btn-sm btn-secondary" onclick="renderSugestoesTarifa()">Atualizar</button></div>'+
    '<p style="color:var(--text-mute);font-size:13px;margin-bottom:14px">Analisa a ocupacao dos proximos dias e <b>sugere</b> ajustes de diaria. Nada e alterado automaticamente: voce revisa e cria a tarifa se quiser.</p>'+
    '<div id="tarifasSugestoes"><p style="color:var(--text-mute)">Clique em "Atualizar" para gerar as sugestoes.</p></div></div>';
  return html;
}

// Gera e exibe as sugestoes de tarifa (assistente). Nao altera nada.
export function renderSugestoesTarifa(){
  var alvo=document.getElementById("tarifasSugestoes"); if(!alvo)return;
  var quartos=St.ga("q"), reservas=St.ga("r"), tipos=St.ga("tq");
  if(!tipos.filter(function(t){return t.ativo!==false;}).length || !quartos.filter(function(q){return q.ativo!==false;}).length){
    alvo.innerHTML='<p style="color:var(--text-mute)">Cadastre tipos de quarto e quartos para receber sugestoes.</p>'; return;
  }
  var sugestoes=sugerirTarifas(quartos, reservas, tipos, { hoje: td() });
  if(!sugestoes.length){
    alvo.innerHTML='<p style="color:var(--text-mute)">Sem sugestoes no momento. A ocupacao dos proximos dias esta equilibrada.</p>'; return;
  }
  // ordena: maiores acrescimos primeiro, depois por data
  sugestoes.sort(function(a,b){ return (b.delta-a.delta) || a.data.localeCompare(b.data); });
  var linhas=sugestoes.slice(0,40).map(function(s){
    var pct=Math.round(s.taxa*100);
    var badge=s.motivo==="alta"
      ? '<span class="badge badge-danger">Demanda alta '+pct+'%</span>'
      : '<span class="badge badge-info">Ultima hora '+pct+'%</span>';
    var setaCor=s.delta>0?"var(--pos)":"var(--warn)";
    return '<tr><td>'+esc(s.tipoNome)+'</td><td>'+fmtD(s.data)+'</td><td>'+badge+'</td>'+
      '<td>'+fmtC(s.precoBase)+' <span style="color:'+setaCor+'">&rarr; '+fmtC(s.precoSugerido)+'</span></td>'+
      '<td><button class="btn btn-sm btn-primary" onclick="aplicarSugestaoTarifa(\''+s.tipoId+'\',\''+s.data+'\','+s.precoSugerido+')">Criar tarifa</button></td></tr>';
  }).join('');
  alvo.innerHTML='<table><tr><th>Tipo</th><th>Data</th><th>Situacao</th><th>Diaria</th><th>Acao</th></tr>'+linhas+'</table>';
}

// Abre o form de nova tarifa por periodo ja pre-preenchido com a sugestao (operador aprova/edita e salva).
export function aplicarSugestaoTarifa(tipoId, dataISO, precoCentavos){
  showNovaTarifa();
  setTimeout(function(){
    var tipo=document.getElementById("tfTipo"), regra=document.getElementById("tfRegra"),
        ini=document.getElementById("tfInicio"), fim=document.getElementById("tfFim"),
        preco=document.getElementById("tfPreco"), nome=document.getElementById("tfNome");
    if(tipo)tipo.value=tipoId;
    if(regra){ regra.value="periodo"; if(typeof tarifaToggleRegra==="function")tarifaToggleRegra(); }
    if(ini)ini.value=dataISO;
    if(fim)fim.value=dataISO;
    if(preco)preco.value=(precoCentavos/100).toFixed(2);
    if(nome&&!nome.value)nome.value="Ajuste por demanda";
  },60);
}

function formTarifa(t){
  var tipos=St.ga("tq").filter(function(x){return x.ativo!==false;});
  var regra=t?t.tipoRegra:"periodo";
  var dias=t&&t.diasSemana?t.diasSemana:[5,6]; // padrao sex/sab
  return '<div class="form-group"><label>Tipo de quarto *</label><select id="tfTipo">'+
      tipos.map(function(x){return '<option value="'+x.id+'"'+(t&&t.tipoQuartoId===x.id?' selected':'')+'>'+esc(x.nome)+' (padrao '+fmtC(x.precoDiaria)+')</option>';}).join('')+
    '</select></div>'+
    '<div class="form-group"><label>Nome (opcional)</label><input type="text" id="tfNome" placeholder="Ex: Alta temporada, Feriado, Fim de semana" value="'+(t&&t.nome?esc(t.nome):"")+'"></div>'+
    '<div class="form-group"><label>Tipo de regra *</label><select id="tfRegra" onchange="tarifaToggleRegra()">'+
      '<option value="periodo"'+(regra==="periodo"?' selected':'')+'>Por periodo (datas)</option>'+
      '<option value="semana"'+(regra==="semana"?' selected':'')+'>Por dias da semana</option>'+
    '</select></div>'+
    '<div id="tfBoxPeriodo" style="display:'+(regra==="periodo"?"block":"none")+'"><div class="form-grid">'+
      '<div class="form-group"><label>Inicio</label><input type="date" id="tfInicio" value="'+(t&&t.dataInicio?t.dataInicio:"")+'"></div>'+
      '<div class="form-group"><label>Fim</label><input type="date" id="tfFim" value="'+(t&&t.dataFim?t.dataFim:"")+'"></div>'+
    '</div></div>'+
    '<div id="tfBoxSemana" style="display:'+(regra==="semana"?"block":"none")+'"><label style="display:block;margin-bottom:6px;color:var(--text-dim);font-size:13px">Dias da semana</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+
      DIAS_SEM.map(function(d){var on=dias.indexOf(Number(d[0]))>=0;return '<label class="tf-diachip"><input type="checkbox" class="tfDia" value="'+d[0]+'"'+(on?' checked':'')+'> '+d[1]+'</label>';}).join('')+
    '</div></div>'+
    '<div class="form-group"><label>Preco da diaria nesta regra (R$) *</label><input type="number" id="tfPreco" step="0.01" min="0" value="'+(t&&t.preco?(t.preco/100).toFixed(2):"")+'"></div>'+
    '<div class="form-group"><label>Prioridade (maior vence em caso de conflito)</label><input type="number" id="tfPrioridade" step="1" value="'+(t&&t.prioridade!=null?t.prioridade:0)+'"></div>';
}

export function showNovaTarifa(){
  if(!St.ga("tq").filter(function(x){return x.ativo!==false;}).length)return st("Cadastre um tipo de quarto primeiro.","error");
  sm("Nova tarifa",formTarifa(null),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarTarifa()">Salvar</button>');
}
export function editarTarifa(id){
  var t=St.fi("tf",id);if(!t)return;
  sm("Editar tarifa",formTarifa(t),'<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarTarifa(\''+id+'\')">Salvar</button>');
}
export function tarifaToggleRegra(){
  var r=document.getElementById("tfRegra");if(!r)return;
  var per=document.getElementById("tfBoxPeriodo"),sem=document.getElementById("tfBoxSemana");
  if(per)per.style.display=r.value==="periodo"?"block":"none";
  if(sem)sem.style.display=r.value==="semana"?"block":"none";
}
export function salvarTarifa(id){
  var tipo=document.getElementById("tfTipo"),nome=document.getElementById("tfNome"),regra=document.getElementById("tfRegra"),preco=document.getElementById("tfPreco"),prio=document.getElementById("tfPrioridade");
  if(!tipo||!tipo.value)return st("Selecione o tipo de quarto.","error"),false;
  var p=Math.round(parseFloat(preco&&preco.value?preco.value:0)*100);
  if(!p||p<=0)return st("Informe um preco valido.","error"),false;
  var dados={tipoQuartoId:tipo.value,nome:(nome?nome.value.trim():""),tipoRegra:regra.value,preco:p,prioridade:parseInt(prio&&prio.value?prio.value:0)||0,ativo:true};
  if(regra.value==="periodo"){
    var ci=document.getElementById("tfInicio"),cf=document.getElementById("tfFim");
    if(!ci||!ci.value||!cf||!cf.value)return st("Informe inicio e fim da temporada.","error"),false;
    if(ci.value>cf.value)return st("A data final deve ser depois da inicial.","error"),false;
    dados.dataInicio=ci.value;dados.dataFim=cf.value;dados.diasSemana=null;
  } else {
    var dias=Array.prototype.slice.call(document.querySelectorAll(".tfDia:checked")).map(function(c){return parseInt(c.value);});
    if(!dias.length)return st("Selecione ao menos um dia da semana.","error"),false;
    dados.diasSemana=dias;dados.dataInicio=null;dados.dataFim=null;
  }
  if(id){St.up("tf",id,dados);st("Tarifa atualizada!","success");auditar("tarifa.editar","Editou tarifa de "+nomeTipo(tipo.value));}
  else{St.in("tf",dados);st("Tarifa cadastrada!","success");auditar("tarifa.criar","Criou tarifa de "+nomeTipo(tipo.value)+" - "+fmtC(p));}
  cm();renderConfig();
}
export function excluirTarifa(id){
  var t=St.fi("tf",id);if(!t)return;
  confirmar({titulo:"Excluir tarifa?",msg:"Esta regra de preco sera removida. As diarias voltam a usar o preco padrao (ou outra regra).",okLabel:"Sim, excluir",tipo:"danger"},function(){
    St.rm("tf",id);
    auditar("tarifa.excluir","Excluiu tarifa de "+nomeTipo(t.tipoQuartoId));
    st("Tarifa excluida.","warning");
    renderConfig();
  });
}

// Formas de pagamento pre-definidas (sem o generico "cartao"; use Debito/Credito)
var FORMAS_PADRAO=["dinheiro","debito","credito","pix","boleto","cheque","transferencia","link","voucher"];
function rotuloForma(p){
  var mapa={dinheiro:"Dinheiro",debito:"Debito",credito:"Credito",pix:"Pix",boleto:"Boleto",cheque:"Cheque",transferencia:"Transferencia",link:"Link de pagamento",voucher:"Voucher / Cortesia"};
  return mapa[p]||(p.charAt(0).toUpperCase()+p.slice(1));
}

function formConfigPagamento(c){var check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
var pm=c.pm||[];
// personalizadas = o que esta em pm mas nao e forma padrao (ex: PicPay, Vale-refeicao)
var custom=pm.filter(function(p){return FORMAS_PADRAO.indexOf(p)<0;});
return'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Formas de Pagamento</h3>'+
'<p style="color:var(--text-mute);margin-bottom:16px">Selecione as formas aceitas pelo hotel. Voce tambem pode adicionar formas personalizadas.</p>'+
'<div class="pay-list">'+
FORMAS_PADRAO.map(function(p){return'<label class="pay-opt"><input type="checkbox" value="'+esc(p)+'" '+(pm.indexOf(p)>=0?'checked':'')+'><span class="pay-box">'+check+'</span><span class="pay-label">'+esc(rotuloForma(p))+'</span></label>'}).join('')+
custom.map(function(p){return'<label class="pay-opt"><input type="checkbox" value="'+esc(p)+'" checked><span class="pay-box">'+check+'</span><span class="pay-label">'+esc(p.charAt(0).toUpperCase()+p.slice(1))+'</span><button type="button" class="pay-del" title="Excluir forma personalizada" onclick="excluirFormaPagamento(event,\''+esc(p).replace(/'/g,"\\'")+'\')">&times;</button></label>'}).join('')+
'</div>'+
'<div class="pay-add"><input type="text" id="cfgNovaForma" placeholder="Adicionar forma (ex: PicPay, Vale-refeicao)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adicionarFormaPagamento()}"><button type="button" class="btn btn-secondary" onclick="adicionarFormaPagamento()">+ Adicionar</button></div>'+
'<div class="form-actions"><button class="btn btn-primary" onclick="salvarFormasPagamento()">Salvar</button></div></div>'+
'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Dados do Sistema</h3>'+
'<button class="btn btn-danger" onclick="restaurarDados()">Apagar dados do hotel</button>'+
'<p style="color:var(--text-mute);font-size:12px;margin-top:8px">Apaga todos os dados operacionais deste hotel (reservas, hospedes, quartos, etc.). Protegido por senha-mestra do dono.</p></div>'}

// Le as formas atualmente marcadas na tela (padrao + personalizadas)
function coletarFormasSelecionadas(){
  var arr=[];
  document.querySelectorAll("#configContent .pay-list input[type=checkbox]").forEach(function(cb){if(cb.checked)arr.push(cb.value)});
  return arr;
}

// Adiciona uma forma personalizada: grava na config e re-renderiza a aba (ja marcada)
export function adicionarFormaPagamento(){
  var inp=document.getElementById("cfgNovaForma");
  var nome=(inp&&inp.value?inp.value:"").trim().toLowerCase();
  if(!nome)return st("Digite o nome da forma de pagamento.","error"),false;
  var cfg=St.gc();
  var atuais=coletarFormasSelecionadas(); // preserva o que ja esta marcado antes de re-renderizar
  if(atuais.indexOf(nome)>=0 || FORMAS_PADRAO.indexOf(nome)>=0)return st("Essa forma ja existe.","warning"),false;
  atuais.push(nome);
  cfg.pm=atuais;
  St.sc(cfg);
  auditar("config.forma_pagamento","Adicionou forma de pagamento: "+nome);
  st("Forma adicionada!","success");
  document.getElementById("configContent").innerHTML=formConfigPagamento(St.gc());
}

// Exclui uma forma personalizada
export function excluirFormaPagamento(ev,nome){
  if(ev)ev.preventDefault();
  var cfg=St.gc();
  var atuais=coletarFormasSelecionadas().filter(function(p){return p!==nome;});
  cfg.pm=atuais;
  St.sc(cfg);
  auditar("config.forma_pagamento","Removeu forma de pagamento: "+nome);
  st("Forma removida.","warning");
  document.getElementById("configContent").innerHTML=formConfigPagamento(St.gc());
}

export function salvarFormasPagamento(){var cfg=St.gc();
cfg.pm=coletarFormasSelecionadas();
if(!cfg.pm.length)return st("Selecione ao menos uma forma.","error"),false;
St.sc(cfg);st("Formas de pagamento salvas!","success");}

export function restaurarDados(){
  sm("Restaurar Dados do Hotel",
    '<div class="alert alert-warning" style="margin-bottom:14px"><span class="aico-wrap">⚠️</span><span>Esta acao <b>apaga todos os dados operacionais</b> deste hotel: reservas, hospedes, quartos, tipos, servicos, consumos e pagamentos. Nao pode ser desfeita.</span></div>'+
    '<div class="form-group"><label>Senha-mestra do dono *</label><input type="password" id="cfgSenhaMestra" placeholder="Digite a senha-mestra" onkeydown="if(event.key===\'Enter\')confirmarRestauracao()"></div>'+
    '<small style="color:var(--text-mute);font-size:12px">Apenas quem tem a senha-mestra definida pelo dono pode executar.</small>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-danger" onclick="confirmarRestauracao()">Apagar dados do hotel</button>');
  setTimeout(function(){var s=document.getElementById("cfgSenhaMestra");if(s)s.focus();},60);
}

export async function confirmarRestauracao(){
  var s=document.getElementById("cfgSenhaMestra");
  var senha=s?s.value:"";
  if(!senha)return st("Digite a senha-mestra.","error");
  var btn=document.querySelector("#modalFooter .btn-danger");if(btn){btn.disabled=true;btn.textContent="Apagando...";}
  try{
    var { data, error } = await supabase.rpc("restaurar_dados_hotel", { p_senha: senha });
    if(error){
      if(btn){btn.disabled=false;btn.textContent="Apagar dados do hotel";}
      if((error.message||"").toLowerCase().indexOf("senha")>=0)return st("Senha-mestra incorreta.","error");
      return st("Nao foi possivel restaurar: "+error.message,"error");
    }
    auditar("hotel.apagar_dados","Apagou todos os dados operacionais do hotel");
    // recarrega o cache do hotel (agora vazio)
    await carregarTudo(getHotelId());
    cm();
    st("Dados do hotel restaurados (apagados).","success");
    renderConfig();
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent="Apagar dados do hotel";}
    st("Erro ao restaurar dados.","error");
  }
}
