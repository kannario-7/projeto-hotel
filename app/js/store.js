// Camada de dados do HospedaPrime.
// Mantém uma API síncrona (para os módulos de tela) sobre um CACHE em memória,
// que é carregado do Supabase no login e cujas escritas são espelhadas no banco.
import { esc } from "./utils.js";
import * as db from "./db.js";

// Cache em memória dos dados do hotel atual
var cache = { tq:[], q:[], h:[], sv:[], r:[], os:[], pg:[], fa:[], ds:[], sc:[] };
var config = { pm:["dinheiro","cartao","debito","credito","pix"], hci:"14:00", hco:"12:00", tax:10, hn:"", hcnpj:"", htel:"", hemail:"" };
var hotelIdAtual = null;

export function setHotelId(id){ hotelIdAtual = id; }
export function getHotelId(){ return hotelIdAtual; }

var planoStatus = null;
export function getPlanoStatus(){ return planoStatus; }

// Carrega tudo do hotel para o cache (chamado após login)
export async function carregarTudo(hotelId){
  hotelIdAtual = hotelId;
  cache = await db.carregarHotel(hotelId);
  var c = await db.carregarConfig(hotelId);
  if(c) config = c;
  try{ var { data } = await db.supabaseRpcPlano(); planoStatus = data && data[0] ? data[0] : null; }
  catch(e){ planoStatus = null; }
}

export var St = {
  ga:function(k){ return cache[k] ? cache[k].slice() : []; },
  gc:function(){ return config; },
  sc:function(v){ config = v; db.salvarConfig(hotelIdAtual, v); },
  fi:function(k,i){ return (cache[k]||[]).find(function(x){return x.id===i}); },
  // insert: grava no cache com id temporário e espelha no Supabase
  in:function(k,v){ 
    var temp = Object.assign({}, v);
    if(!temp.id) temp.id = crypto.randomUUID();
    cache[k] = cache[k] || [];
    cache[k].push(temp);
    db.inserir(k, v, hotelIdAtual).then(function(saved){
      if(saved){ var idx = cache[k].findIndex(function(x){return x.id===temp.id}); if(idx>-1) cache[k][idx]=saved; }
    });
    return temp;
  },
  // insert assíncrono: aguarda o banco e retorna o objeto com o id REAL (evita id temporário em referências)
  inAsync:async function(k,v){
    var saved = await db.inserir(k, v, hotelIdAtual);
    if(saved){ cache[k] = cache[k] || []; cache[k].push(saved); return saved; }
    // fallback: se falhar, usa o modo síncrono com id temporário
    return this.in(k, v);
  },
  up:function(k,i,u){
    var a = cache[k]||[], p = a.findIndex(function(x){return x.id===i});
    if(p>-1){ Object.assign(a[p], u); db.atualizar(k, i, a[p], hotelIdAtual); return a[p]; }
    return null;
  },
  rm:function(k,i){
    cache[k] = (cache[k]||[]).filter(function(x){return x.id!==i});
    db.remover(k, i);
  }
};

export function getStatusBadge(s){var m={disponivel:"success",ocupado:"info",reservado:"warning",pendente:"warning",confirmada:"info",checkin:"info",checkout:"",cancelada:"danger",manutencao:"danger",limpeza:"warning"};return'<span class="badge badge-'+m[s]+'">'+esc(s.charAt(0).toUpperCase()+s.slice(1))+'</span>'}
export function checkDisponivel(quartoId,checkin,checkout,excluirId){return!St.ga("r").some(function(r){return r.id!==excluirId&&r.quartoId===quartoId&&["confirmada","pendente","checkin"].includes(r.status)&&r.dataCheckin<checkout&&r.dataCheckout>checkin})}
export function quartosDisponiveis(tipoId,checkin,checkout,excluirId){return St.ga("q").filter(function(q){return q.ativo!==false&&q.tipoQuartoId===tipoId&&(q.status==="disponivel"||q.status==="limpeza")&&checkDisponivel(q.id,checkin,checkout,excluirId)})}

// Popula dados de exemplo para um hotel recém-criado (uma vez)
export async function seedHotel(hotelId){
  var tp=[["Standard",2,19900],["Superior",3,29900],["Deluxe",3,44900],["Suite Master",4,69900]];
  var tipos=[];
  for(var i=0;i<tp.length;i++){ var t=await db.inserir("tq",{nome:tp[i][0],capacidade:tp[i][1],precoDiaria:tp[i][2],ativo:true},hotelId); if(t)tipos.push(t); }
  var sc=[["Cafe da Manha",3500],["Lavanderia",1500],["Estacionamento",2500],["Minibar",800],["Spa Massagem",12000]];
  for(var j=0;j<sc.length;j++){ await db.inserir("sv",{nome:sc[j][0],preco:sc[j][1],categoria:"Servico",unidade:"unidade",ativo:true},hotelId); }
  for(var a=1;a<=3;a++){ for(var q=0;q<3;q++){ var ti=a<=1?0:a===2?1:2; await db.inserir("q",{numero:""+(a*100+q+1),andar:a,tipoQuartoId:tipos[ti]?tipos[ti].id:null,status:"disponivel",ativo:true},hotelId); } }
}
