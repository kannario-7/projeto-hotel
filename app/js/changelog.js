// Versão e histórico de novidades
import { esc, fmtD } from "./utils.js";
import { sm } from "./ui.js";

export var APP_VERSION="2.8.0";
export var CHANGELOG=[
{v:"2.8.0",data:"2026-08-30",mudancas:[
{t:"novo",d:"Nova identidade visual HospedaPrime: símbolo próprio (o H com a barra coral), paleta sóbria de quatro cores e a fonte Plus Jakarta Sans. Um visual de produto, pensado para quem opera o sistema o dia inteiro."},
{t:"melhoria",d:"O novo visual vale no sistema (claro e escuro), na página pública de reservas e no site. O coral entra só como destaque - em botões principais, barras de ocupação e números em foco."}
]},
{v:"2.7.1",data:"2026-09-06",mudancas:[
{t:"melhoria",d:"Sincronização automática dos calendários: os links do Airbnb/Booking cadastrados nos quartos passam a ser sincronizados sozinhos uma vez por dia, além do botão Sincronizar agora."}
]},
{v:"2.7.0",data:"2026-09-06",mudancas:[
{t:"novo",d:"Importar calendários (Airbnb/Booking): em Quartos > Calendário, cole os links de calendário dos seus anúncios e clique em Sincronizar. As datas vendidas nas plataformas ficam bloqueadas automaticamente no HospedaPrime, evitando reserva em dobro."},
{t:"melhoria",d:"Os bloqueios importados aparecem no mapa e na disponibilidade como datas ocupadas, sem virar receita nem exigir check-in. Reservas reais nunca são alteradas pela sincronização."}
]},
{v:"2.6.0",data:"2026-09-06",mudancas:[
{t:"novo",d:"Integração de calendário (Airbnb/Booking): cada quarto agora tem um link de calendário (em Quartos > Calendário). Cole esse link no Airbnb ou Booking e eles bloqueiam automaticamente as datas já ocupadas no HospedaPrime, ajudando a evitar reserva em dobro."},
{t:"melhoria",d:"O link compartilha apenas as datas ocupadas - nunca o nome do hóspede nem valores. A sincronização das plataformas é periódica (pode levar algumas horas)."}
]},
{v:"2.5.0",data:"2026-09-06",mudancas:[
{t:"novo",d:"Relatório por turno: em Relatórios > Por Turno, veja quanto foi recebido em cada turno (manhã, tarde, noite) e por cada operador no período, com total, quantidade de pagamentos e ticket médio."},
{t:"melhoria",d:"O turno de cada pagamento é definido pela hora em que foi registrado. Exportação em CSV e impressão disponíveis."}
]},
{v:"2.4.2",data:"2026-09-06",mudancas:[
{t:"novo",d:"Excluir usuário: em Configurações > Usuários, o administrador do hotel pode remover permanentemente um usuário (além de apenas desativar). Útil para limpar cadastros duplicados ou antigos."}
]},
{v:"2.4.1",data:"2026-09-06",mudancas:[
{t:"melhoria",d:"Segurança reforçada: o acesso a Financeiro, Caixa e Funcionários agora é protegido também no servidor, não só na tela. Quem não tem permissão para esses módulos não consegue acessar esses dados de forma alguma."},
{t:"melhoria",d:"Atualização automática: após 30 minutos sem uso, o sistema recarrega sozinho para trazer os dados e permissões mais recentes (nunca interrompe quando há algo aberto ou sendo preenchido)."}
]},
{v:"2.4.0",data:"2026-09-06",mudancas:[
{t:"novo",d:"Reservas online (página pública): ative em Configurações > Hotel e compartilhe o link. Seus clientes consultam a disponibilidade, veem o preço e solicitam a reserva pela internet, sem precisar ligar."},
{t:"novo",d:"As solicitações chegam como reservas pendentes para você confirmar. O sistema só mostra ao público o nome do hotel, os tipos de quarto e a disponibilidade - dados de hóspedes e financeiro nunca são expostos."},
{t:"melhoria",d:"A página pública respeita a mesma proteção contra reserva duplicada, então dois clientes não conseguem reservar o mesmo quarto no mesmo período."}
]},
{v:"2.3.0",data:"2026-09-06",mudancas:[
{t:"novo",d:"Assistente de preços (Configurações > Tarifas): analisa a ocupação dos próximos dias e sugere ajustes de diária - acréscimo quando a demanda está alta e desconto de última hora para datas próximas ainda vazias."},
{t:"melhoria",d:"As sugestões nunca alteram o preço sozinhas: você revisa cada recomendação e cria a tarifa com um clique (o valor já vem preenchido, e dá para editar antes de salvar)."}
]},
{v:"2.2.0",data:"2026-09-06",mudancas:[
{t:"novo",d:"Permissões por operador: em Configurações > Usuários, o administrador escolhe exatamente quais módulos cada pessoa acessa (Reservas, Financeiro, Relatórios, etc.), pelo botão Permissões ou ao criar/convidar. O Painel fica sempre disponível."},
{t:"melhoria",d:"O menu agora esconde os módulos sem acesso também no celular (barra inferior e menu Mais), não só no computador. Administrador e dono continuam com acesso total."}
]},
{v:"2.1.0",data:"2026-09-06",mudancas:[
{t:"melhoria",d:"Caixa por turno mais preciso: o fechamento passa a somar exatamente os pagamentos feitos entre a abertura e o fechamento daquela sessão, sem misturar valores de outros horários ou dias."},
{t:"novo",d:"Recebido por operador: o caixa mostra quanto cada pessoa recebeu no turno, e cada pagamento agora registra quem o lançou e a hora exata."}
]},
{v:"2.0.3",data:"2026-09-06",mudancas:[
{t:"novo",d:"Aviso de entrada vencida sem check-in: o painel destaca quando uma reserva já passou da data de entrada e o check-in não foi registrado, para a recepção verificar com o hóspede e regularizar."},
{t:"melhoria",d:"O aviso de check-out de hoje passou a contar apenas hóspedes que já fizeram check-in, separando de vez as duas situações. No Mapa de Quartos, entradas atrasadas aparecem marcadas como 'atrasado'."}
]},
{v:"2.0.2",data:"2026-08-30",mudancas:[
{t:"melhoria",d:"Busca sempre à mão: agora ela fica numa barra fixa no topo de todas as telas. Basta começar a digitar para ver hóspedes, reservas e quartos - sem abrir menus."},
{t:"melhoria",d:"Os resultados aparecem logo abaixo da barra; clique para ir direto ao destino. O atalho Ctrl+K (ou a tecla /) foca a busca de qualquer lugar."}
]},
{v:"2.0.1",data:"2026-08-30",mudancas:[
{t:"novo",d:"Busca global: encontre rapidamente hóspedes, reservas e quartos em um só lugar. Abra pelo atalho Ctrl+K (tecla / também abre)."},
{t:"melhoria",d:"Cada resultado leva direto ao destino: o hóspede abre o cadastro, a reserva mostra os detalhes e o quarto abre no painel."}
]},
{v:"2.0.0",data:"2026-08-30",mudancas:[
{t:"novo",d:"Novo visual do HospedaPrime: identidade clara e quente (tons de areia e terracota), mais leve e agradável para o uso do dia a dia."},
{t:"novo",d:"Modo escuro: alterne entre claro e escuro pelo botão no rodapé do menu lateral (ou em Mais, no celular). A escolha fica salva para os próximos acessos."},
{t:"melhoria",d:"Cores dos status de quarto agora são distintas e fáceis de diferenciar: disponível (verde), ocupado (azul), reservado (roxo), limpeza (ciano) e manutenção (vermelho)."},
{t:"melhoria",d:"Contraste revisado em telas, tabelas, gráficos e chat nos dois temas, para leitura confortável sem texto apagado."}
]},
{v:"1.9.9",data:"2026-08-30",mudancas:[
{t:"melhoria",d:"Quartos com reserva futura aparecem como 'Reservado' no mapa, com o hóspede e a data de check-in em destaque - não passa mais batido como livre."}
]},
{v:"1.9.8",data:"2026-08-30",mudancas:[
{t:"melhoria",d:"Mapa de Quartos no painel agora separado por andar, facilitando localizar os quartos."}
]},
{v:"1.9.7",data:"2026-08-30",mudancas:[
{t:"novo",d:"Limpeza (governança): nova tela com a fila de quartos aguardando limpeza, tempo de espera, atribuição de camareira e botão para marcar como limpo."},
{t:"melhoria",d:"Após o check-out, o quarto entra automaticamente na fila de limpeza; ao marcar como limpo, volta a ficar disponível."}
]},
{v:"1.9.6",data:"2026-08-30",mudancas:[
{t:"melhoria",d:"Acessibilidade: as abas podem ser usadas pelo teclado (Tab para navegar, Enter para abrir) e as janelas já focam o primeiro campo ao abrir."}
]},
{v:"1.9.5",data:"2026-08-30",mudancas:[
{t:"correcao",d:"Lucro consistente: o Lucro nos Relatórios e o Resultado no Financeiro agora usam a mesma regra (só despesas pagas contam), acabando com a diferença de valores entre as telas."}
]},
{v:"1.9.4",data:"2026-08-30",mudancas:[
{t:"novo",d:"Formas de pagamento personalizadas: adicione (ex: PicPay, Vale-refeição) e remova as suas próprias formas em Configurações > Pagamento."},
{t:"melhoria",d:"Mais formas pré-definidas (Transferência, Link de pagamento, Voucher/Cortesia) e remoção da opção genérica 'Cartão' (use Débito ou Crédito)."}
]},
{v:"1.9.3",data:"2026-08-30",mudancas:[
{t:"correcao",d:"Aba Atividades: as ações agora aparecem com nome legível (ex: 'Pagamento registrado', 'Tarifa criada') em vez do código interno."}
]},
{v:"1.9.2",data:"2026-08-30",mudancas:[
{t:"novo",d:"Sinal e pagamento parcial: registre a entrada (sinal) na reserva e pagamentos ao longo da estadia; cada reserva mostra total, já pago e saldo."},
{t:"melhoria",d:"No check-out, o sistema abate automaticamente o que já foi pago e cobra apenas o saldo, com o abatimento discriminado na fatura."}
]},
{v:"1.9.1",data:"2026-08-30",mudancas:[
{t:"novo",d:"Tarifas por temporada e por dia da semana: em Configurações > Tarifas, defina preços de alta/baixa temporada, feriados ou fins de semana por tipo de quarto."},
{t:"melhoria",d:"Reservas e check-out calculam automaticamente o valor de cada noite conforme a tarifa vigente; sem regra, vale o preço padrão do tipo."}
]},
{v:"1.9.0",data:"2026-08-30",mudancas:[
{t:"novo",d:"Trilha de atividades: em Configurações > Atividades, veja o registro de quem fez o que (cancelamentos, check-in/out, caixa, troca de quarto) com data e usuário."},
{t:"melhoria",d:"Mais transparência e controle para hotéis com vários funcionários."}
]},
{v:"1.8.0",data:"2026-08-30",mudancas:[
{t:"novo",d:"Mapa de ocupação: em Reservas, veja uma grade de quartos por dia para saber de relance o que está ocupado e livre nos próximos dias."},
{t:"melhoria",d:"No mapa, clique num dia livre para já criar a reserva com quarto e data preenchidos, ou clique numa reserva para ver os detalhes e trocar o quarto."}
]},
{v:"1.7.0",data:"2026-08-30",mudancas:[
{t:"melhoria",d:"Proteção contra reserva duplicada (overbooking): o sistema agora impede que o mesmo quarto seja reservado para o mesmo período, inclusive quando dois usuários salvam ao mesmo tempo."},
{t:"melhoria",d:"Check-out e caixa mais seguros: o sistema confirma a gravação no banco antes de concluir e avisa caso algo falhe, evitando pagamento ou fechamento perdido em silêncio."},
{t:"melhoria",d:"Hotéis com muito histórico: carregamento completo dos dados (reservas, pagamentos, consumos) sem cortar em silêncio - relatórios ficam corretos."}
]},
{v:"1.6.2",data:"2026-08-29",mudancas:[
{t:"novo",d:"Trocar quarto de uma reserva: botão 'Trocar quarto' nas reservas confirmadas e em andamento, mostrando apenas os quartos livres no período."},
{t:"melhoria",d:"Se o novo quarto for de outro tipo, o valor da reserva é recalculado automaticamente; no check-in, o quarto antigo vai para limpeza e o novo fica ocupado."}
]},
{v:"1.6.1",data:"2026-08-29",mudancas:[
{t:"novo",d:"Atendimento com status: o suporte pode Finalizar um atendimento e Reabrir quando precisar; cada conversa mostra se está Aberta, Respondida ou Finalizada."},
{t:"melhoria",d:"Filtro de conversas no Painel do Dono (todas, abertas ou finalizadas) para organizar o suporte."},
{t:"melhoria",d:"A avaliação do atendimento agora aparece para o cliente quando o suporte finaliza o atendimento."}
]},
{v:"1.6.0",data:"2026-08-29",mudancas:[
{t:"novo",d:"Avaliação do atendimento: depois que o suporte responde, o cliente pode dar de 1 a 5 estrelas e deixar um comentário."},
{t:"novo",d:"Painel do Dono mostra a nota média e os comentários de cada hotel, além de quando o hotel acessou o sistema pela última vez."}
]},
{v:"1.5.2",data:"2026-08-29",mudancas:[
{t:"melhoria",d:"Chat de suporte agora abre em tela cheia (janela ampla no computador, tela inteira no celular): muito mais espaço para conversar e fácil de usar no telefone."},
{t:"melhoria",d:"WhatsApp e E-mail viraram botões rápidos no topo do chat; campo de mensagem com botão de enviar redondo."}
]},
{v:"1.5.1",data:"2026-08-29",mudancas:[
{t:"melhoria",d:"Chat de suporte atualiza sozinho: novas mensagens aparecem em segundos, sem precisar dar F5 ou reabrir a conversa."},
{t:"melhoria",d:"No Painel do Dono, o contador de mensagens não lidas se atualiza automaticamente."}
]},
{v:"1.5.0",data:"2026-08-29",mudancas:[
{t:"novo",d:"Suporte pelo chat dentro do sistema: envie sua mensagem e receba a resposta por aqui, sem sair do sistema."},
{t:"melhoria",d:"Chat de suporte com visual novo: balões de conversa, avatar, horário e separação por dia (Hoje/Ontem)."},
{t:"melhoria",d:"O botão de WhatsApp continua disponível no suporte como alternativa."}
]},
{v:"1.4.0",data:"2026-08-29",mudancas:[
{t:"melhoria",d:"Financeiro reorganizado: aba Visão Geral reúne os números principais e o balancete numa tela só."},
{t:"melhoria",d:"Relatórios mais enxutos e focados em análise (ocupação, KPIs, reservas e hóspedes); o financeiro fica no próprio módulo Financeiro."},
{t:"melhoria",d:"Menos abas repetidas: cada informação tem um lugar só."}
]},
{v:"1.3.0",data:"2026-08-28",mudancas:[
{t:"novo",d:"Relatórios com gráficos visuais de barras e colunas."},
{t:"novo",d:"Métricas hoteleiras TrevPAR e GOPPAR na ocupação."},
{t:"novo",d:"Balancete de Resultados: visão consolidada do financeiro em uma tela."},
{t:"melhoria",d:"Impressão profissional em todas as áreas (relatórios e fatura), com os dados do seu hotel."}
]},
{v:"1.2.0",data:"2026-08-28",mudancas:[
{t:"novo",d:"Financeiro completo: resumo com lucro líquido, ticket médio e contas a receber."},
{t:"novo",d:"Controle de despesas por categoria e comparativo mensal."},
{t:"novo",d:"Fechamento de caixa por turno: abra e feche o caixa com conferência de dinheiro, cartão e PIX, com cálculo automático de sobra ou falta."},
{t:"novo",d:"Contas a pagar e a receber, com alertas de vencimento."},
{t:"novo",d:"Relatórios profissionais: ocupação com diária média e RevPAR, receita por tipo de quarto, fluxo de caixa, DRE e extrato por hóspede."},
{t:"novo",d:"Impressão de relatórios em documento profissional, com os dados do seu hotel."},
{t:"melhoria",d:"Exportação de relatórios e financeiro em CSV (Excel)."}
]},
{v:"1.1.0",data:"2026-08-28",mudancas:[
{t:"novo",d:"Cadastro completo do hotel: endereço com busca por CEP e seleção de cidade/estado, e preenchimento automático de dados pelo CNPJ."},
{t:"novo",d:"Cadastro de hóspedes com CPF/CNPJ e busca de endereço por CEP."},
{t:"novo",d:"Busca de hóspede por nome ou documento na hora de criar a reserva, e cadastro rápido de hóspede sem sair da tela."},
{t:"novo",d:"Consentimento LGPD no cadastro do hóspede, com opção de exportar ou anonimizar os dados dele."},
{t:"novo",d:"Guia de boas-vindas no painel para novos hotéis e aviso quando faltam dados do cadastro."},
{t:"novo",d:"Exclusão de quartos, tipos de quarto e serviços, com proteções contra perda de histórico."},
{t:"novo",d:"Proteção por senha do dono para apagar os dados do hotel."},
{t:"melhoria",d:"Alertas do painel com ícones animados; barra de navegação mais legível."},
{t:"melhoria",d:"As janelas não fecham mais por clique acidental; ESC fecha e Enter faz login."},
{t:"melhoria",d:"Formas de pagamento com visual novo."}
]},
{v:"1.0.0",data:"2026-08-28",mudancas:[
{t:"novo",d:"Lançamento oficial do HospedaPrime! Sistema pronto para o dia a dia do seu hotel."},
{t:"melhoria",d:"Estabilidade e segurança reforçadas para uso em produção."},
{t:"melhoria",d:"Seus dados protegidos e isolados na nuvem, com acesso de qualquer dispositivo."}
]},
{v:"0.9.9-beta",data:"2026-08-27",mudancas:[
{t:"novo",d:"Login com e-mail e senha e cadastro do seu hotel."},
{t:"novo",d:"Dados agora ficam salvos na nuvem, acessíveis de qualquer dispositivo."},
{t:"melhoria",d:"Cada hotel tem seus dados totalmente separados e seguros."}
]},
{v:"0.9.8-beta",data:"2026-08-26",mudancas:[
{t:"melhoria",d:"O sistema agora se chama HospedaPrime."},
{t:"melhoria",d:"Código reorganizado internamente para evoluir com mais segurança."}
]},
{v:"0.9.7-beta",data:"2026-08-25",mudancas:[
{t:"melhoria",d:"Navegação unificada: no celular e no computador o botão Mais abre o mesmo menu moderno."},
{t:"melhoria",d:"Barra de navegação inferior estilo app também no computador, com menu Mais para os demais módulos."},
{t:"novo",d:"Barra de navegação inferior no celular, estilo app, com destaque no item ativo."},
{t:"correcao",d:"No celular, Novidades e Sair agora ficam visíveis no menu, acima da barra inferior."},
{t:"novo",d:"Suporte Online: botão de ajuda flutuante com WhatsApp, e-mail e mensagem, disponível até na tela de login."},
{t:"melhoria",d:"Novo visual escuro e moderno em todo o sistema, com destaque em roxo."},
{t:"melhoria",d:"Cartões, tabelas, formulários e janelas repaginados no novo tema."},
{t:"melhoria",d:"Melhor contraste e leitura em telas com pouca luz."}
]},
{v:"0.9.6-beta",data:"2026-08-24",mudancas:[
{t:"melhoria",d:"Avisos do painel com visual moderno, ícones destacados e melhor leitura."},
{t:"novo",d:"Mapa de quartos no painel: veja ocupados, reservados e livres num relance."},
{t:"novo",d:"Quartos ocupados exibem o nome do hóspede; clique para ver os detalhes."},
{t:"novo",d:"Janelas de confirmação modernas substituindo os avisos do navegador."},
{t:"novo",d:"Sistema já vem com hóspedes e reservas de exemplo para explorar."},
{t:"correcao",d:"Filtro Todas das reservas volta a mostrar a lista completa."},
{t:"melhoria",d:"Visual das janelas atualizado com efeito de desfoque e animação."},
{t:"melhoria",d:"Filtro de reservas selecionado fica destacado para melhor visualização."}
]},
{v:"0.9.5-beta",data:"2026-08-23",mudancas:[
{t:"melhoria",d:"Interface modernizada com visual mais elegante e cores refinadas."},
{t:"melhoria",d:"Cartões e tabelas com efeitos suaves ao passar o mouse."},
{t:"melhoria",d:"Animações de transição ao navegar entre as telas."}
]},
{v:"0.9.4-beta",data:"2026-08-22",mudancas:[
{t:"novo",d:"Painel de Novidades: histórico organizado de todas as atualizações do sistema."},
{t:"novo",d:"Selo de versão visível na tela de login e no menu lateral."},
{t:"melhoria",d:"Novidades agrupadas por tipo para facilitar a leitura."}
]},
{v:"0.9.3-beta",data:"2026-08-21",mudancas:[
{t:"correcao",d:"Botões X e Cancelar agora fecham corretamente todas as janelas."},
{t:"melhoria",d:"Fechar janelas tocando na área escura fora da caixa."}
]},
{v:"0.9.2-beta",data:"2026-08-20",mudancas:[
{t:"melhoria",d:"Sistema já inicia com dados de exemplo para facilitar a experiência."},
{t:"melhoria",d:"Acesso ao sistema simplificado."}
]},
{v:"0.9.1-beta",data:"2026-08-19",mudancas:[
{t:"melhoria",d:"Layout responsivo para celular com menu lateral deslizante."},
{t:"correcao",d:"Correção do menu mobile que bloqueava o toque nos itens."}
]},
{v:"0.9.0-beta",data:"2026-08-18",mudancas:[
{t:"novo",d:"Primeira versão do sistema publicada online."}
]}
];
export function getUltimaVersaoVista(){try{return localStorage.getItem("hms_lastseen_ver")}catch(e){return null}}
export function marcarVersaoVista(){try{localStorage.setItem("hms_lastseen_ver",APP_VERSION)}catch(e){}}
export function temNovidade(){return getUltimaVersaoVista()!==APP_VERSION}
function chgTagLabel(t){return t==="novo"?"Novo":t==="correcao"?"Correção":"Melhoria"}
function chgTagIcon(t){
  // icones SVG inline (sem emoji), herdam a cor da tag
  if(t==="novo")return'<svg class="chg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4L12 3z"/></svg>';
  if(t==="correcao")return'<svg class="chg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.8 2.8-2.2-.6-.6-2.2 2.9-2.8z"/></svg>';
  return'<svg class="chg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
}
function chgGrupoTitulo(t){return t==="novo"?"Novidades":t==="melhoria"?"Melhorias":"Correções"}
function renderChangelogHTML(nova){var h="";
if(nova){var ult=CHANGELOG[0];var n=ult?ult.mudancas.length:0;
h+='<div class="chg-banner"><div class="chg-banner-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4L12 3z"/><path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15z"/></svg></div><div><div class="chg-banner-title">O sistema foi atualizado!</div><div class="chg-banner-sub">Versão '+esc(ult?ult.v:APP_VERSION)+' &middot; '+n+' novidade'+(n===1?'':'s')+' nesta atualização</div></div></div>'}
var ordem=["novo","melhoria","correcao"];
for(var i=0;i<CHANGELOG.length;i++){var e=CHANGELOG[i];
h+='<div class="changelog-entry"><div class="changelog-head"><span class="changelog-ver">Versão '+esc(e.v)+'</span>'+(i===0?'<span class="chg-latest">Mais recente</span>':'')+'</div><div class="changelog-date">Atualizado em '+fmtD(e.data)+'</div>';
for(var g=0;g<ordem.length;g++){var tipo=ordem[g];var itens=e.mudancas.filter(function(m){return m.t===tipo});
if(!itens.length)continue;
h+='<div class="chg-grupo"><div class="chg-grupo-titulo"><span class="chg-tag chg-'+tipo+'">'+chgTagIcon(tipo)+' '+chgTagLabel(tipo)+'</span><span class="chg-grupo-nome">'+chgGrupoTitulo(tipo)+' <span class="chg-count">'+itens.length+'</span></span></div><ul class="changelog-list">';
for(var j=0;j<itens.length;j++){h+='<li>'+esc(itens[j].d)+'</li>'}
h+='</ul></div>'}
h+='</div>'}
return h}
export function showChangelog(auto){var nova=auto===true&&temNovidade();sm("Novidades do Sistema",renderChangelogHTML(nova),'<button class="btn btn-primary" onclick="marcarVersaoVista();atualizarBadgeNovidade();closeModal()">Entendi, obrigado</button>');marcarVersaoVista();atualizarBadgeNovidade()}
export function atualizarBadgeNovidade(){var d=document.getElementById("newsDot");if(d)d.style.display=temNovidade()?"block":"none"}
export function aplicarVersaoUI(){var t=document.getElementById("versionTag");if(t)t.textContent="v"+APP_VERSION;var l=document.getElementById("loginVersion");if(l)l.textContent="Versão "+APP_VERSION}
