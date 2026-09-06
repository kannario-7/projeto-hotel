// Nucleo (funcoes puras) do assistente de tarifas.
// NAO altera nada: apenas analisa a ocupacao futura e RECOMENDA ajustes de diaria por data.
// O operador decide se cria a regra de tarifa. Reaproveita precoDiariaNaData do store.
import { precoDiariaNaData } from "../store.js";

var STATUS_ATIVOS = ["pendente","confirmada","checkin"];

// Soma n dias a uma data ISO (yyyy-mm-dd), retornando ISO.
function somarDias(iso, n){
  var p=iso.split("-"); var d=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
  d.setDate(d.getDate()+n);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

// Quartos ativos de um tipo.
function quartosDoTipo(quartos, tipoId){
  return quartos.filter(function(q){ return q.ativo!==false && q.tipoQuartoId===tipoId; });
}

// Reservas ativas que ocupam um quarto do tipo em um dia [checkin, checkout).
function reservasNoDiaTipo(reservas, quartosTipoIds, diaISO){
  return reservas.filter(function(r){
    return STATUS_ATIVOS.indexOf(r.status)>=0 &&
      quartosTipoIds.indexOf(r.quartoId)>=0 &&
      r.dataCheckin<=diaISO && r.dataCheckout>diaISO;
  });
}

// Ocupacao (0..1) de um TIPO de quarto num dia: quartos ocupados / total de quartos do tipo.
// Retorna { total, ocupados, taxa }.
export function ocupacaoTipoNoDia(quartos, reservas, tipoId, diaISO){
  var doTipo = quartosDoTipo(quartos, tipoId);
  var total = doTipo.length;
  if(!total) return { total:0, ocupados:0, taxa:0 };
  var ids = doTipo.map(function(q){ return q.id; });
  // conta reservas distintas por quarto (uma reserva por quarto por dia)
  var ocupadosSet = {};
  reservasNoDiaTipo(reservas, ids, diaISO).forEach(function(r){ ocupadosSet[r.quartoId]=true; });
  var ocupados = Object.keys(ocupadosSet).length;
  if(ocupados>total) ocupados=total;
  return { total:total, ocupados:ocupados, taxa: total? ocupados/total : 0 };
}

// Opcoes padrao do assistente (limiares sensatos, em % e centavos-percentuais).
export var SUGESTAO_PADRAO = {
  dias: 30,               // horizonte analisado a partir de hoje
  limiarAlta: 0.8,        // ocupacao >= 80% -> demanda alta
  acrescimoAlta: 0.15,    // +15% na diaria
  diasUltimaHora: 3,      // proximas 3 noites
  limiarBaixa: 0.4,       // ocupacao <= 40% -> demanda fraca
  descontoUltimaHora: 0.1 // -10% para tentar preencher
};

function arred(centavos){ return Math.round(centavos/100)*100; } // arredonda a real cheio, em centavos

// Gera as recomendacoes de tarifa por (tipo, data). NAO aplica nada.
// Retorna lista [{tipoId, tipoNome, data, taxa, ocupados, total, precoBase, precoSugerido, delta, motivo}].
export function sugerirTarifas(quartos, reservas, tipos, opts){
  var o = Object.assign({}, SUGESTAO_PADRAO, opts||{});
  var hoje = o.hoje; if(!hoje) return [];
  var out = [];
  var tiposAtivos = (tipos||[]).filter(function(t){ return t.ativo!==false; });
  for(var i=0;i<tiposAtivos.length;i++){
    var t = tiposAtivos[i];
    for(var d=0; d<o.dias; d++){
      var dia = somarDias(hoje, d);
      var oc = ocupacaoTipoNoDia(quartos, reservas, t.id, dia);
      if(!oc.total) continue; // tipo sem quartos: ignora
      var base = precoDiariaNaData(t.id, dia);
      if(!base) continue;
      var sugerido = base, motivo = null;
      if(oc.taxa >= o.limiarAlta){
        sugerido = arred(base * (1 + o.acrescimoAlta));
        motivo = "alta"; // demanda alta
      } else if(d < o.diasUltimaHora && oc.taxa <= o.limiarBaixa){
        sugerido = arred(base * (1 - o.descontoUltimaHora));
        motivo = "ultima_hora"; // proxima e vazia
      }
      if(motivo && sugerido !== base && sugerido > 0){
        out.push({
          tipoId: t.id, tipoNome: t.nome, data: dia,
          taxa: oc.taxa, ocupados: oc.ocupados, total: oc.total,
          precoBase: base, precoSugerido: sugerido, delta: sugerido-base,
          motivo: motivo
        });
      }
    }
  }
  return out;
}
