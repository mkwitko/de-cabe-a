import { Link } from 'react-router';
import { useMe } from '../lib/game';
import { btnPrimary } from './ui';

const withBack = (path: string, back?: string) =>
  back ? `${path}${path.includes('?') ? '&' : '?'}voltar=${encodeURIComponent(back)}` : path;

/** The sign-in page; with `back`, a successful sign-in returns there (a path on this site). */
export const signInHref = (back?: string) => withBack('/entrar', back);
/** The same page, opened on "Criar conta". */
export const signUpHref = (back?: string) => withBack('/entrar?criar=1', back);

/** "Entrar": always visible to guests (header, home, profile); renders nothing once signed in. */
export function SignInButton({ className = btnPrimary }: { className?: string }) {
  const me = useMe();
  if (me.data?.account) return null;
  return (
    <Link to={signInHref()} className={className}>
      Entrar
    </Link>
  );
}
