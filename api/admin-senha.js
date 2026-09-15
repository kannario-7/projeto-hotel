// Vercel Serverless Function: redefine a senha de um usuario.
// URL: POST /api/admin-senha   Header: Authorization: Bearer <access_token do solicitante>
//      Body JSON: { user_id: "<id do alvo>", nova_senha: "..." }
//
// Regras de autorizacao (validadas AQUI, no servidor):
//   - Dono do SaaS (is_owner = true)  -> pode redefinir a senha de QUALQUER usuario.
//   - Admin do hotel (papel = 'admin') -> pode redefinir a senha de usuarios do MESMO hotel,
//                                          exceto o dono do SaaS.
// A SERVICE_ROLE_KEY (Admin API) fica SOMENTE no servidor, nunca no front-end.

var SUPABASE_URL = "https://bizfrksuwscosxutunfy.supabase.co"; // publico
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpemZya3N1d3Njb3N4dXR1bmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjk4NzIsImV4cCI6MjEwMzgwNTg3Mn0.kRglbjmeLup0Tn7Nn5doFXMAtrsAYk25x3fZcoCdr5k";
// Definir em Vercel: Project Settings > Environment Variables > SUPABASE_SERVICE_ROLE_KEY
var SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Le o corpo (JSON) de forma tolerante (Vercel normalmente ja entrega req.body como objeto).
function lerCorpo(req){
  if(req && typeof req.body === "object" && req.body) return req.body;
  if(req && typeof req.body === "string"){ try{ return JSON.parse(req.body); }catch(e){ return {}; } }
  return {};
}

// Busca 1 perfil (id, papel, hotel_id, is_owner) usando a service_role (ignora RLS).
async function buscarPerfil(id){
  var url = SUPABASE_URL + "/rest/v1/perfis?select=id,papel,hotel_id,is_owner&id=eq." + encodeURIComponent(id);
  var r = await fetch(url, {
    headers: { "apikey": SERVICE_ROLE_KEY, "Authorization": "Bearer " + SERVICE_ROLE_KEY }
  });
  if(!r.ok) return null;
  var arr = await r.json();
  return (Array.isArray(arr) && arr.length) ? arr[0] : null;
}

module.exports = async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if(req.method === "OPTIONS"){ res.status(204).end(); return; }
  if(req.method !== "POST"){ res.status(405).json({ ok:false, error:"Método não permitido." }); return; }

  if(!SERVICE_ROLE_KEY){
    res.status(500).json({ ok:false, error:"Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." });
    return;
  }

  // 1) Token do solicitante
  var auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  var token = auth && /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, "").trim() : "";
  if(!token){ res.status(401).json({ ok:false, error:"Não autenticado." }); return; }

  var body = lerCorpo(req);
  var alvoId = body && body.user_id ? String(body.user_id).trim() : "";
  var novaSenha = body && body.nova_senha ? String(body.nova_senha) : "";
  if(!alvoId){ res.status(400).json({ ok:false, error:"Informe o usuário (user_id)." }); return; }
  if(!novaSenha || novaSenha.length < 6){ res.status(400).json({ ok:false, error:"A senha deve ter ao menos 6 caracteres." }); return; }

  try{
    // 2) Descobre quem e o solicitante validando o token no Auth
    var ru = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + token }
    });
    if(!ru.ok){ res.status(401).json({ ok:false, error:"Sessão inválida ou expirada." }); return; }
    var solicitanteAuth = await ru.json();
    var solicitanteId = solicitanteAuth && solicitanteAuth.id;
    if(!solicitanteId){ res.status(401).json({ ok:false, error:"Sessão inválida." }); return; }

    // 3) Perfis do solicitante e do alvo (via service_role)
    var solicitante = await buscarPerfil(solicitanteId);
    if(!solicitante){ res.status(403).json({ ok:false, error:"Perfil do solicitante não encontrado." }); return; }
    var alvo = await buscarPerfil(alvoId);
    if(!alvo){ res.status(404).json({ ok:false, error:"Usuário alvo não encontrado." }); return; }

    // 4) Autorizacao
    var ehDono = solicitante.is_owner === true;
    var ehAdminMesmoHotel = solicitante.papel === "admin" && solicitante.hotel_id === alvo.hotel_id;
    var alvoEhDono = alvo.is_owner === true;

    var autorizado = false;
    if(ehDono) autorizado = true;                                  // dono redefine qualquer um
    else if(ehAdminMesmoHotel && !alvoEhDono) autorizado = true;   // admin do hotel, exceto o dono
    if(!autorizado){ res.status(403).json({ ok:false, error:"Sem permissão para redefinir a senha deste usuário." }); return; }

    // 5) Aplica a nova senha via Admin API
    var ra = await fetch(SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(alvoId), {
      method: "PUT",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": "Bearer " + SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: novaSenha })
    });
    if(!ra.ok){
      var det = await ra.text().catch(function(){ return ""; });
      res.status(502).json({ ok:false, error:"Falha ao aplicar a nova senha.", detalhe: det });
      return;
    }
    res.status(200).json({ ok:true });
  }catch(e){
    res.status(500).json({ ok:false, error:"Erro interno ao redefinir a senha." });
  }
};
