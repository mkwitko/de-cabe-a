/** Privacy notice (LGPD, Lei 13.709/2018). Plain PT-BR; blanks for the owner are marked [preencher]. */
import { A, CONTROLLER, DPO_EMAIL, Fill, L, LegalPage, Ul } from '../components/Legal';

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacidade"
      intro="O De Cabeça F.C. é um jogo. Guardamos o mínimo para ele funcionar, não vendemos seus dados e você pode baixá-los ou apagá-los quando quiser."
      sections={[
        {
          id: 'quem',
          title: 'Quem cuida dos dados',
          body: (
            <>
              <p>
                O controlador dos dados é {CONTROLLER}. O encarregado pelo tratamento de dados
                pessoais (LGPD, art. 41) atende em {DPO_EMAIL}.
              </p>
            </>
          ),
        },
        {
          id: 'dados',
          title: 'O que guardamos e por quê',
          body: (
            <Ul>
              <li>
                <strong>Sessão do aparelho</strong> (cookie necessário): um código aleatório que
                liga seu aparelho às suas fases, estrelas, figurinhas, ligas e apelido. Sem ele o
                jogo não funciona. Base legal: execução do serviço que você pediu (art. 7º, V).
              </li>
              <li>
                <strong>Apelido</strong> e, se você abrir, o perfil público. Aparecem nos rankings e
                nas ligas. Base: execução do serviço.
              </li>
              <li>
                <strong>Conta, se você criar</strong>: e-mail, apelido e senha (guardada só como
                resumo criptográfico). Se entrar com Google, recebemos o nome e a foto do seu perfil
                Google. Base: execução do serviço.
              </li>
              <li>
                <strong>Seu jogo</strong>: tentativas e respostas em cada fase, estrelas,
                figurinhas, carreira, ligas e preferências. Base: execução do serviço.
              </li>
              <li>
                <strong>Avisos no celular</strong> (opcional): o endereço técnico do seu navegador
                para enviar o aviso do Desafio do Dia ou da liga. Base: seu consentimento.
              </li>
              <li>
                <strong>Relatos que você enviar</strong> sobre uma fase ou uma liga. Base: legítimo
                interesse em corrigir o jogo.
              </li>
              <li>
                <strong>Estatísticas do jogo, nossas</strong>: eventos como &quot;fase
                iniciada&quot; e &quot;fase concluída&quot;, ligados a um código curto e
                irreversível da sessão. Sem IP, sem texto de busca, sem cookie de terceiros. Base:
                legítimo interesse em saber se o jogo funciona. Buscas sem resultado ficam 30 dias.
              </li>
              <li>
                <strong>Erros técnicos (Sentry)</strong>: registro de falhas do site e da API, sem
                dados pessoais de propósito e sem gravação de tela. Base: legítimo interesse em
                manter o serviço no ar e seguro.
              </li>
              <li>
                <strong>Análise de uso (PostHog)</strong>: como o jogo é usado, com campos de texto
                ocultos. Só depois do seu &quot;Aceitar&quot;. Base: seu consentimento.
              </li>
              <li>
                <strong>Anúncios (Google AdSense)</strong>: só depois do seu &quot;Aceitar&quot;,
                fora da hora de jogar. O Google usa cookies para entregar e medir os anúncios; veja{' '}
                <A href="https://policies.google.com/technologies/ads?hl=pt-BR">
                  como o Google usa cookies em publicidade
                </A>
                . Base: seu consentimento.
              </li>
            </Ul>
          ),
        },
        {
          id: 'compartilhamos',
          title: 'Com quem compartilhamos',
          body: (
            <>
              <p>
                Só com quem faz parte do serviço: hospedagem do site, <strong>Resend</strong> (envia
                os e-mails de confirmação e de nova senha), <strong>Google</strong> (login com
                Google e, com seu consentimento, anúncios), <strong>PostHog</strong> (com seu
                consentimento) e <strong>Sentry</strong> (erros). Alguns desses serviços processam
                dados fora do Brasil, sob as regras de transferência da LGPD (art. 33). Seu apelido
                e seus resultados são públicos nos rankings; o perfil só é público se você abrir.
              </p>
            </>
          ),
        },
        {
          id: 'prazo',
          title: 'Por quanto tempo',
          body: (
            <Ul>
              <li>Conta e jogo: até você excluir a conta.</li>
              <li>
                Visitante sem conta: até você apagar os dados em <L to="/conta">Conta</L>. Hoje não
                há limpeza automática de sessões paradas{' '}
                <Fill>prazo, se o dono definir uma limpeza</Fill>.
              </li>
              <li>Buscas sem resultado: 30 dias.</li>
              <li>
                Cópias de segurança: mantidas pelo prazo definido na hospedagem{' '}
                <Fill>prazo de retenção do backup</Fill>.
              </li>
            </Ul>
          ),
        },
        {
          id: 'direitos',
          title: 'Seus direitos',
          body: (
            <>
              <p>
                Pela LGPD (art. 18) você pode confirmar que tratamos seus dados, acessá-los,
                corrigi-los, pedir anonimização ou eliminação, levá-los a outro serviço, saber com
                quem os compartilhamos, retirar o consentimento e se opor a um uso.
              </p>
              <Ul>
                <li>
                  <strong>Baixar meus dados</strong>: em <L to="/conta">Conta</L>, um arquivo JSON
                  com tudo que guardamos de você.
                </li>
                <li>
                  <strong>Excluir conta</strong>: em <L to="/conta">Conta</L>. Apaga seus jogos,
                  figurinhas, ligas, avisos e sessões de uma vez e encerra seu acesso. Níveis da
                  Oficina que você criou continuam para os outros, sem seu nome. Não dá para
                  desfazer.
                </li>
                <li>
                  <strong>Cookies</strong>: mude sua escolha quando quiser em{' '}
                  <L to="/cookies">Cookies</L> ou no rodapé.
                </li>
                <li>
                  <strong>Qualquer outro pedido</strong>: escreva para {DPO_EMAIL}. Respondemos em
                  até 15 dias.
                </li>
              </Ul>
              <p>
                Se não resolvermos, você pode reclamar à{' '}
                <A href="https://www.gov.br/anpd">
                  Autoridade Nacional de Proteção de Dados (ANPD)
                </A>
                .
              </p>
            </>
          ),
        },
        {
          id: 'menores',
          title: 'Crianças e adolescentes',
          body: (
            <p>
              O jogo é para todas as idades. Para crianças, o tratamento de dados deve atender ao
              melhor interesse delas (LGPD, art. 14); peça a um responsável para criar conta ou
              aceitar cookies opcionais <Fill>revisar esta seção com assessoria jurídica</Fill>.
            </p>
          ),
        },
        {
          id: 'creditos',
          title: 'Créditos',
          body: (
            <Ul>
              <li>
                <strong>Fotos de jogadores</strong>: do Wikimedia Commons, em licenças livres. O
                autor e a licença aparecem ao lado de cada foto.
              </li>
              <li>
                <strong>Dados de carreira</strong>: Wikidata (CC0) e Wikipédia (CC BY-SA).
              </li>
              <li>
                <strong>Música e efeitos sonoros</strong>: músicas de menu (&quot;Heavenly
                Loop&quot;, de isaiah658) e de fase (&quot;Determined Pursuit&quot;, de Emma_MA),
                ambas em CC0 (domínio público) no OpenGameArt. Os efeitos sonoros são sintetizados
                no seu aparelho.
              </li>
              <li>
                <strong>Vestiário da página inicial</strong>: as imagens do vestiário (de dia e à
                noite) e a poeira na luz são nossas, feitas para o De Cabeça F.C.; a animação usa o
                player dotLottie (licença MIT).
              </li>
              <li>
                Não usamos escudos de clubes. O De Cabeça F.C. não tem ligação com clubes,
                federações ou jogadores citados.
              </li>
            </Ul>
          ),
        },
      ]}
    />
  );
}
