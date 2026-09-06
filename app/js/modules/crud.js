// Helpers de CRUD reutilizaveis (reduz boilerplate repetido em funcionarios/servicos/quartos/etc).
// Nao substituem a geracao de formularios (que varia por modulo) - cobrem o que e IGUAL em todos.
import { St } from "../store.js";
import { st, confirmar } from "../ui.js";

// Le varios inputs por id e devolve um objeto. mapa: { campo: "idDoInput" }.
// opts.trim (default true) apara strings; opts.money: lista de campos que sao R$ -> centavos.
export function lerCampos(mapa, opts){
  opts=opts||{};
  var trim=opts.trim!==false;
  var money=opts.money||[];
  var out={};
  Object.keys(mapa).forEach(function(campo){
    var el=document.getElementById(mapa[campo]);
    var v=el?el.value:"";
    if(money.indexOf(campo)>=0){ out[campo]=v?Math.round(parseFloat(v)*100):0; }
    else { out[campo]=(trim&&typeof v==="string")?v.trim():v; }
  });
  return out;
}

// Padrao de exclusao com confirmacao: confirmar -> St.rm -> toast -> re-render.
// opts.titulo/msg/okLabel opcionais; reRender: funcao chamada apos excluir.
export function crudExcluir(chave, id, opts, reRender){
  opts=opts||{};
  confirmar({
    titulo:opts.titulo||"Excluir?",
    msg:opts.msg||"Esta acao nao podera ser desfeita.",
    okLabel:opts.okLabel||"Sim, excluir",
    tipo:"danger"
  },function(){
    St.rm(chave,id);
    st(opts.toast||"Registro excluido.","warning");
    if(typeof reRender==="function")reRender();
  });
}

// Salva (insert ou update) e da feedback padrao. dados ja montado pelo chamador.
// reRender chamado ao final. Retorna o objeto salvo (modo sincrono do St).
export function crudSalvar(chave, id, dados, opts, reRender){
  opts=opts||{};
  var obj;
  if(id){ obj=St.up(chave,id,dados); st(opts.toastEditar||"Registro atualizado!","success"); }
  else { obj=St.in(chave,dados); st(opts.toastNovo||"Registro cadastrado!","success"); }
  if(typeof reRender==="function")reRender();
  return obj;
}
