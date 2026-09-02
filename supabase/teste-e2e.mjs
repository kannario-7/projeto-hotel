// Teste ponta a ponta do HospedaPrime via API REST (mesma que o app usa).
// Cria 2 hoteis, simula ciclo (reserva/checkin/checkout) e valida ISOLAMENTO.
// Os dados criados sao de teste e serao apagados pelo script limpar-dados-teste.sql.
const URL = "https://bizfrksuwscosxutunfy.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpemZya3N1d3Njb3N4dXR1bmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjk4NzIsImV4cCI6MjEwMzgwNTg3Mn0.kRglbjmeLup0Tn7Nn5doFXMAtrsAYk25x3fZcoCdr5k";

const h = (tok) => ({ apikey: ANON, Authorization: "Bearer " + (tok || ANON), "Content-Type": "application/json" });
const rnd = () => Math.random().toString(36).slice(2, 8);

// fetch com timeout para nao travar (rate limit / rede)
async function ft(url, opts = {}, ms = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(t); }
}
let pass = 0, fail = 0;
function check(cond, msg) { if (cond) { pass++; console.log("  OK  " + msg); } else { fail++; console.log("  XX  " + msg); } }

async function signup(email, pw) {
  const r = await ft(URL + "/auth/v1/signup", { method: "POST", headers: h(), body: JSON.stringify({ email, password: pw }) });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error("signup HTTP " + r.status + ": " + JSON.stringify(j));
  return j.access_token;
}
async function rpc(tok, fn, args) {
  const r = await ft(URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: h(tok), body: JSON.stringify(args || {}) });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function rest(tok, path, method = "GET", body) {
  const r = await ft(URL + "/rest/v1/" + path, { method, headers: { ...h(tok), Prefer: "return=representation" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function criarHotel(nome) {
  const email = "e2e_" + rnd() + "@teste.com";
  const tok = await signup(email, "senha123");
  if (!tok) throw new Error("signup falhou para " + email + " (confirmacao de email ativa?)");
  const cr = await rpc(tok, "criar_hotel_e_perfil", { p_hotel_nome: nome, p_admin_nome: "Admin " + nome });
  if (cr.status >= 300) throw new Error("criar_hotel_e_perfil falhou: " + JSON.stringify(cr.body));
  return { tok, email, hotelId: cr.body };
}

(async () => {
  console.log("=== TESTE PONTA A PONTA HospedaPrime ===\n");

  // 1) CADASTRO de dois hoteis independentes
  console.log("[1] Cadastro de 2 hoteis...");
  const A = await criarHotel("Hotel Teste A " + rnd());
  const B = await criarHotel("Hotel Teste B " + rnd());
  check(A.hotelId && B.hotelId && A.hotelId !== B.hotelId, "dois hoteis criados com IDs distintos");

  // 2) Cada hotel ja vem com dados semente? Verifica quartos do A
  console.log("[2] Dados do hotel A...");
  const quartosA = await rest(A.tok, "quartos?select=*");
  check(Array.isArray(quartosA.body), "hotel A consegue listar seus quartos");

  // 3) ISOLAMENTO: A nao ve dados de B
  console.log("[3] Isolamento entre hoteis...");
  const hoteisVistosPorA = await rest(A.tok, "hoteis?select=id");
  const idsA = (hoteisVistosPorA.body || []).map(x => x.id);
  check(idsA.length === 1 && idsA[0] === A.hotelId, "hotel A so enxerga o proprio hotel (nao ve o B)");

  // 4) CRIAR hospede + reserva no hotel A
  console.log("[4] Criar hospede e reserva no hotel A...");
  const hosp = await rest(A.tok, "hospedes", "POST", { hotel_id: A.hotelId, nome: "Hospede Teste", documento: "000" });
  check(hosp.status < 300 && hosp.body && hosp.body[0], "hospede criado no hotel A");
  const hospId = hosp.body && hosp.body[0] && hosp.body[0].id;
  const hoje = new Date().toISOString().slice(0, 10);
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const res = await rest(A.tok, "reservas", "POST", { hotel_id: A.hotelId, hospede_id: hospId, data_checkin: hoje, data_checkout: amanha, noites: 1, total: 15000, status: "confirmada" });
  check(res.status < 300 && res.body && res.body[0], "reserva criada no hotel A");
  const resId = res.body && res.body[0] && res.body[0].id;

  // 5) CHECK-IN (muda status para checkin)
  console.log("[5] Check-in...");
  const ci = await rest(A.tok, "reservas?id=eq." + resId, "PATCH", { status: "checkin" });
  check(ci.status < 300 && ci.body && ci.body[0] && ci.body[0].status === "checkin", "reserva mudou para checkin");

  // 6) CHECK-OUT (muda status para checkout + pagamento)
  console.log("[6] Check-out + pagamento...");
  const co = await rest(A.tok, "reservas?id=eq." + resId, "PATCH", { status: "checkout" });
  check(co.status < 300 && co.body && co.body[0] && co.body[0].status === "checkout", "reserva mudou para checkout");
  const pg = await rest(A.tok, "pagamentos", "POST", { hotel_id: A.hotelId, reserva_id: resId, hospede_id: hospId, valor: 15000, forma: "pix" });
  check(pg.status < 300, "pagamento registrado");

  // 7) ISOLAMENTO CRITICO: B nao ve a reserva de A
  console.log("[7] Isolamento de dados operacionais...");
  const reservasVistasPorB = await rest(B.tok, "reservas?select=id");
  const idsResB = (reservasVistasPorB.body || []).map(x => x.id);
  check(!idsResB.includes(resId), "hotel B NAO enxerga a reserva do hotel A (isolamento ok)");
  const hospVistosPorB = await rest(B.tok, "hospedes?select=id");
  check(!(hospVistosPorB.body || []).map(x => x.id).includes(hospId), "hotel B NAO enxerga o hospede do hotel A");

  // 8) Bloqueio de plano: hotel liberado por padrao (trial ativo)
  console.log("[8] Status de plano...");
  const lib = await rpc(A.tok, "meu_hotel_liberado");
  check(lib.body === true, "hotel A liberado (trial ativo, meu_hotel_liberado=true)");

  console.log("\n=== RESULTADO: " + pass + " passaram, " + fail + " falharam ===");
  if (fail > 0) process.exit(1);
})().catch(e => { console.error("ERRO FATAL:", e.message); process.exit(1); });
