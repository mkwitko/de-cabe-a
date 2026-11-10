import { Link } from 'react-router';
import { useMe } from '../lib/game';
import { btnPrimary } from './ui';

/** The sign-in page; with `back`, a successful sign-in returns there (a path on this site). */
export const signInHref = (back?: string) =>
  back ? `/conta?entrar=1&voltar=${encodeURIComponent(back)}` : '/conta?entrar=1';

/** "Entrar": always visible to guests (header, home, profile); renders nothing once signed in. */
export function SignInButton({ className = btnPrimary }: { className?: string }) {
  const me = useMe();
  if (me.data?.account) return null;
  return (
    <Link to="/conta?entrar=1" className={className}>
      Entrar
    </Link>
  );
}
