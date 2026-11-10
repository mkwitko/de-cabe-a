/** Terms of use. Plain PT-BR; blanks for the owner are marked [preencher]. */
import { isPageLaunched } from '../lib/launch';
import { APOIO_RECIPIENT } from '@decabeca/contracts';
import { CONTROLLER, DPO_EMAIL, L, LegalPage, Ul } from '../components/Legal';

export function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      intro="Regras simples para jogar o De Cabeça F.C. Ao usar o site, você concorda com elas."
      sections={[
        {
          id: 'servico',
          title: 'O serviço',
          body: (
            <p>
              O De Cabeça F.C. é um conjunto de minijogos de futebol, grátis, mantido por{' '}
              {CONTROLLER}. Você joga sem cadastro; a conta é opcional e serve para guardar seu
              progresso em vários aparelhos.
            </p>
          ),
        },
        {
          id: 'regras',
          title: 'Como usar',
          body: (
            <Ul>
              <li>
                Escolha um apelido que não ofenda ninguém. Apelidos ofensivos podem ser trocados.
              </li>
              <li>Não use robôs, scripts ou falhas para ganhar estrelas ou subir no ranking.</li>
              <li>Não tente derrubar, sobrecarregar ou invadir o site.</li>
              <li>Uma conta é sua, para uso pessoal. Cuide da sua senha.</li>
            </Ul>
          ),
        },
        {
          id: 'conteudo',
          title: 'Conteúdo e propriedade',
          body: (
            <p>
              O jogo, o design e o código são nossos. Os dados de jogadores vêm de fontes abertas
              (Wikidata e Wikipédia) e as fotos do Wikimedia Commons, cada uma com a licença e o
              crédito do autor; veja <L to="/privacidade#creditos">Créditos</L>. Estrelas, títulos e
              figurinhas são só do jogo: não têm valor em dinheiro e não podem ser vendidos.
            </p>
          ),
        },
        // Only while Apoie is open (lib/launch.ts).
        ...(isPageLaunched('apoie')
          ? [
              {
                id: 'apoio',
                title: 'Apoio voluntário',
                body: (
                  <Ul>
                    <li>
                      Em <L to="/apoie">Apoie</L> você pode apoiar o projeto, uma vez ou todo mês. O
                      apoio é voluntário e é recebido por {APOIO_RECIPIENT}.
                    </li>
                    <li>
                      Não é compra: não dá estrela, dica, fase nem qualquer vantagem no jogo. Com
                      conta, o cartão de sócio mostra a marca Apoiador, só como agradecimento.
                    </li>
                    <li>
                      Apoio dado não é devolvido, salvo nos casos que a lei garante. O apoio mensal
                      pode ser cancelado a qualquer momento e vale até o fim do mês já pago.
                    </li>
                    <li>Pagamentos pela Stripe, com cartão ou Pix.</li>
                  </Ul>
                ),
              },
            ]
          : []),
        {
          id: 'garantia',
          title: 'Sem garantias',
          body: (
            <p>
              Fazemos o possível para os dados de carreira estarem certos, mas pode haver erros; use
              o botão de relato na fase. O serviço pode mudar, parar ou ter fases e modos fechados a
              qualquer momento. Não nos responsabilizamos por perdas decorrentes de instabilidade,
              na medida permitida pela lei.
            </p>
          ),
        },
        {
          id: 'encerrar',
          title: 'Encerrar',
          body: (
            <p>
              Você pode excluir sua conta quando quiser em{' '}
              <L to="/conta?aba=dados">Conta › Seus dados</L>. Podemos suspender contas que quebrem
              estas regras. Como tratamos seus dados está em <L to="/privacidade">Privacidade</L>.
            </p>
          ),
        },
        {
          id: 'lei',
          title: 'Lei e contato',
          body: (
            <p>
              Valem as leis do Brasil. Dúvidas sobre estes termos: {DPO_EMAIL}. Podemos atualizar
              este texto; a data no topo mostra a última versão.
            </p>
          ),
        },
      ]}
    />
  );
}
