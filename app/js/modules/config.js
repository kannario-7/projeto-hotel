// Módulo: Configurações
import { esc, fmtC } from "../utils.js";
import { St, carregarTudo, getHotelId, auditar, carregarAuditoria } from "../store.js";
import { st, sm, cm, closeModal, confirmar } from "../ui.js";
import { getCurrentUser } from "../auth.js";
import { renderUsuariosHotel } from "./usuarios.js";
import { supabase } from "../supabase.js";

export function renderConfig(){var el=document.getElementById("pageContent");
var config=St.gc();
el.innerHTML='<div class="page-header"><div><h2>Configuracoes</h2><p>Configurar dados do hotel e sistema</p></div></div>'+
'<div class="tabs">'+
'<div class="tab active" onclick="mudarConfigTab(this,\'hotel\')">Hotel</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'tp\')">Tipos de Quarto</div>'+
'<div class="tab" onclick="mudarConfigTab(this,\'pg\')">Pagamento</div>'+
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
else if(aba==="pg")html=formConfigPagamento(config);
document.getElementById("configContent").innerHTML=html;
if(aba==="hotel")setTimeout(initFormHotel,0);}

// ---- Aba Atividades (trilha de auditoria) ----
var ACAO_LABEL={
  "reserva.cancelar":{t:"Reserva cancelada",c:"#f16a6e"},
  "reserva.trocar_quarto":{t:"Troca de quarto",c:"#f5b53d"},
  "checkin.realizar":{t:"Check-in",c:"#43d18c"},
  "checkout.finalizar":{t:"Check-out",c:"var(--accent-2)"},
  "caixa.abrir":{t:"Caixa aberto",c:"#43d18c"},
  "caixa.fechar":{t:"Caixa fechado",c:"#3aa0d1"},
  "hotel.apagar_dados":{t:"Dados apagados",c:"#f16a6e"},
  "usuario.desativar":{t:"Usuario desativado",c:"#f16a6e"},
  "usuario.ativar":{t:"Usuario ativado",c:"#43d18c"}
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
    var meta=ACAO_LABEL[a.acao]||{t:a.acao,c:"var(--text-mute)"};
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
export function mascaraCep(el){el.value=el.value.replace(/\D/g,"").slice(0,8).replace(/(\d{5})(\d)/,"$1-$2");}
export function mascaraTel(el){var v=el.value.replace(/\D/g,"").slice(0,11);if(v.length>10)v=v.replace(/(\d{2})(\d{5})(\d{1,4})/,"($1) $2-$3");else if(v.length>6)v=v.replace(/(\d{2})(\d{4})(\d{1,4})/,"($1) $2-$3");else if(v.length>2)v=v.replace(/(\d{2})(\d+)/,"($1) $2");el.value=v;}

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

function formConfigPagamento(c){var check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
return'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Formas de Pagamento</h3>'+
'<p style="color:var(--text-mute);margin-bottom:16px">Selecione as formas de pagamento aceitas pelo hotel:</p>'+
'<div class="pay-list">'+
["dinheiro","cartao","debito","credito","pix","boleto","cheque"].map(function(p){return'<label class="pay-opt"><input type="checkbox" value="'+p+'" '+(c.pm&&c.pm.includes(p)?'checked':'')+'><span class="pay-box">'+check+'</span><span class="pay-label">'+esc(p.charAt(0).toUpperCase()+p.slice(1))+'</span></label>'}).join('')+
'</div>'+
'<div class="form-actions"><button class="btn btn-primary" onclick="salvarFormasPagamento()">Salvar</button></div></div>'+
'<div class="form-container"><h3 style="margin-bottom:16px;color:var(--text)">Dados do Sistema</h3>'+
'<button class="btn btn-danger" onclick="restaurarDados()">Apagar dados do hotel</button>'+
'<p style="color:var(--text-mute);font-size:12px;margin-top:8px">Apaga todos os dados operacionais deste hotel (reservas, hospedes, quartos, etc.). Protegido por senha-mestra do dono.</p></div>'}

export function salvarFormasPagamento(){var cfg=St.gc();cfg.pm=[];
document.querySelectorAll("#configContent input[type=checkbox]").forEach(function(cb){if(cb.checked)cfg.pm.push(cb.value)});
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
