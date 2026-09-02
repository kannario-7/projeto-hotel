// Versão e histórico de novidades
import { esc, fmtD } from "./utils.js";
import { sm } from "./ui.js";

export var APP_VERSION="1.1.0";
export var CHANGELOG=[
{v:"1.1.0",data:"2026-08-30",mudancas:[
{t:"novo",d:"Cadastro completo do hotel: endereco com busca por CEP e selecao de cidade/estado, e preenchimento automatico de dados pelo CNPJ."},
{t:"novo",d:"Cadastro de hospedes com CPF/CNPJ e busca de endereco por CEP."},
{t:"novo",d:"Busca de hospede por nome ou documento na hora de criar a reserva, e cadastro rapido de hospede sem sair da tela."},
{t:"novo",d:"Consentimento LGPD no cadastro do hospede, com opcao de exportar ou anonimizar os dados dele."},
{t:"novo",d:"Guia de boas-vindas no painel para novos hoteis e aviso quando faltam dados do cadastro."},
{t:"novo",d:"Exclusao de quartos, tipos de quarto e servicos, com protecoes contra perda de historico."},
{t:"novo",d:"Protecao por senha do dono para apagar os dados do hotel."},
{t:"melhoria",d:"Alertas do painel com icones animados; barra de navegacao mais legivel."},
{t:"melhoria",d:"As janelas nao fecham mais por clique acidental; ESC fecha e Enter faz login."},
{t:"melhoria",d:"Formas de pagamento com visual novo."}
]},
{v:"1.0.0",data:"2026-08-30",mudancas:[
{t:"novo",d:"Lancamento oficial do HospedaPrime! Sistema pronto para o dia a dia do seu hotel."},
{t:"melhoria",d:"Estabilidade e seguranca reforcadas para uso em producao."},
{t:"melhoria",d:"Seus dados protegidos e isolados na nuvem, com acesso de qualquer dispositivo."}
]},
{v:"0.9.9-beta",data:"2026-08-29",mudancas:[
{t:"novo",d:"Login com e-mail e senha e cadastro do seu hotel."},
{t:"novo",d:"Dados agora ficam salvos na nuvem, acessiveis de qualquer dispositivo."},
{t:"melhoria",d:"Cada hotel tem seus dados totalmente separados e seguros."}
]},
{v:"0.9.8-beta",data:"2026-08-28",mudancas:[
{t:"melhoria",d:"O sistema agora se chama HospedaPrime."},
{t:"melhoria",d:"Codigo reorganizado internamente para evoluir com mais seguranca."}
]},
{v:"0.9.7-beta",data:"2026-08-27",mudancas:[
{t:"melhoria",d:"Navegacao unificada: no celular e no computador o botao Mais abre o mesmo menu moderno."},
{t:"melhoria",d:"Barra de navegacao inferior estilo app tambem no computador, com menu Mais para os demais modulos."},
{t:"novo",d:"Barra de navegacao inferior no celular, estilo app, com destaque no item ativo."},
{t:"correcao",d:"No celular, Novidades e Sair agora ficam visiveis no menu, acima da barra inferior."},
{t:"novo",d:"Suporte Online: botao de ajuda flutuante com WhatsApp, e-mail e mensagem, disponivel ate na tela de login."},
{t:"melhoria",d:"Novo visual escuro e moderno em todo o sistema, com destaque em roxo."},
{t:"melhoria",d:"Cartoes, tabelas, formularios e janelas repaginados no novo tema."},
{t:"melhoria",d:"Melhor contraste e leitura em telas com pouca luz."}
]},
{v:"0.9.6-beta",data:"2026-08-26",mudancas:[
{t:"melhoria",d:"Avisos do painel com visual moderno, icones destacados e melhor leitura."},
{t:"novo",d:"Mapa de quartos no painel: veja ocupados, reservados e livres num relance."},
{t:"novo",d:"Quartos ocupados exibem o nome do hospede; clique para ver os detalhes."},
{t:"novo",d:"Janelas de confirmacao modernas substituindo os avisos do navegador."},
{t:"novo",d:"Sistema ja vem com hospedes e reservas de exemplo para explorar."},
{t:"correcao",d:"Filtro Todas das reservas volta a mostrar a lista completa."},
{t:"melhoria",d:"Visual das janelas atualizado com efeito de desfoque e animacao."},
{t:"melhoria",d:"Filtro de reservas selecionado fica destacado para melhor visualizacao."}
]},
{v:"0.9.5-beta",data:"2026-08-25",mudancas:[
{t:"melhoria",d:"Interface modernizada com visual mais elegante e cores refinadas."},
{t:"melhoria",d:"Cartoes e tabelas com efeitos suaves ao passar o mouse."},
{t:"melhoria",d:"Animacoes de transicao ao navegar entre as telas."}
]},
{v:"0.9.4-beta",data:"2026-08-24",mudancas:[
{t:"novo",d:"Painel de Novidades: historico organizado de todas as atualizacoes do sistema."},
{t:"novo",d:"Selo de versao visivel na tela de login e no menu lateral."},
{t:"melhoria",d:"Novidades agrupadas por tipo para facilitar a leitura."}
]},
{v:"0.9.3-beta",data:"2026-08-23",mudancas:[
{t:"correcao",d:"Botoes X e Cancelar agora fecham corretamente todas as janelas."},
{t:"melhoria",d:"Fechar janelas tocando na area escura fora da caixa."}
]},
{v:"0.9.2-beta",data:"2026-08-22",mudancas:[
{t:"melhoria",d:"Sistema ja inicia com dados de exemplo para facilitar a experiencia."},
{t:"melhoria",d:"Acesso ao sistema simplificado."}
]},
{v:"0.9.1-beta",data:"2026-08-21",mudancas:[
{t:"melhoria",d:"Layout responsivo para celular com menu lateral deslizante."},
{t:"correcao",d:"Correcao do menu mobile que bloqueava o toque nos itens."}
]},
{v:"0.9.0-beta",data:"2026-08-20",mudancas:[
{t:"novo",d:"Primeira versao do sistema publicada online."}
]}
];
export function getUltimaVersaoVista(){try{return localStorage.getItem("hms_lastseen_ver")}catch(e){return null}}
export function marcarVersaoVista(){try{localStorage.setItem("hms_lastseen_ver",APP_VERSION)}catch(e){}}
export function temNovidade(){return getUltimaVersaoVista()!==APP_VERSION}
function chgTagLabel(t){return t==="novo"?"Novo":t==="correcao"?"Correcao":"Melhoria"}
function chgTagIcon(t){return t==="novo"?"✨":t==="correcao"?"🔧":"⬆"}
function chgGrupoTitulo(t){return t==="novo"?"Novidades":t==="melhoria"?"Melhorias":"Correcoes"}
function renderChangelogHTML(nova){var h="";
if(nova){var ult=CHANGELOG[0];var n=ult?ult.mudancas.length:0;
h+='<div class="chg-banner"><div class="chg-banner-ico">🎉</div><div><div class="chg-banner-title">O sistema foi atualizado!</div><div class="chg-banner-sub">Versao '+esc(ult?ult.v:APP_VERSION)+' &middot; '+n+' novidade'+(n===1?'':'s')+' nesta atualizacao</div></div></div>'}
var ordem=["novo","melhoria","correcao"];
for(var i=0;i<CHANGELOG.length;i++){var e=CHANGELOG[i];
h+='<div class="changelog-entry"><div class="changelog-head"><span class="changelog-ver">Versao '+esc(e.v)+'</span>'+(i===0?'<span class="chg-latest">Mais recente</span>':'')+'</div><div class="changelog-date">Atualizado em '+fmtD(e.data)+'</div>';
for(var g=0;g<ordem.length;g++){var tipo=ordem[g];var itens=e.mudancas.filter(function(m){return m.t===tipo});
if(!itens.length)continue;
h+='<div class="chg-grupo"><div class="chg-grupo-titulo"><span class="chg-tag chg-'+tipo+'">'+chgTagIcon(tipo)+' '+chgTagLabel(tipo)+'</span><span class="chg-grupo-nome">'+chgGrupoTitulo(tipo)+' <span class="chg-count">'+itens.length+'</span></span></div><ul class="changelog-list">';
for(var j=0;j<itens.length;j++){h+='<li>'+esc(itens[j].d)+'</li>'}
h+='</ul></div>'}
h+='</div>'}
return h}
export function showChangelog(auto){var nova=auto===true&&temNovidade();sm("Novidades do Sistema",renderChangelogHTML(nova),'<button class="btn btn-primary" onclick="marcarVersaoVista();atualizarBadgeNovidade();closeModal()">Entendi, obrigado</button>');marcarVersaoVista();atualizarBadgeNovidade()}
export function atualizarBadgeNovidade(){var d=document.getElementById("newsDot");if(d)d.style.display=temNovidade()?"block":"none"}
export function aplicarVersaoUI(){var t=document.getElementById("versionTag");if(t)t.textContent="v"+APP_VERSION;var l=document.getElementById("loginVersion");if(l)l.textContent="Versao "+APP_VERSION}
