// Motor de reservas PUBLICO (pagina sem login). Usa apenas as RPCs security definer
// (catalogo_publico / disponibilidade_publica / criar_reserva_publica) — nunca le tabelas direto.
import { supabase } from "./supabase.js";

function esc(s){ return (s==null?"":(""+s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
function fmtC(cent){ if(cent==null||isNaN(cent))return "R$ 0,00"; return "R$ "+(cent/100).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,"."); }
function fmtD(iso){ return iso?iso.split("-").reverse().join("/"):"-"; }
function td(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function somaDias(iso,n){ var p=iso.split("-"); var d=new Date(+p[0],+p[1]-1,+p[2]); d.setDate(d.getDate()+n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function toast(m,t){ var n=document.createElement("div"); n.className="toast "+(t||"info"); n.textContent=m; document.getElementById("toastContainer").appendChild(n); setTimeout(function(){n.remove();},3500); }

var SLUG = new URLSearchParams(location.search).get("h") || "";
var CATALOGO = null;     // {hotel, tipos}
var SELECAO = null;      // {tipoId, nome, preco, checkin, checkout}

var conteudo = document.getElementById("rvConteudo");

function card(html){ return '<div class="rv-card">'+html+'</div>'; }

async function iniciar(){
  if(!SLUG){ conteudo.innerHTML = card('<div class="rv-msg">Link invalido. Peca ao hotel o link correto de reservas.</div>'); return; }
  var { data, error } = await supabase.rpc("catalogo_publico", { p_slug: SLUG });
  if(error || !data || !data.ok){
    conteudo.innerHTML = card('<div class="rv-msg">As reservas online deste hotel nao estao disponiveis no momento.</div>');
    return;
  }
  CATALOGO = data;
  document.getElementById("rvHotel").textContent = data.hotel.nome || "Reservas";
  var local = [data.hotel.cidade, data.hotel.uf].filter(Boolean).join("/");
  document.getElementById("rvSub").textContent = local ? ("Reservas online — "+local) : "Consulte disponibilidade e solicite sua reserva";
  renderBuscaDatas();
}

function renderBuscaDatas(){
  var hoje = td(), amanha = somaDias(hoje,1);
  conteudo.innerHTML = card(
    '<h3 style="color:var(--text);font-family:Sora,sans-serif;margin-bottom:14px">Escolha as datas</h3>'+
    '<div class="form-grid">'+
    '<div class="form-group"><label>Check-in</label><input type="date" id="rvCi" min="'+hoje+'" value="'+hoje+'"></div>'+
    '<div class="form-group"><label>Check-out</label><input type="date" id="rvCo" min="'+amanha+'" value="'+amanha+'"></div>'+
    '</div>'+
    '<button class="btn btn-primary" id="rvBtnBuscar" style="width:100%;justify-content:center">Ver disponibilidade</button>'
  );
  document.getElementById("rvBtnBuscar").addEventListener("click", buscarDisponibilidade);
}

async function buscarDisponibilidade(){
  var ci=document.getElementById("rvCi").value, co=document.getElementById("rvCo").value;
  if(!ci||!co||co<=ci){ toast("O check-out deve ser depois do check-in.","error"); return; }
  var btn=document.getElementById("rvBtnBuscar"); if(btn){btn.disabled=true;btn.textContent="Buscando...";}
  var { data, error } = await supabase.rpc("disponibilidade_publica", { p_slug:SLUG, p_checkin:ci, p_checkout:co });
  if(btn){btn.disabled=false;btn.textContent="Ver disponibilidade";}
  if(error || !data || !data.ok){
    toast("Nao foi possivel consultar. Verifique as datas e tente de novo.","error"); return;
  }
  renderResultados(ci, co, data.itens||[]);
}

function renderResultados(ci, co, itens){
  var noites = (new Date(co)-new Date(ci))/86400000;
  var disponiveis = itens.filter(function(x){ return x.qtd_disponivel>0; });
  var html='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">'+
    '<h3 style="color:var(--text);font-family:Sora,sans-serif">Acomodacoes</h3>'+
    '<button class="btn btn-secondary btn-sm" id="rvVoltarDatas">Trocar datas</button></div>'+
    '<p style="color:var(--text-dim);font-size:13px;margin-bottom:14px">'+fmtD(ci)+' a '+fmtD(co)+' &middot; '+noites+' noite(s)</p>';
  if(!disponiveis.length){
    html += '<div class="rv-msg">Nenhuma acomodacao disponivel para essas datas. Tente outro periodo.</div>';
  } else {
    html += disponiveis.map(function(x){
      return '<div class="rv-tipo"><div class="rv-tipo-info"><b>'+esc(x.nome)+'</b>'+
        '<small>Ate '+esc(x.capacidade)+' pessoa(s) &middot; '+x.qtd_disponivel+' disponivel(is)</small></div>'+
        '<div class="rv-preco"><b>'+fmtC(x.preco)+'</b><small>'+noites+' noite(s)</small>'+
        '<button class="btn btn-primary btn-sm" style="margin-top:6px" data-tipo="'+esc(x.tipoId)+'" data-nome="'+esc(x.nome)+'" data-preco="'+x.preco+'">Reservar</button></div></div>';
    }).join('');
  }
  conteudo.innerHTML = card(html);
  document.getElementById("rvVoltarDatas").addEventListener("click", renderBuscaDatas);
  conteudo.querySelectorAll("button[data-tipo]").forEach(function(b){
    b.addEventListener("click", function(){
      SELECAO = { tipoId:b.getAttribute("data-tipo"), nome:b.getAttribute("data-nome"), preco:Number(b.getAttribute("data-preco")), checkin:ci, checkout:co, noites:noites };
      renderFormHospede();
    });
  });
}

function renderFormHospede(){
  conteudo.innerHTML = card(
    '<h3 style="color:var(--text);font-family:Sora,sans-serif;margin-bottom:4px">Seus dados</h3>'+
    '<p style="color:var(--text-dim);font-size:13px;margin-bottom:14px">'+esc(SELECAO.nome)+' &middot; '+fmtD(SELECAO.checkin)+' a '+fmtD(SELECAO.checkout)+' &middot; <b style="color:var(--text)">'+fmtC(SELECAO.preco)+'</b></p>'+
    '<div class="form-group"><label>Nome completo *</label><input type="text" id="rvNome" placeholder="Seu nome"></div>'+
    '<div class="form-grid">'+
    '<div class="form-group"><label>E-mail</label><input type="email" id="rvEmail" placeholder="voce@email.com"></div>'+
    '<div class="form-group"><label>Telefone</label><input type="text" id="rvTel" placeholder="(11) 99999-9999"></div>'+
    '</div>'+
    '<div class="form-group"><label>CPF (opcional)</label><input type="text" id="rvDoc" placeholder="000.000.000-00"></div>'+
    '<p style="color:var(--text-mute);font-size:12px;margin-bottom:12px">Informe e-mail ou telefone para contato. Sua reserva sera confirmada pelo hotel.</p>'+
    '<div style="display:flex;gap:8px"><button class="btn btn-secondary" id="rvVoltarTipos" style="flex:1;justify-content:center">Voltar</button>'+
    '<button class="btn btn-primary" id="rvEnviar" style="flex:2;justify-content:center">Solicitar reserva</button></div>'
  );
  document.getElementById("rvVoltarTipos").addEventListener("click", function(){ buscarDisponibilidadeReusar(); });
  document.getElementById("rvEnviar").addEventListener("click", enviarReserva);
}
// reexibe a lista mantendo as datas ja escolhidas
function buscarDisponibilidadeReusar(){
  // reconsulta com as datas da selecao
  supabase.rpc("disponibilidade_publica", { p_slug:SLUG, p_checkin:SELECAO.checkin, p_checkout:SELECAO.checkout }).then(function(res){
    if(res.data && res.data.ok) renderResultados(SELECAO.checkin, SELECAO.checkout, res.data.itens||[]);
    else renderBuscaDatas();
  });
}

async function enviarReserva(){
  var nome=document.getElementById("rvNome").value.trim();
  var email=document.getElementById("rvEmail").value.trim();
  var tel=document.getElementById("rvTel").value.trim();
  var doc=document.getElementById("rvDoc").value.trim();
  if(!nome){ toast("Informe seu nome.","error"); return; }
  if(!email && !tel){ toast("Informe e-mail ou telefone para contato.","error"); return; }
  var btn=document.getElementById("rvEnviar"); if(btn){btn.disabled=true;btn.textContent="Enviando...";}
  var { data, error } = await supabase.rpc("criar_reserva_publica", {
    p_slug:SLUG, p_tipo:SELECAO.tipoId, p_checkin:SELECAO.checkin, p_checkout:SELECAO.checkout,
    p_nome:nome, p_email:email, p_tel:tel, p_doc:doc
  });
  if(btn){btn.disabled=false;btn.textContent="Solicitar reserva";}
  if(error || !data || !data.ok){
    var motivo = data && data.motivo;
    var msg = motivo==="sem_disponibilidade" ? "Esta acomodacao acabou de ser reservada. Tente outras datas." :
              motivo==="muitas_solicitacoes" ? "Voce ja tem solicitacoes pendentes. Aguarde o contato do hotel." :
              motivo==="datas_invalidas" ? "As datas informadas nao sao validas." :
              "Nao foi possivel enviar a solicitacao. Tente novamente.";
    toast(msg,"error"); return;
  }
  renderSucesso(data);
}

function renderSucesso(data){
  conteudo.innerHTML = card(
    '<div class="rv-ok">'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="var(--pos)" stroke-width="2" style="width:52px;height:52px"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>'+
    '<h3 style="color:var(--text);font-family:Sora,sans-serif;margin-top:10px">Solicitacao enviada!</h3>'+
    '<div class="rv-proto">#'+esc(data.protocolo)+'</div>'+
    '<p style="color:var(--text-dim)">Sua reserva de '+esc(SELECAO.nome)+' para '+fmtD(SELECAO.checkin)+' a '+fmtD(SELECAO.checkout)+' foi registrada como <b>pendente</b>.</p>'+
    '<p style="color:var(--text-dim);margin-top:6px">O hotel entrara em contato para confirmar. Guarde o numero do protocolo.</p>'+
    '<button class="btn btn-secondary" id="rvNova" style="margin-top:16px">Fazer outra reserva</button>'+
    '</div>'
  );
  document.getElementById("rvNova").addEventListener("click", renderBuscaDatas);
}

iniciar();
