/** Transactional e-mail (ADR-008): Resend when configured, else the message goes to the log. */
import { Resend } from 'resend';
import type { Mail } from './auth';

export function mailer(apiKey: string | undefined, from: string | undefined) {
  if (!apiKey || !from)
    return async (m: Mail) => console.info(`[e-mail para ${m.to}] ${m.subject}\n${m.text}`);
  const resend = new Resend(apiKey);
  return async (m: Mail) => {
    const { error } = await resend.emails.send({
      from,
      to: m.to,
      subject: m.subject,
      text: m.text,
    });
    if (error) console.error(`[e-mail] falha para ${m.to}: ${error.message}`);
  };
}
