// Presença em tempo real (quem está online AGORA) via Supabase Realtime Presence.
//
// Cada usuário logado entra em um canal de presença do seu hotel e "anuncia" que
// está online (track). As telas de lista escutam esse canal e sabem, ao vivo, quais
// user_ids estão online — atualizando quando alguém entra (join) ou sai (leave).
//
// O dono (super-admin) pode acompanhar QUALQUER hotel: nesse caso abrimos um canal
// observador para o hotel consultado (sem anunciar presença, só ouvindo).

import { supabase } from "./supabase.js";

var meuUserId = null;
var meuHotelId = null;

// Um registro por hotel observado: { canal, online:{id:true}, listeners:Set, tracking:bool }
var canais = {};

function nomeCanal(hotelId){ return "presenca:hotel:" + hotelId; }

// Lê o presenceState do canal e retorna { user_id: true } de quem está online.
function idsOnline(canal){
  var set = {};
  try{
    var estado = canal.presenceState();
    Object.keys(estado).forEach(function(k){
      (estado[k] || []).forEach(function(meta){ if(meta && meta.user_id) set[meta.user_id] = true; });
    });
  }catch(e){}
  return set;
}

// Abre (ou reaproveita) o canal de um hotel. Se anunciar=true, o usuário atual
// entra como presente (track). Telas observadoras usam anunciar=false.
function abrirCanal(hotelId, anunciar){
  var reg = canais[hotelId];
  if(reg){
    if(anunciar && !reg.tracking && meuUserId){
      reg.tracking = true;
      try{ reg.canal.track({ user_id: meuUserId, online_em: new Date().toISOString() }); }catch(e){}
    }
    return reg;
  }
  var key = anunciar && meuUserId ? meuUserId : ("obs:" + Math.random().toString(36).slice(2));
  var canal = supabase.channel(nomeCanal(hotelId), { config:{ presence:{ key: key } } });
  reg = canais[hotelId] = { canal: canal, online:{}, listeners:new Set(), tracking:false };
  function refresh(){ reg.online = idsOnline(canal); reg.listeners.forEach(function(cb){ try{ cb(reg.online); }catch(e){} }); }
  canal.on("presence", { event:"sync" }, refresh);
  canal.on("presence", { event:"join" }, refresh);
  canal.on("presence", { event:"leave" }, refresh);
  canal.subscribe(async function(status){
    if(status === "SUBSCRIBED"){
      if(anunciar && meuUserId){ reg.tracking = true; try{ await canal.track({ user_id: meuUserId, online_em:new Date().toISOString() }); }catch(e){} }
      refresh();
    }
  });
  return reg;
}

async function fecharCanal(hotelId){
  var reg = canais[hotelId];
  if(!reg) return;
  try{ if(reg.tracking) await reg.canal.untrack(); }catch(e){}
  try{ await supabase.removeChannel(reg.canal); }catch(e){}
  delete canais[hotelId];
}

// ===== API PUBLICA =====

// Chamar após autenticar: usuário passa a aparecer como online no seu hotel.
export function iniciarPresenca(userId, hotelId){
  if(!userId || !hotelId) return;
  meuUserId = userId;
  meuHotelId = hotelId;
  abrirCanal(hotelId, true);
}

// Chamar no logout: remove a presença e fecha todos os canais.
export async function pararPresenca(){
  var ids = Object.keys(canais);
  for(var i=0;i<ids.length;i++){ await fecharCanal(ids[i]); }
  meuUserId = null; meuHotelId = null;
}

// Observa quem está online em um hotel. callback recebe { user_id:true } e é chamado
// a cada mudança. Retorna uma função para cancelar a observação.
export function observarHotel(hotelId, callback){
  if(!hotelId || typeof callback !== "function") return function(){};
  // se for o meu hotel, anuncio presença; se for de terceiros (dono), só observo
  var anunciar = (hotelId === meuHotelId);
  var reg = abrirCanal(hotelId, anunciar);
  reg.listeners.add(callback);
  // entrega imediata do estado atual
  setTimeout(function(){ try{ callback(reg.online); }catch(e){} }, 0);
  return function(){
    reg.listeners.delete(callback);
    // fecha o canal se ninguém mais observa E não é onde eu anuncio minha presença
    if(reg.listeners.size === 0 && hotelId !== meuHotelId){ fecharCanal(hotelId); }
  };
}
