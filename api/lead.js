// Vercel Serverless Function: recebe um lead de fontes externas e grava no CRM.
// URL: POST /api/lead   (JSON: { nome, email, telefone, mensagem, origem? })
//      GET  /api/lead?nome=...&email=...&telefone=...&mensagem=...   (para testes/integrações simples)
//
// Serve como "porta de entrada" para integrar depois com Meta Lead Ads, Google,
// formulários externos, Zapier/Make, etc. Basta a fonte fazer POST aqui.
// A gravação usa a RPC pública captar_lead (security definer) — nenhuma leitura
// de leads é possível por aqui, só inserção.

var SUPABASE_URL = "https://bizfrksuwscosxutunfy.supabase.co"; // publico
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpemZya3N1d3Njb3N4dXR1bmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjk4NzIsImV4cCI6MjEwMzgwNTg3Mn0.kRglbjmeLup0Tn7Nn5doFXMAtrsAYk25x3fZcoCdr5k";

function pick(obj, keys){
  for(var i=0;i<keys.length;i++){ if(obj && obj[keys[i]]!=null && (""+obj[keys[i]]).trim()!=="") return (""+obj[keys[i]]).trim(); }
  return null;
}

module.exports = async function handler(req, res){
  // CORS básico (permite chamadas de formulários externos)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if(req.method === "OPTIONS"){ res.status(204).end(); return; }

  // Aceita corpo JSON (POST) ou querystring (GET). Nomes de campos flexíveis
  // para acomodar diferentes fontes (name/full_name, phone/whatsapp, etc.).
  var src = {};
  if(req.method === "POST"){
    src = (typeof req.body === "object" && req.body) ? req.body : {};
    if(typeof req.body === "string"){ try{ src = JSON.parse(req.body); }catch(e){ src = {}; } }
  } else {
    src = req.query || {};
  }

  var nome     = pick(src, ["nome","name","full_name","fullName"]);
  var email    = pick(src, ["email","e-mail","mail"]);
  var telefone = pick(src, ["telefone","phone","whatsapp","tel","celular"]);
  var mensagem = pick(src, ["mensagem","message","msg","obs","observacao"]);
  var origem   = pick(src, ["origem","source"]) || "api";

  if(!nome || (!email && !telefone)){
    res.status(400).json({ ok:false, error:"Informe nome e (e-mail ou telefone)." });
    return;
  }

  try{
    var resp = await fetch(SUPABASE_URL + "/rest/v1/rpc/captar_lead", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_nome: nome, p_email: email, p_telefone: telefone,
        p_mensagem: mensagem, p_origem: (origem === "landing" ? "api" : origem)
      })
    });
    if(!resp.ok){
      var err = await resp.text();
      res.status(502).json({ ok:false, error:"Falha ao gravar o lead.", detalhe: err });
      return;
    }
    var id = await resp.json();
    res.status(200).json({ ok:true, id: id });
  }catch(e){
    res.status(500).json({ ok:false, error:"Erro interno ao processar o lead." });
  }
};
