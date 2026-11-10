import { AdConsentChoice } from '../components/AdSlot';
/** Privacy notice (LGPD; required by AdSense). Plain and short, PT-BR. */
export function PrivacyPage() {
  const h2 =
    'font-condensed text-2xl font-extrabold uppercase border-l-4 border-cover pl-3 leading-none';
  const card = 'flex flex-col gap-3 rounded-xl border border-chalk/15 bg-chalk/[0.05] p-5';
  return (
    <article className="flex flex-col gap-6 leading-relaxed">
      <h1 className="font-condensed text-4xl font-black uppercase">Privacidade</h1>
      <p className="max-w-[60ch] text-lg text-chalk-soft">
        O De Cabeça F.C. é um jogo. Guardamos o mínimo para ele funcionar e nunca vendemos seus
        dados.
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className={h2}>O que guardamos</h2>
          <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-cover">
            <li>
              <strong>Cookie de sessão</strong> (técnico): identifica seu aparelho para guardar suas
              fases, estrelas e apelido. Sem ele o jogo não funciona.
            </li>
            <li>
              <strong>Conta (opcional)</strong>: e-mail e apelido; se entrar com Google, também o
              nome e a foto do perfil Google. A senha fica só como resumo criptográfico.
            </li>
            <li>
              <strong>Estatísticas de uso</strong> sem identificação pessoal: fases jogadas,
              acertos, tempo. Não guardamos IP nem o texto das buscas nos eventos.
            </li>
            <li>
              <strong>Relatos de erro</strong> que você enviar sobre uma fase.
            </li>
          </ul>
        </section>
        <section className={card}>
          <h2 className={h2}>Serviços de terceiros</h2>
          <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-cover">
            <li>
              <strong>Sentry</strong>: registra erros técnicos do site e da API para corrigirmos,
              sem dados pessoais.
            </li>
            <li>
              <strong>Google AdSense</strong>: mostra anúncios fora da hora de jogar. Anúncios do
              seu interesse (com perfil montado pelo Google a partir da sua navegação) só se você
              aceitar; senão, anúncios comuns. Em ambos os casos o Google pode usar cookies para
              entregar e medir os anúncios. Veja{' '}
              <a
                className="underline underline-offset-4"
                href="https://policies.google.com/technologies/ads?hl=pt-BR"
                rel="noreferrer"
                target="_blank"
              >
                como o Google usa cookies em publicidade
              </a>
              .
            </li>
            <li>
              <strong>Resend</strong>: envia os e-mails de confirmação e de nova senha.
            </li>
          </ul>
          <AdConsentChoice />
        </section>
      </div>
      <section className={card}>
        <h2 className={h2}>Seus direitos</h2>
        <p>
          Você pode pedir para ver, corrigir ou apagar seus dados, ou sair a qualquer momento pela
          página Conta. Para pedidos, escreva para{' '}
          <a className="underline underline-offset-4" href="mailto:contato@decabecafc.com.br">
            contato@decabecafc.com.br
          </a>
          .
        </p>
      </section>
    </article>
  );
}
