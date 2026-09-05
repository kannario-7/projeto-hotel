// Módulo: Impressão premium de relatórios.
// Monta um documento profissional (cabecalho do hotel, titulo, periodo, emissao, rodape)
// e abre numa nova janela pronta para imprimir ou salvar como PDF.
import { esc } from "../utils.js";
import { St } from "../store.js";
import { st } from "../ui.js";

function dadosHotel(){
  var c = St.gc() || {};
  var endereco = [c.hend, c.hnum].filter(Boolean).join(", ");
  var cidade = [c.hcidade, c.huf].filter(Boolean).join(" - ");
  var linha2 = [endereco, c.hbairro, cidade].filter(Boolean).join(" · ");
  return {
    nome: c.hn || "Hotel",
    razao: c.hrazao || "",
    doc: c.hcnpj || "",
    tel: c.htel || "",
    email: c.hemail || "",
    endereco: linha2,
    cep: c.hcep || ""
  };
}

function agora(){
  var d = new Date();
  var p = function(n){return String(n).padStart(2,"0")};
  return p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear()+" "+p(d.getHours())+":"+p(d.getMinutes());
}

// titulo: nome do relatorio; subtitulo: periodo (opcional); corpoHTML: tabela/cards ja renderizados
export function imprimirDocumento(titulo, subtitulo, corpoHTML){
  var h = dadosHotel();
  var contato = [h.tel, h.email].filter(Boolean).join(" · ");
  var docLinha = [h.razao, h.doc?("CNPJ/CPF: "+h.doc):""].filter(Boolean).join(" · ");
  var css = ''+
  '@page{margin:18mm 16mm}'+
  '*{box-sizing:border-box}'+
  'body{font-family:"Segoe UI",Arial,sans-serif;color:#1a1a1a;margin:0;font-size:12px;line-height:1.5}'+
  '.doc-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #8b5cf6;padding-bottom:14px;margin-bottom:8px}'+
  '.doc-hotel{font-size:20px;font-weight:800;color:#4c1d95;letter-spacing:-.3px}'+
  '.doc-sub{color:#555;font-size:11px;margin-top:3px}'+
  '.doc-badge{text-align:right;font-size:10px;color:#777}'+
  '.doc-badge b{display:block;font-size:13px;color:#4c1d95;font-weight:700}'+
  '.doc-title{margin:18px 0 4px;font-size:16px;font-weight:700;color:#1a1a1a}'+
  '.doc-period{color:#666;font-size:11px;margin-bottom:14px}'+
  'table{width:100%;border-collapse:collapse;margin:10px 0 16px}'+
  'th{background:#f3effe;color:#4c1d95;text-align:left;padding:8px 10px;font-size:11px;border-bottom:2px solid #ddd6f5}'+
  'td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11px}'+
  'tr:nth-child(even) td{background:#faf9ff}'+
  '.cards{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 16px}'+
  '.card{flex:1;min-width:130px;border:1px solid #e5e0f5;border-radius:8px;padding:10px 12px}'+
  '.card h4{margin:0 0 4px;font-size:10px;color:#777;font-weight:600;text-transform:uppercase;letter-spacing:.3px}'+
  '.card .v{font-size:16px;font-weight:800;color:#1a1a1a}'+
  '.doc-foot{margin-top:24px;border-top:1px solid #ddd;padding-top:10px;color:#999;font-size:10px;display:flex;justify-content:space-between}'+
  // balancete (mesmas classes da tela, adaptadas para o documento impresso)
  '.bal-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;margin:12px 0}'+
  '.bal-sec{min-width:0;break-inside:avoid}'+
  '.bal-sec-tit{font-size:12px;font-weight:700;color:#4c1d95;padding-bottom:5px;border-bottom:1.5px solid #ddd6f5;margin-bottom:8px}'+
  '.bal-line{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:4px 0;font-size:11px;border-bottom:1px solid #f0f0f0}'+
  '.bal-line .bl-lbl{color:#444}'+
  '.bal-line .bl-val{font-weight:600;color:#1a1a1a;white-space:nowrap;text-align:right}'+
  '.bal-line.total{border-top:1.5px solid #ccc;border-bottom:none;margin-top:4px;padding-top:6px;font-weight:700}'+
  '.bal-line.total .bl-lbl,.bal-line.total .bl-val{color:#1a1a1a;font-weight:700}'+
  '.bal-pos{color:#1f8a54!important}.bal-neg{color:#c0454a!important}'+
  '.chart,.chartc,.chart-legend{display:none}'+ // graficos coloridos nao vao bem no papel; ocultos na impressao
  '@media print{.no-print{display:none}}';
  // converte os cards do app (stat-card) para o formato de impressao, se vierem
  var corpo = corpoHTML
    .replace(/<div class="cards-row">/g,'<div class="cards">')
    .replace(/<div class="stat-card"><h3>/g,'<div class="card"><h4>')
    .replace(/<\/h3><div class="value"[^>]*>/g,'</h4><div class="v">')
    .replace(/<div class="sub">/g,'<div style="font-size:10px;color:#888;margin-top:2px">');
  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>'+esc(titulo)+' - '+esc(h.nome)+'</title><style>'+css+'</style></head><body>'+
    '<div class="doc-head"><div><div class="doc-hotel">'+esc(h.nome)+'</div>'+
      (docLinha?'<div class="doc-sub">'+esc(docLinha)+'</div>':'')+
      (h.endereco?'<div class="doc-sub">'+esc(h.endereco)+(h.cep?(" · CEP "+esc(h.cep)):"")+'</div>':'')+
      (contato?'<div class="doc-sub">'+esc(contato)+'</div>':'')+
    '</div><div class="doc-badge"><b>HospedaPrime</b>Relatorio gerencial<br>Emitido em '+agora()+'</div></div>'+
    '<div class="doc-title">'+esc(titulo)+'</div>'+
    (subtitulo?'<div class="doc-period">'+esc(subtitulo)+'</div>':'')+
    corpo+
    '<div class="doc-foot"><span>'+esc(h.nome)+' · Documento gerado pelo HospedaPrime</span><span>'+agora()+'</span></div>'+
    '</body></html>';

  // Imprime via IFRAME oculto: abre o dialogo de impressao do sistema na propria tela,
  // sem abrir uma nova janela/aba de documento.
  var antigo = document.getElementById("printFrame");
  if(antigo) antigo.remove();
  var frame = document.createElement("iframe");
  frame.id = "printFrame";
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  var doc = frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  // aguarda o conteudo (fontes/layout) e dispara o dialogo de impressao
  var disparar = function(){
    try{ frame.contentWindow.focus(); frame.contentWindow.print(); }
    catch(e){ st("Nao foi possivel abrir a impressao.","error"); }
  };
  if(frame.contentWindow.document.readyState === "complete"){ setTimeout(disparar, 300); }
  else { frame.onload = function(){ setTimeout(disparar, 300); }; }
  // limpa o iframe depois de um tempo (apos o dialogo)
  setTimeout(function(){ try{ frame.remove(); }catch(e){} }, 60000);
}
