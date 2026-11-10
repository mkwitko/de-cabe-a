/** Cookie policy: the real list of what is stored, and where to change the choice. */
import { A, L, LegalPage } from '../components/Legal';
import { CONSENT_NEEDED, openConsentPanel, useConsent } from '../lib/consent';

const th = 'px-3 py-2 text-left font-semibold';
const td = 'px-3 py-2 align-top';

function Row({ name, what, who, time }: { name: string; what: string; who: string; time: string }) {
  return (
    <tr className="border-t border-chalk/15">
      <td className={`${td} font-semibold`}>{name}</td>
      <td className={td}>{what}</td>
      <td className={td}>{who}</td>
      <td className={td}>{time}</td>
    </tr>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-chalk/15">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="bg-chalk/[0.06]">
          <tr>
            <th className={th}>Nome</th>
            <th className={th}>Para quê</th>
            <th className={th}>Quem</th>
            <th className={th}>Dura</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Current() {
  const c = useConsent();
  const label = (v: boolean) => (v ? 'permitido' : 'recusado');
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p>
        {c
          ? `Sua escolha: análise ${label(c.analytics)}, anúncios ${label(c.ads)}.`
          : CONSENT_NEEDED
            ? 'Você ainda não escolheu. Nada opcional está ativo.'
            : 'Neste momento nenhum cookie opcional é usado.'}
      </p>
      <button
        type="button"
        onClick={openConsentPanel}
        className="font-condensed inline-flex min-h-11 items-center rounded-lg border-2 border-chalk-soft/60 px-4 text-base font-extrabold tracking-wide uppercase hover:border-chalk"
      >
        Mudar minha escolha
      </button>
    </div>
  );
}

export function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      intro="O que o site guarda no seu aparelho. Só o necessário vale sem você pedir; o resto espera o seu Aceitar."
      sections={[
        {
          id: 'escolha',
          title: 'Sua escolha',
          body: <Current />,
        },
        {
          id: 'necessarios',
          title: 'Necessários',
          body: (
            <>
              <p>Sem eles o jogo não funciona; por isso não pedem consentimento.</p>
              <Table>
                <Row
                  name="dc_session"
                  what="Liga seu aparelho às suas fases, estrelas e apelido."
                  who="De Cabeça F.C. (cookie HttpOnly)"
                  time="até 400 dias"
                />
                <Row
                  name="better-auth.*"
                  what="Mantém você conectado, se tiver conta."
                  who="De Cabeça F.C."
                  time="enquanto a conta estiver conectada"
                />
                <Row
                  name="dc_consent_v1, tema, som"
                  what="Lembram suas escolhas neste aparelho (armazenamento local, não é cookie)."
                  who="De Cabeça F.C."
                  time="até você limpar o navegador"
                />
              </Table>
              <p>
                O Sentry registra erros técnicos sem cookies e sem gravar a tela, por interesse
                legítimo em manter o site no ar. Nossas estatísticas de jogo usam um código curto e
                irreversível da sessão, sem cookie de terceiros.
              </p>
            </>
          ),
        },
        {
          id: 'analise',
          title: 'Análise',
          body: (
            <>
              <p>Só depois do seu Aceitar. Ajuda a ver como o jogo é usado.</p>
              <Table>
                <Row
                  name="ph_* (PostHog)"
                  what="Código anônimo do aparelho e eventos de uso. Campos de texto ficam ocultos."
                  who="PostHog, pelo nosso próprio endereço"
                  time="até você limpar o navegador"
                />
              </Table>
            </>
          ),
        },
        {
          id: 'anuncios',
          title: 'Anúncios',
          body: (
            <>
              <p>
                Só depois do seu Aceitar. Os anúncios aparecem fora da hora de jogar, nunca durante
                uma fase.
              </p>
              <Table>
                <Row
                  name="Cookies do Google"
                  what="Entregar, medir e personalizar anúncios."
                  who="Google AdSense"
                  time="definido pelo Google"
                />
              </Table>
              <p>
                Veja{' '}
                <A href="https://policies.google.com/technologies/ads?hl=pt-BR">
                  como o Google usa cookies em publicidade
                </A>
                .
              </p>
            </>
          ),
        },
        {
          id: 'mais',
          title: 'Mais',
          body: (
            <p>
              Você também pode apagar cookies pelo navegador, mas isso desconecta sua conta e, para
              visitantes, perde o progresso. Como tratamos seus dados:{' '}
              <L to="/privacidade">Privacidade</L>.
            </p>
          ),
        },
      ]}
    />
  );
}
