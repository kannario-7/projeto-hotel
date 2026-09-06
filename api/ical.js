// Vercel Serverless Function: exporta o calendario iCal (.ics) de um quarto.
// URL: /api/ical?t=<token-do-quarto>  -> devolve text/calendar com as datas OCUPADAS.
// Cola-se essa URL no Airbnb/Booking para que eles bloqueiem as datas ja reservadas aqui.
// Nao expoe nome de hospede nem valores (a RPC ical_reservas retorna so datas).

var SUPABASE_URL = "https://bizfrksuwscosxutunfy.supabase.co"; // publico
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpemZya3N1d3Njb3N4dXR1bmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjk4NzIsImV4cCI6MjEwMzgwNTg3Mn0.kRglbjmeLup0Tn7Nn5doFXMAtrsAYk25x3fZcoCdr5k";

// data ISO (yyyy-mm-dd) -> formato de data iCal (yyyymmdd)
function dataIcal(iso){ return (iso||"").slice(0,10).replace(/-/g,""); }
function pad(n){ return String(n).padStart(2,"0"); }
function agoraUTC(){
  var d=new Date();
  return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+"T"+pad(d.getUTCHours())+pad(d.getUTCMinutes())+pad(d.getUTCSeconds())+"Z";
}

module.exports = async function handler(req, res){
  var token = (req.query && req.query.t) ? String(req.query.t) : "";
  var linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HospedaPrime//Reservas//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];
  var nomeQuarto = "Quarto";
  try {
    if(token){
      var resp = await fetch(SUPABASE_URL + "/rest/v1/rpc/ical_reservas", {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: token })
      });
      var data = await resp.json();
      if(data && data.ok && Array.isArray(data.eventos)){
        if(data.quarto) nomeQuarto = "Apto " + data.quarto;
        var stamp = agoraUTC();
        data.eventos.forEach(function(ev){
          // DTEND no iCal e exclusivo -> usamos a propria data de checkout (dia da saida fica livre)
          linhas.push("BEGIN:VEVENT");
          linhas.push("UID:" + ev.id + "@hospedaprime");
          linhas.push("DTSTAMP:" + stamp);
          linhas.push("DTSTART;VALUE=DATE:" + dataIcal(ev.inicio));
          linhas.push("DTEND;VALUE=DATE:" + dataIcal(ev.fim));
          linhas.push("SUMMARY:Ocupado");
          linhas.push("TRANSP:OPAQUE");
          linhas.push("END:VEVENT");
        });
      }
    }
  } catch(e){
    // em erro, devolve calendario vazio valido (nao quebra a sincronizacao da OTA)
  }
  linhas.push("END:VCALENDAR");
  var corpo = linhas.join("\r\n") + "\r\n";

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="hospedaprime.ics"');
  // cache curto: OTAs puxam periodicamente; 5 min evita excesso de chamadas sem atrasar demais
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send(corpo);
};
