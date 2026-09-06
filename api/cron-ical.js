// Vercel Cron: sincroniza automaticamente os calendarios iCal de TODOS os quartos com links.
// Agendado no vercel.json (1x/dia no plano gratuito). Protegido por CRON_SECRET:
//  - a Vercel envia o header "Authorization: Bearer <CRON_SECRET>" nas chamadas agendadas;
//  - chamadas sem o segredo correto sao recusadas (401), entao a rota nao fica aberta ao publico.
// Reusa as RPCs listar_quartos_ical (lista os quartos) e sync_bloqueios_quarto (grava os bloqueios).

var SUPABASE_URL = "https://bizfrksuwscosxutunfy.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpemZya3N1d3Njb3N4dXR1bmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjk4NzIsImV4cCI6MjEwMzgwNTg3Mn0.kRglbjmeLup0Tn7Nn5doFXMAtrsAYk25x3fZcoCdr5k";

function rpc(nome, corpo){
  return fetch(SUPABASE_URL + "/rest/v1/rpc/" + nome, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(corpo)
  }).then(function(r){ return r.json(); });
}
function desdobrar(t){ return t.replace(/\r\n/g,"\n").replace(/\n[ \t]/g,""); }
function normalizarData(v){ if(!v)return null; var m=v.match(/(\d{4})(\d{2})(\d{2})/); return m?(m[1]+"-"+m[2]+"-"+m[3]):null; }
function parseEventos(ics){
  var eventos=[]; var txt=desdobrar(ics); var blocos=txt.split("BEGIN:VEVENT");
  for(var i=1;i<blocos.length;i++){
    var b=blocos[i].split("END:VEVENT")[0];
    var mIni=b.match(/DTSTART[^:]*:([0-9TZ]+)/), mFim=b.match(/DTEND[^:]*:([0-9TZ]+)/);
    var ini=mIni?normalizarData(mIni[1]):null, fim=mFim?normalizarData(mFim[1]):null;
    if(ini&&fim) eventos.push({ inicio:ini, fim:fim });
  }
  return eventos;
}
async function baixarEventos(urls){
  var todos=[];
  for(var i=0;i<urls.length;i++){
    var item=urls[i]; var u=(item&&item.url)?item.url:item;
    if(!u||!/^https?:\/\//i.test(u)) continue;
    try{
      var ctrl=new AbortController(); var tmo=setTimeout(function(){ctrl.abort();},12000);
      var resp=await fetch(u,{signal:ctrl.signal,headers:{"User-Agent":"HospedaPrime-Cron/1.0"}});
      clearTimeout(tmo);
      todos=todos.concat(parseEventos(await resp.text()));
    }catch(e){ /* fonte falhou: ignora, continua */ }
  }
  return todos;
}

module.exports = async function handler(req, res){
  var secret = process.env.CRON_SECRET || "";
  // A Vercel Cron envia Authorization: Bearer <CRON_SECRET>. Sem segredo configurado -> recusa (seguro).
  var auth = req.headers ? (req.headers.authorization || req.headers.Authorization || "") : "";
  if(!secret || auth !== ("Bearer " + secret)){
    res.status(401).json({ ok:false, motivo:"nao_autorizado" });
    return;
  }
  try{
    var lista = await rpc("listar_quartos_ical", { p_secret: secret });
    if(!lista || !lista.ok){ res.status(500).json({ ok:false, motivo:"segredo_incorreto_no_banco" }); return; }
    var quartos = Array.isArray(lista.quartos) ? lista.quartos : [];
    var totalCriados = 0, totalQuartos = 0;
    for(var i=0;i<quartos.length;i++){
      var q = quartos[i];
      var eventos = await baixarEventos(Array.isArray(q.urls)?q.urls:[]);
      var r = await rpc("sync_bloqueios_quarto", { p_token: q.token, p_eventos: eventos });
      if(r && r.ok){ totalCriados += (r.criados||0); totalQuartos++; }
    }
    res.status(200).json({ ok:true, quartos: totalQuartos, bloqueios: totalCriados });
  }catch(e){
    res.status(500).json({ ok:false, motivo:"erro_interno" });
  }
};
