// Utilitários gerais
export function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
export function fmtC(c){if(c==null||isNaN(c))return"R$ 0,00";return"R$ "+(c/100).toLocaleString("pt-BR",{minimumFractionDigits:2})}
export function fmtD(d){return d?d.split("-").reverse().join("/"):"-"}
export function td(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
export function dB(a,b){var d1=new Date(a),d2=new Date(b);return Math.round((d2-d1)/86400000)}
export function isValidCPF(c){c=c.replace(/\D/g,"");if(c.length!=11||/^(\d)\1{10}$/.test(c))return false;var s=0,r1,r2,i;for(i=0;i<9;i++)s+=parseInt(c[i])*(10-i);r1=(s*10)%11;if(r1==10)r1=0;if(r1!=parseInt(c[9]))return false;s=0;for(i=0;i<10;i++)s+=parseInt(c[i])*(11-i);r2=(s*10)%11;if(r2==10)r2=0;return r2==parseInt(c[10])}

// --- Mascaras reutilizaveis (aplicam no proprio input) ---
export function mascTel(el){var v=el.value.replace(/\D/g,"").slice(0,11);if(v.length>10)v=v.replace(/(\d{2})(\d{5})(\d{1,4})/,"($1) $2-$3");else if(v.length>6)v=v.replace(/(\d{2})(\d{4})(\d{1,4})/,"($1) $2-$3");else if(v.length>2)v=v.replace(/(\d{2})(\d+)/,"($1) $2");el.value=v;}
export function mascCep(el){el.value=el.value.replace(/\D/g,"").slice(0,8).replace(/(\d{5})(\d)/,"$1-$2");}
// Documento auto: CPF ate 11 digitos, CNPJ acima
export function mascDocAuto(el){
  var v=el.value.replace(/\D/g,"");
  if(v.length<=11){v=v.slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");}
  else{v=v.slice(0,14).replace(/(\d{2})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1/$2").replace(/(\d{4})(\d{1,2})$/,"$1-$2");}
  el.value=v;
}
// Busca endereco por CEP (ViaCEP). Retorna string formatada ou null.
export async function enderecoPorCep(cep){
  cep=(cep||"").replace(/\D/g,"");
  if(cep.length!==8)return null;
  try{
    var r=await fetch("https://viacep.com.br/ws/"+cep+"/json/");
    var d=await r.json();
    if(d.erro)return null;
    var partes=[d.logradouro,d.bairro,(d.localidade&&d.uf)?(d.localidade+"/"+d.uf):d.localidade].filter(Boolean);
    return partes.join(", ");
  }catch(e){return null;}
}
