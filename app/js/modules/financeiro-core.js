// Nucleo financeiro compartilhado (financeiro.js e relatorios.js).
// Funcoes PURAS de agregacao: recebem as listas (do St) e devolvem numeros/mapas.
// Objetivo: um unico lugar para a regra de negocio, evitando divergencias
// (ex: "despesa efetivada" = pago!==false, aplicada IGUAL em todo lugar).
import { St } from "../store.js";

// Soma valores (centavos) de uma lista de pagamentos
export function somaPagamentos(pgs){ return (pgs||[]).reduce(function(s,p){return s+(p.valor||0)},0); }
// Soma valores (centavos) de uma lista de despesas
export function somaDespesas(dsList){ return (dsList||[]).reduce(function(s,d){return s+(d.valor||0)},0); }

// REGRA UNICA: despesa efetivada = a que foi paga (pago!==false).
// Contas a pagar em aberto (pago===false) NAO entram no resultado realizado.
export function despesasEfetivadas(dsList){
  return (dsList||St.ga("ds")).filter(function(d){return d.pago!==false;});
}

// Contas a receber: soma do saldo (total - pago) das reservas ativas (confirmada/checkin)
export function aReceberDeReservas(reservas, pagamentos){
  reservas = reservas || St.ga("r");
  pagamentos = pagamentos || St.ga("pg");
  return reservas.filter(function(r){return ["confirmada","checkin"].indexOf(r.status)>=0;})
    .reduce(function(s,r){
      var pago=pagamentos.filter(function(p){return p.reservaId===r.id;}).reduce(function(a,p){return a+(p.valor||0)},0);
      var saldo=(r.total||0)-pago;
      return s+(saldo>0?saldo:0);
    },0);
}

// Agrupa valores por uma chave. items: lista; keyFn: (item)->chave; valFn: (item)->centavos
export function agrupaPor(items, keyFn, valFn){
  var mapa={};
  (items||[]).forEach(function(it){
    var k=keyFn(it); if(k==null||k==="") k="Outros";
    mapa[k]=(mapa[k]||0)+(valFn(it)||0);
  });
  return mapa;
}
export function agrupaPorForma(pgs){ return agrupaPor(pgs, function(p){return p.forma;}, function(p){return p.valor;}); }
export function agrupaPorCategoria(dsList){ return agrupaPor(dsList, function(d){return d.categoria;}, function(d){return d.valor;}); }

// Agrupa receita/despesa por mes (YYYY-MM). Retorna { "2027-01": {rec, des}, ... }
// despesasJaEfetivadas: passar despesasEfetivadas(...) para respeitar a regra unica.
export function agrupaPorMes(pgs, dsEfetivadas){
  var meses={};
  (pgs||[]).forEach(function(p){var m=p.data?p.data.slice(0,7):"";if(m){meses[m]=meses[m]||{rec:0,des:0};meses[m].rec+=(p.valor||0);}});
  (dsEfetivadas||[]).forEach(function(x){var m=x.data?x.data.slice(0,7):"";if(m){meses[m]=meses[m]||{rec:0,des:0};meses[m].des+=(x.valor||0);}});
  return meses;
}

// Filtra uma lista por intervalo [fi, ff] usando o campo .data (strings ISO YYYY-MM-DD)
export function filtroPeriodo(lista, fi, ff){
  return (lista||[]).filter(function(x){
    if(fi && x.data < fi) return false;
    if(ff && x.data > ff) return false;
    return true;
  });
}
