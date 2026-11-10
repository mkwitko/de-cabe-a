/** "Instalar o app": a small card after a level ends (dismissible for good) and a row in Ajustes. */
import { dismissInstall, promptInstall, useInstall } from '../lib/install';

const IOS_HINT = (
  <>
    No iPhone: toque em <strong className="text-chalk">Compartilhar</strong> e depois em{' '}
    <strong className="text-chalk">Adicionar à Tela de Início</strong>.
  </>
);

/** Shown once a level is over, never during play. */
export function InstallInvite() {
  const { kind, dismissed } = useInstall();
  if (!kind || dismissed) return null;
  return (
    <aside
      aria-label="Instalar o app"
      className="flex items-start gap-3 rounded-xl border border-chalk/15 bg-black/25 p-3 text-sm text-chalk-soft"
    >
      <img src="/icon-192.png" alt="" width={40} height={40} loading="lazy" decoding="async" className="size-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-chalk">Jogue direto da tela inicial</p>
        {kind === 'ios' ? (
          <p>{IOS_HINT}</p>
        ) : (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="mt-1 min-h-11 font-bold text-gold underline underline-offset-4"
          >
            Instalar o app
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismissInstall}
        aria-label="Agora não"
        className="-m-1 grid size-11 shrink-0 place-items-center rounded-full hover:bg-chalk/10 hover:text-chalk"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </aside>
  );
}

/** The row in Ajustes: always there while the app can be installed. */
export function InstallRow({ className }: { className: string }) {
  const { kind } = useInstall();
  if (kind === 'prompt')
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        className={`${className} text-left`}
      >
        Instalar o app <span aria-hidden="true">›</span>
      </button>
    );
  if (kind === 'ios')
    return (
      <p className="px-1 py-2 text-sm text-chalk-soft">
        <span className="block font-semibold text-chalk">Instalar o app</span>
        {IOS_HINT}
      </p>
    );
  return null;
}
