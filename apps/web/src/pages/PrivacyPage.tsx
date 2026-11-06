/** Privacy notice (LGPD; required by AdSense). Plain and short, PT-BR. */
export function PrivacyPage() {
  const h2 = 'font-condensed text-2xl font-extrabold uppercase';
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 leading-relaxed">
      <h1 className="font-condensed text-4xl font-black uppercase">Privacidade</h1>
      <p>
        O De Cabeça é um jogo. Guardamos o mínimo para ele funcionar e nunca vendemos seus dados.
      </p>
      <h2 className={h2}>O que guardamos</h2>
      <ul className="list-disc pl-6">
        <li>
          <strong>Cookie de sessão</strong> (técnico): identifica seu aparelho para guardar suas
          fases, estrelas e apelido. Sem ele o jogo não funciona.
        </li>
        <li>
          <strong>Conta (opcional)</strong>: e-mail e apelido; se entrar com Google, também o nome e
          a foto do perfil Google. A senha fica só como resumo criptográfico.
        </li>
        <li>
          <strong>Estatísticas de uso</strong> sem identificação pessoal: fases jogadas, acertos,
          tempo. Não guardamos IP nem o texto das buscas nos eventos.
        </li>
        <li>
          <strong>Relatos de erro</strong> que você enviar sobre uma fase.
        </li>
      </ul>
      <h2 className={h2}>Serviços de terceiros</h2>
      <ul className="list-disc pl-6">
        <li>
          <strong>Sentry</strong>: registra erros técnicos do site e da API para corrigirmos, sem
          dados pessoais.
        </li>
        <li>
          <strong>Google AdSense</strong>: mostra anúncios fora da hora de jogar. Pedimos anúncios
          não personalizados (sem perfil montado a partir da sua navegação), mas o Google pode usar
          cookies para entregar e medir os anúncios. Veja{' '}
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
      <h2 className={h2}>Seus direitos</h2>
      <p>
        Você pode pedir para ver, corrigir ou apagar seus dados, ou sair a qualquer momento pela
        página Conta. Para pedidos, escreva para{' '}
        <a className="underline underline-offset-4" href="mailto:contato@decabecafc.com.br">
          contato@decabecafc.com.br
        </a>
        .
      </p>
    </article>
  );
}
