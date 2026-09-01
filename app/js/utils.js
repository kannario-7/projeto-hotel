// Utilitários gerais
export function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
export function fmtC(c){if(c==null||isNaN(c))return"R$ 0,00";return"R$ "+(c/100).toLocaleString("pt-BR",{minimumFractionDigits:2})}
export function fmtD(d){return d?d.split("-").reverse().join("/"):"-"}
export function td(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
export function dB(a,b){var d1=new Date(a),d2=new Date(b);return Math.round((d2-d1)/86400000)}
export function isValidCPF(c){c=c.replace(/\D/g,"");if(c.length!=11||/^(\d)\1{10}$/.test(c))return false;var s=0,r1,r2,i;for(i=0;i<9;i++)s+=parseInt(c[i])*(10-i);r1=(s*10)%11;if(r1==10)r1=0;if(r1!=parseInt(c[9]))return false;s=0;for(i=0;i<10;i++)s+=parseInt(c[i])*(11-i);r2=(s*10)%11;if(r2==10)r2=0;return r2==parseInt(c[10])}
