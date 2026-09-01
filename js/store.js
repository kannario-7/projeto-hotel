// Camada de dados (localStorage). Futuramente será substituída por Supabase.
import { esc } from "./utils.js";

export var St={cc:{u:"hms_u",tq:"hms_tq",q:"hms_q",h:"hms_h",r:"hms_r",sv:"hms_sv",os:"hms_os",pg:"hms_pg",f:"hms_f",fa:"hms_fa",cfg:"hms_cfg"},
ga:function(k){try{return JSON.parse(localStorage.getItem(this.cc[k]))||[]}catch(e){return[]}},
sa:function(k,v){localStorage.setItem(this.cc[k],JSON.stringify(v))},
gc:function(){try{return JSON.parse(localStorage.getItem(this.cc.cfg))}catch(e){return{pm:["dinheiro","cartao","debito","credito","pix"],hci:"14:00",hco:"12:00",tax:10,hn:"Hotel Exemplo",hcnpj:"",htel:"",hemail:""}}},
sc:function(v){localStorage.setItem(this.cc.cfg,JSON.stringify(v))},
in:function(k,v){v.id=crypto.randomUUID();var a=this.ga(k);a.push(v);this.sa(k,a);return v},
up:function(k,i,u){var a=this.ga(k),p=a.findIndex(function(x){return x.id===i});if(p>-1){Object.assign(a[p],u);this.sa(k,a);return a[p]}return null},
rm:function(k,i){this.sa(k,this.ga(k).filter(function(x){return x.id!==i}))},
fi:function(k,i){return this.ga(k).find(function(x){return x.id===i})}
};

export function seed(){if(localStorage.getItem("hms_s3"))return;
var tp=[["Standard",2,19900],["Superior",3,29900],["Deluxe",3,44900],["Suite Master",4,69900]].map(function(t){return{id:crypto.randomUUID(),nome:t[0],capacidade:t[1],precoDiaria:t[2],ativo:true}});St.sa("tq",tp);
var qq=[];for(var a=1;a<=4;a++){for(var q=0;q<(a<=2?3:2);q++){var ti=a<=1?0:a===2?1:a===3?2:3;qq.push({id:crypto.randomUUID(),numero:""+(100*a+q+1).toString().slice(1),andar:a,tipoQuartoId:tp[ti].id,status:"disponivel",ativo:true})}}St.sa("q",qq);
var sc=[["Cafe da Manha",3500],["Lavanderia",1500],["Estacionamento",2500],["Minibar",800],["Spa Massagem",12000],["Room Service",5000],["Late Checkout",8000],["Early Checkin",6000]].map(function(s){return{id:crypto.randomUUID(),nome:s[0],preco:s[1],categoria:"Servico",unidade:"unidade",ativo:true}});St.sa("sv",sc);
St.sc({hn:"Hotel Exemplo",hcnpj:"00.000.000/0001-00",htel:"(11)3000-0000",hemail:"contato@hotel.com",tax:10,hci:"14:00",hco:"12:00",pm:["dinheiro","cartao","debito","credito","pix"]});
var hosp=[["Joao Silva","123.456.789-09","(11)98888-0001","joao@email.com"],["Maria Souza","987.654.321-00","(11)98888-0002","maria@email.com"],["Carlos Pereira","111.444.777-35","(11)98888-0003","carlos@email.com"],["Ana Costa","529.982.247-25","(11)98888-0004","ana@email.com"],["Pedro Almeida","390.533.447-05","(11)98888-0005","pedro@email.com"]].map(function(x){return{id:crypto.randomUUID(),nome:x[0],documento:x[1],telefone:x[2],email:x[3],ativo:true}});St.sa("h",hosp);
function dOff(n){var d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
var rr=[
{hospedeId:hosp[2].id,quartoId:qq[0].id,dataCheckin:dOff(-1),dataCheckout:dOff(2),total:tp[0].precoDiaria*3,status:"checkin"},
{hospedeId:hosp[0].id,quartoId:qq[6].id,dataCheckin:dOff(-2),dataCheckout:dOff(1),total:tp[2].precoDiaria*3,status:"checkin"},
{hospedeId:hosp[4].id,quartoId:qq[8].id,dataCheckin:dOff(0),dataCheckout:dOff(3),total:tp[3].precoDiaria*3,status:"checkin"},
{hospedeId:hosp[1].id,quartoId:qq[3].id,dataCheckin:dOff(1),dataCheckout:dOff(4),total:tp[1].precoDiaria*3,status:"confirmada"},
{hospedeId:hosp[3].id,quartoId:qq[4].id,dataCheckin:dOff(2),dataCheckout:dOff(5),total:tp[1].precoDiaria*3,status:"confirmada"},
{hospedeId:hosp[0].id,quartoId:qq[9].id,dataCheckin:dOff(3),dataCheckout:dOff(6),total:tp[3].precoDiaria*3,status:"pendente"},
{hospedeId:hosp[3].id,quartoId:qq[2].id,dataCheckin:dOff(-6),dataCheckout:dOff(-3),total:tp[0].precoDiaria*3,status:"cancelada"}
].map(function(r){r.id=crypto.randomUUID();r.servicos=r.servicos||[];return r});St.sa("r",rr);
qq[7].status="limpeza";qq[5].status="manutencao";
rr.forEach(function(r){var qi=qq.findIndex(function(x){return x.id===r.quartoId});if(qi<0)return;if(r.status==="checkin")qq[qi].status="ocupado";else if(r.status==="confirmada"&&qq[qi].status==="disponivel")qq[qi].status="reservado"});
St.sa("q",qq);
localStorage.setItem("hms_s3","1");}

export function ensureAdmin(){var us=St.ga("u");if(!us.some(function(u){return u.login==="admin"})){St.in("u",{nome:"Admin",login:"admin",senha:"1234",tipo:"admin",ativo:true})}}

export function checkDisponivel(quartoId,checkin,checkout,excluirId){return!St.ga("r").some(function(r){return r.id!==excluirId&&r.quartoId===quartoId&&["confirmada","pendente","checkin"].includes(r.status)&&r.dataCheckin<checkout&&r.dataCheckout>checkin})}
export function quartosDisponiveis(tipoId,checkin,checkout,excluirId){return St.ga("q").filter(function(q){return q.ativo!==false&&q.tipoQuartoId===tipoId&&(q.status==="disponivel"||q.status==="limpeza")&&checkDisponivel(q.id,checkin,checkout,excluirId)})}
export function getStatusBadge(s){var m={disponivel:"success",ocupado:"info",reservado:"warning",pendente:"warning",confirmada:"info",checkin:"info",checkout:"",cancelada:"danger",manutencao:"danger",limpeza:"warning"};return'<span class="badge badge-'+m[s]+'">'+esc(s.charAt(0).toUpperCase()+s.slice(1))+'</span>'}
export function restaurarDadosStore(){localStorage.clear();location.reload()}
