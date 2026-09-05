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
  fa: "funcionarios",
  ds: "despesas",
  sc: "sessoes_caixa"
};

// Conversão de campos app -> banco por tabela
function paraBanco(k, o, hotelId){
  var b = { hotel_id: hotelId };
  if(o.id) b.id = o.id;
  switch(k){
    case "tq": b.nome=o.nome; b.capacidade=o.capacidade; b.preco_diaria=o.precoDiaria; b.ativo=o.ativo!==false; break;
    case "q": b.numero=o.numero; b.andar=o.andar; b.tipo_quarto_id=o.tipoQuartoId||null; b.status=o.status; b.ativo=o.ativo!==false; break;
    case "h": b.nome=o.nome; b.documento=o.documento; b.telefone=o.telefone; b.email=o.email; b.endereco=o.endereco; b.observacoes=o.observacoes; b.ativo=o.ativo!==false; if(o.consentimentoEm!==undefined)b.consentimento_em=o.consentimentoEm; break;
    case "sv": b.nome=o.nome; b.preco=o.preco; b.categoria=o.categoria; b.unidade=o.unidade; b.ativo=o.ativo!==false; break;
    case "r": b.hospede_id=o.hospedeId||null; b.quarto_id=o.quartoId||null; b.tipo_quarto_id=o.tipoQuartoId||null; b.data_checkin=o.dataCheckin; b.data_checkout=o.dataCheckout; b.noites=o.noites; b.total=o.total; b.status=o.status; break;
    case "os": b.reserva_id=o.reservaId||null; b.servico_id=o.servicoId||null; b.quantidade=o.quantidade; b.preco_unit=o.precoUnit; b.total=o.total; b.data=o.data; break;
    case "pg": b.reserva_id=o.reservaId||null; b.hospede_id=o.hospedeId||null; b.valor=o.valor; b.forma=o.forma; b.data=o.data; b.observacoes=o.observacoes; break;
    case "fa": b.nome=o.nome; b.cargo=o.cargo; b.telefone=o.telefone; b.email=o.email; b.turno=o.turno; b.salario=o.salario; b.ativo=o.ativo!==false; break;
    case "ds": b.descricao=o.descricao; b.categoria=o.categoria; b.valor=o.valor; b.forma=o.forma; b.data=o.data; b.observacoes=o.observacoes; if(o.vencimento!==undefined)b.vencimento=o.vencimento||null; if(o.pago!==undefined)b.pago=o.pago; if(o.pagoEm!==undefined)b.pago_em=o.pagoEm||null; break;
    case "sc": b.usuario_abertura=o.usuarioAbertura; b.usuario_fechamento=o.usuarioFechamento; b.aberto_em=o.abertoEm; b.fechado_em=o.fechadoEm; b.valor_abertura=o.valorAbertura; b.contado_dinheiro=o.contadoDinheiro; b.contado_cartao=o.contadoCartao; b.contado_pix=o.contadoPix; b.contado_outros=o.contadoOutros; b.valor_sistema=o.valorSistema; b.diferenca=o.diferenca; b.observacoes=o.observacoes; b.status=o.status; break;
  }
  return b;
}

// Conversão de campos banco -> app por tabela
function paraApp(k, b){
  var o = { id: b.id };
  switch(k){
    case "tq": o.nome=b.nome; o.capacidade=b.capacidade; o.precoDiaria=b.preco_diaria; o.ativo=b.ativo; break;
    case "q": o.numero=b.numero; o.andar=b.andar; o.tipoQuartoId=b.tipo_quarto_id; o.status=b.status; o.ativo=b.ativo; break;
    case "h": o.nome=b.nome; o.documento=b.documento; o.telefone=b.telefone; o.email=b.email; o.endereco=b.endereco; o.observacoes=b.observacoes; o.ativo=b.ativo; o.consentimentoEm=b.consentimento_em; break;
    case "sv": o.nome=b.nome; o.preco=b.preco; o.categoria=b.categoria; o.unidade=b.unidade; o.ativo=b.ativo; break;
    case "r": o.hospedeId=b.hospede_id; o.quartoId=b.quarto_id; o.tipoQuartoId=b.tipo_quarto_id; o.dataCheckin=b.data_checkin; o.dataCheckout=b.data_checkout; o.noites=b.noites; o.total=b.total; o.status=b.status; break;
    case "os": o.reservaId=b.reserva_id; o.servicoId=b.servico_id; o.quantidade=b.quantidade; o.precoUnit=b.preco_unit; o.total=b.total; o.data=b.data; break;
    case "pg": o.reservaId=b.reserva_id; o.hospedeId=b.hospede_id; o.valor=b.valor; o.forma=b.forma; o.data=b.data; o.observacoes=b.observacoes; break;
    case "fa": o.nome=b.nome; o.cargo=b.cargo; o.telefone=b.telefone; o.email=b.email; o.turno=b.turno; o.salario=b.salario; o.ativo=b.ativo; break;
    case "ds": o.descricao=b.descricao; o.categoria=b.categoria; o.valor=b.valor; o.forma=b.forma; o.data=b.data; o.observacoes=b.observacoes; o.vencimento=b.vencimento; o.pago=b.pago; o.pagoEm=b.pago_em; break;
    case "sc": o.usuarioAbertura=b.usuario_abertura; o.usuarioFechamento=b.usuario_fechamento; o.abertoEm=b.aberto_em; o.fechadoEm=b.fechado_em; o.valorAbertura=b.valor_abertura; o.contadoDinheiro=b.contado_dinheiro; o.contadoCartao=b.contado_cartao; o.contadoPix=b.contado_pix; o.contadoOutros=b.contado_outros; o.valorSistema=b.valor_sistema; o.diferenca=b.diferenca; o.observacoes=b.observacoes; o.status=b.status; break;
  }
  return o;
}

// Carrega TODOS os dados do hotel de uma vez (para o cache em memória).
// Em PARALELO (Promise.all) para ficar rapido - antes era tabela por tabela em sequencia.
export async function carregarHotel(hotelId){
  var chaves = Object.keys(TABELAS);
  var resultados = await Promise.all(chaves.map(function(k){
    return supabase.from(TABELAS[k]).select("*").eq("hotel_id", hotelId)
      .then(function(res){ return { k:k, data:res.data, error:res.error }; })
      .catch(function(e){ return { k:k, data:[], error:e }; });
  }));
  var out = {};
  resultados.forEach(function(r){
    if(r.error){ console.error("Erro ao carregar "+r.k, r.error); out[r.k]=[]; }
    else out[r.k] = (r.data||[]).map(function(row){ return paraApp(r.k, row); });
  });
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

// --- Suporte (mensagens cliente <-> dono) ---
// Envia uma mensagem. autor: 'cliente' ou 'suporte'. hotelId destino.
export async function suporteEnviar(hotelId, autor, nome, texto){
  var { data, error } = await supabase.from("suporte_mensagens")
    .insert({ hotel_id:hotelId, autor:autor, nome:nome, texto:texto }).select().single();
  if(error){ console.error("suporteEnviar", error); return null; }
  return data;
}
// Lista mensagens de um hotel (cliente ve as suas; dono passa o hotel_id do cliente)
export async function suporteListar(hotelId){
  var { data } = await supabase.from("suporte_mensagens").select("*").eq("hotel_id", hotelId).order("criado_em", { ascending:true });
  return data||[];
}
// DONO: lista todas as conversas (uma linha por hotel) com contagem de nao lidas do cliente
export async function suporteConversas(){
  var { data } = await supabase.from("suporte_mensagens").select("*").order("criado_em", { ascending:true });
  return data||[];
}
// Marca como lidas as mensagens de um hotel escritas pelo outro lado
export async function suporteMarcarLidas(hotelId, autorLido){
  await supabase.from("suporte_mensagens").update({ lida:true }).eq("hotel_id", hotelId).eq("autor", autorLido).eq("lida", false);
}
