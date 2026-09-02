// Camada de acesso ao Supabase.
// Mapeia os nomes de campos do app (camelCase) <-> banco (snake_case)
// e carrega/grava os dados de um hotel (tenant).
import { supabase } from "./supabase.js";

// Mapa: chave lógica do app -> tabela no banco
export const TABELAS = {
  tq: "tipos_quarto",
  q: "quartos",
  h: "hospedes",
  sv: "servicos",
  r: "reservas",
  os: "consumos",
  pg: "pagamentos",
  fa: "funcionarios"
};

// Conversão de campos app -> banco por tabela
function paraBanco(k, o, hotelId){
  var b = { hotel_id: hotelId };
  if(o.id) b.id = o.id;
  switch(k){
    case "tq": b.nome=o.nome; b.capacidade=o.capacidade; b.preco_diaria=o.precoDiaria; b.ativo=o.ativo!==false; break;
    case "q": b.numero=o.numero; b.andar=o.andar; b.tipo_quarto_id=o.tipoQuartoId||null; b.status=o.status; b.ativo=o.ativo!==false; break;
    case "h": b.nome=o.nome; b.documento=o.documento; b.telefone=o.telefone; b.email=o.email; b.endereco=o.endereco; b.observacoes=o.observacoes; b.ativo=o.ativo!==false; break;
    case "sv": b.nome=o.nome; b.preco=o.preco; b.categoria=o.categoria; b.unidade=o.unidade; b.ativo=o.ativo!==false; break;
    case "r": b.hospede_id=o.hospedeId||null; b.quarto_id=o.quartoId||null; b.tipo_quarto_id=o.tipoQuartoId||null; b.data_checkin=o.dataCheckin; b.data_checkout=o.dataCheckout; b.noites=o.noites; b.total=o.total; b.status=o.status; break;
    case "os": b.reserva_id=o.reservaId||null; b.servico_id=o.servicoId||null; b.quantidade=o.quantidade; b.preco_unit=o.precoUnit; b.total=o.total; b.data=o.data; break;
    case "pg": b.reserva_id=o.reservaId||null; b.hospede_id=o.hospedeId||null; b.valor=o.valor; b.forma=o.forma; b.data=o.data; b.observacoes=o.observacoes; break;
    case "fa": b.nome=o.nome; b.cargo=o.cargo; b.telefone=o.telefone; b.email=o.email; b.turno=o.turno; b.salario=o.salario; b.ativo=o.ativo!==false; break;
  }
  return b;
}

// Conversão de campos banco -> app por tabela
function paraApp(k, b){
  var o = { id: b.id };
  switch(k){
    case "tq": o.nome=b.nome; o.capacidade=b.capacidade; o.precoDiaria=b.preco_diaria; o.ativo=b.ativo; break;
    case "q": o.numero=b.numero; o.andar=b.andar; o.tipoQuartoId=b.tipo_quarto_id; o.status=b.status; o.ativo=b.ativo; break;
    case "h": o.nome=b.nome; o.documento=b.documento; o.telefone=b.telefone; o.email=b.email; o.endereco=b.endereco; o.observacoes=b.observacoes; o.ativo=b.ativo; break;
    case "sv": o.nome=b.nome; o.preco=b.preco; o.categoria=b.categoria; o.unidade=b.unidade; o.ativo=b.ativo; break;
    case "r": o.hospedeId=b.hospede_id; o.quartoId=b.quarto_id; o.tipoQuartoId=b.tipo_quarto_id; o.dataCheckin=b.data_checkin; o.dataCheckout=b.data_checkout; o.noites=b.noites; o.total=b.total; o.status=b.status; break;
    case "os": o.reservaId=b.reserva_id; o.servicoId=b.servico_id; o.quantidade=b.quantidade; o.precoUnit=b.preco_unit; o.total=b.total; o.data=b.data; break;
    case "pg": o.reservaId=b.reserva_id; o.hospedeId=b.hospede_id; o.valor=b.valor; o.forma=b.forma; o.data=b.data; o.observacoes=b.observacoes; break;
    case "fa": o.nome=b.nome; o.cargo=b.cargo; o.telefone=b.telefone; o.email=b.email; o.turno=b.turno; o.salario=b.salario; o.ativo=b.ativo; break;
  }
  return o;
}

// Carrega TODOS os dados do hotel de uma vez (para o cache em memória)
export async function carregarHotel(hotelId){
  var out = {};
  for(var k in TABELAS){
    var { data, error } = await supabase.from(TABELAS[k]).select("*").eq("hotel_id", hotelId);
    if(error){ console.error("Erro ao carregar "+k, error); out[k]=[]; }
    else out[k] = (data||[]).map(function(row){ return paraApp(k, row); });
  }
  return out;
}

// Insere um registro e retorna o objeto no formato do app
export async function inserir(k, obj, hotelId){
  var { data, error } = await supabase.from(TABELAS[k]).insert(paraBanco(k, obj, hotelId)).select().single();
  if(error){ console.error("Erro ao inserir "+k, error); return null; }
  return paraApp(k, data);
}

// Atualiza por id
export async function atualizar(k, id, patch, hotelId){
  var { data, error } = await supabase.from(TABELAS[k]).update(paraBanco(k, patch, hotelId)).eq("id", id).select().single();
  if(error){ console.error("Erro ao atualizar "+k, error); return null; }
  return paraApp(k, data);
}

// Remove por id
export async function remover(k, id){
  var { error } = await supabase.from(TABELAS[k]).delete().eq("id", id);
  if(error){ console.error("Erro ao remover "+k, error); return false; }
  return true;
}

// Configuração do hotel (fica na própria tabela hoteis)
export async function carregarConfig(hotelId){
  var { data } = await supabase.from("hoteis").select("*").eq("id", hotelId).single();
  if(!data) return null;
  return { hn:data.nome, hcnpj:data.cnpj, htel:data.telefone, hemail:data.email, tax:data.taxa_servico, hci:data.checkin_horario, hco:data.checkout_horario, pm:data.formas_pagamento||["dinheiro","cartao","debito","credito","pix"],
    hrazao:data.razao_social, htipodoc:data.tipo_doc, hcep:data.cep, hend:data.endereco, hnum:data.numero, hcompl:data.complemento, hbairro:data.bairro, hcidade:data.cidade, huf:data.uf };
}
export async function salvarConfig(hotelId, c){
  await supabase.from("hoteis").update({ nome:c.hn, cnpj:c.hcnpj, telefone:c.htel, email:c.hemail, taxa_servico:c.tax, checkin_horario:c.hci, checkout_horario:c.hco,
    razao_social:c.hrazao||null, tipo_doc:c.htipodoc||null, cep:c.hcep||null, endereco:c.hend||null, numero:c.hnum||null, complemento:c.hcompl||null, bairro:c.hbairro||null, cidade:c.hcidade||null, uf:c.huf||null }).eq("id", hotelId);
}
export async function supabaseRpcPlano(){ return await supabase.rpc("meu_plano_status"); }
