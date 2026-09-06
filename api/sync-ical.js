// Vercel Serverless Function: importa os calendarios externos (Airbnb/Booking) de UM quarto
// e cria os BLOQUEIOS correspondentes no HospedaPrime, chamando a RPC sync_bloqueios_quarto.
// URL: /api/sync-ical?t=<ical_token-do-quarto>  (GET ou POST)
// Baixa os .ics server-side (sem CORS), faz parse dos VEVENT (datas ocupadas) e sincroniza.

var SUPABASE_URL = "https://bizfrksuwscosxutunfy.supabase.co"; // publico
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpemZya3N1d3Njb3N4dXR1bmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjk4NzIsImV4cCI6MjEwMzgwNTg3Mn0.kRglbjmeLup0Tn7Nn5doFXMAtrsAYk25x3fZcoCdr5k";

function rpc(nome, corpo){
  return fetch(SUPABASE_URL + "/rest/v1/rpc/" + nome, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(corpo)
  }).then(function(r){ return r.json(); });
}

// desdobra linhas continuadas do iCal (linhas que comecam com espaco/tab pertencem a anterior)
function desdobrar(texto){
  return texto.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}
// yyyymmdd (ou yyyymmddThhmmssZ) -> yyyy-mm-dd
function normalizarData(v){
  if(!v) return null;
  var m = v.match(/(\d{4})(\d{2})(\d{2})/);
  if(!m) return null;
  return m[1] + "-" + m[2] + "-" + m[3];
}
// extrai eventos [{inicio,fim}] de um texto iCal
function parseEventos(ics){
  var eventos = [];
  var txt = desdobrar(ics);
  var blocos = txt.split("BEGIN:VEVENT");
  for(var i=1;i<blocos.length;i++){
    var b = blocos[i].split("END:VEVENT")[0];
    var mIni = b.match(/DTSTART[^:]*:([0-9TZ]+)/);
    var mFim = b.match(/DTEND[^:]*:([0-9TZ]+)/);
    var ini = mIni ? normalizarData(mIni[1]) : null;
    var fim = mFim ? normalizarData(mFim[1]) : null;
    if(ini && fim){ eventos.push({ inicio: ini, fim: fim }); }
  }
  return eventos;
}

module.exports = async function handler(req, res){
  var token = (req.query && req.query.t) ? String(req.query.t) : "";
  if(!token){ res.status(400).json({ ok:false, motivo:"token_ausente" }); return; }
  try {
    // 1) pega as urls externas do quarto
    var info = await rpc("ical_urls_do_quarto", { p_token: token });
    if(!info || !info.ok){ res.status(404).json({ ok:false, motivo:"quarto_invalido" }); return; }
    var urls = Array.isArray(info.urls) ? info.urls : [];
    // 2) baixa e parseia cada .ics (falha de uma fonte nao aborta as outras)
    var todos = [];
    var fontes = [];
    for(var i=0;i<urls.length;i++){
      var item = urls[i];
      var u = (item && item.url) ? item.url : item; // aceita {url,label} ou string
      if(!u || !/^https?:\/\//i.test(u)){ fontes.push({ url:u, erro:"url_invalida" }); continue; }
      try {
        var ctrl = new AbortController();
        var tmo = setTimeout(function(){ ctrl.abort(); }, 12000);
        var resp = await fetch(u, { signal: ctrl.signal, headers:{ "User-Agent":"HospedaPrime-Sync/1.0" } });
        clearTimeout(tmo);
        var texto = await resp.text();
        var evs = parseEventos(texto);
        todos = todos.concat(evs);
        fontes.push({ url:u, eventos: evs.length });
      } catch(e){
        fontes.push({ url:u, erro:"falha_download" });
      }
    }
    // 3) sincroniza os bloqueios no banco (substitui os externos do quarto)
    var r = await rpc("sync_bloqueios_quarto", { p_token: token, p_eventos: todos });
    res.status(200).json({ ok: !!(r && r.ok), criados: r && r.criados, pulados: r && r.pulados, fontes: fontes });
  } catch(e){
    res.status(500).json({ ok:false, motivo:"erro_interno" });
  }
};
