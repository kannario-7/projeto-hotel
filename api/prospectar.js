// Vercel Serverless Function: prospecção de estabelecimentos via Google Places API (v1).
// URL: GET /api/prospectar?q=pousadas em Ubatuba   (ou POST { q: "..." })
//
// Retorna uma lista de negócios (nome, telefone, site, endereço, cidade, avaliação,
// place_id) para o dono avaliar e salvar no CRM. Usa a Places API "Text Search"
// que, com a field mask abaixo, já traz telefone e site sem chamadas extras.
//
// SEGURANÇA:
//  - A API key fica na variável de ambiente GOOGLE_PLACES_KEY (Vercel), NUNCA no
//    front-end. O navegador chama /api/prospectar; só o servidor conhece a chave.
//  - Coleta apenas dados COMERCIAIS PÚBLICOS (o contato que o próprio negócio
//    divulga). Uso destinado a prospecção B2B legítima.

var GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY || "";

// Extrai a cidade a partir do endereço formatado (heurística simples).
function cidadeDoEndereco(end){
  if(!end) return "";
  // formato típico: "Rua X, 123 - Bairro, Cidade - UF, CEP, Brasil"
  var partes = (""+end).split(",").map(function(s){return s.trim();});
  // procura o pedaço "Cidade - UF"
  for(var i=0;i<partes.length;i++){
    if(/-\s*[A-Z]{2}\b/.test(partes[i])) return partes[i].replace(/\s*-\s*[A-Z]{2}.*$/, "").trim();
  }
  return partes.length>=2 ? partes[partes.length-3]||"" : "";
}

module.exports = async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if(req.method === "OPTIONS"){ res.status(204).end(); return; }

  var q = "";
  if(req.method === "POST"){
    var body = (typeof req.body === "object" && req.body) ? req.body : {};
    if(typeof req.body === "string"){ try{ body = JSON.parse(req.body); }catch(e){ body = {}; } }
    q = (body.q || "").toString().trim();
  } else {
    q = ((req.query && req.query.q) || "").toString().trim();
  }

  if(!q || q.length < 3){
    res.status(400).json({ ok:false, error:"Informe o que buscar. Ex: 'pousadas em Ubatuba'." });
    return;
  }
  if(!GOOGLE_KEY){
    res.status(503).json({ ok:false, error:"Prospecção não configurada: falta a chave GOOGLE_PLACES_KEY no servidor." });
    return;
  }

  try{
    var resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        // pede só os campos necessários (controla custo e privacidade)
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.internationalPhoneNumber",
          "places.websiteUri",
          "places.rating",
          "places.userRatingCount"
        ].join(",")
      },
      body: JSON.stringify({
        textQuery: q,
        languageCode: "pt-BR",
        regionCode: "BR"
      })
    });

    var data = await resp.json();
    if(!resp.ok){
      res.status(502).json({ ok:false, error:"Falha na busca do Google Places.", detalhe: (data && data.error && data.error.message) || null });
      return;
    }

    var lugares = (data.places || []).map(function(p){
      var end = p.formattedAddress || "";
      return {
        place_id: p.id || "",
        nome: (p.displayName && p.displayName.text) || "",
        telefone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
        site: p.websiteUri || "",
        endereco: end,
        cidade: cidadeDoEndereco(end),
        avaliacao: (p.rating != null ? p.rating : null),
        qtd_avaliacoes: (p.userRatingCount != null ? p.userRatingCount : null)
      };
    });

    res.status(200).json({ ok:true, total: lugares.length, resultados: lugares });
  }catch(e){
    res.status(500).json({ ok:false, error:"Erro interno na prospecção." });
  }
};
