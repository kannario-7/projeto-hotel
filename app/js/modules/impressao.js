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
  var win = window.open("", "_blank");
  if(!win){ st("Permita pop-ups para gerar o relatorio.","warning"); return; }
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
    '<div class="no-print" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="background:#8b5cf6;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;cursor:pointer">Imprimir / Salvar PDF</button></div>'+
    '</body></html>';
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(function(){ try{ win.focus(); }catch(e){} }, 200);
}
