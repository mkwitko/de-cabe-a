/**
 * The player's own backup of the career (ADR-023): download the file, restore it later or on
 * another device. The server validates the file; a restore replaces the career in progress.
 */
import { useState } from 'react';
import { api, apiFetch } from '../../../lib/api';
import { btnSecondary } from '../../../components/ui';
import { t } from '../i18n';

export function Backup({ onError }: { onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const fail = (err: Error) => {
    setBusy(false);
    onError(err.message || t('backup.error'));
  };
  const download = () => {
    setBusy(true);
    apiFetch('/v1/manager/career/export')
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'carreira.json.gz';
        a.click();
        URL.revokeObjectURL(a.href);
        setBusy(false);
      })
      .catch(fail);
  };
  const restore = (file: File) => {
    if (!window.confirm(t('backup.confirm'))) return;
    setBusy(true);
    file
      .arrayBuffer()
      .then((body) =>
        api('/v1/manager/career/import', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body,
        }),
      )
      // The worker and the screen hold the old career: start over from the server's.
      .then(() => window.location.reload())
      .catch(fail);
  };
  return (
    <section aria-labelledby="backup-title" className="sala-slab flex flex-col gap-3 p-4 sm:p-5">
      <h3
        id="backup-title"
        className="font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase"
      >
        {t('backup.title')}
      </h3>
      <p className="text-chalk-soft">{t('backup.text')}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={btnSecondary} disabled={busy} onClick={download}>
          {t('backup.export')}
        </button>
        <label className={`${btnSecondary} cursor-pointer`}>
          {t('backup.import')}
          <input
            type="file"
            accept=".gz,application/gzip"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) restore(f);
            }}
          />
        </label>
      </div>
    </section>
  );
}
