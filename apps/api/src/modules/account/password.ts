/** Passwords: scrypt (node:crypto), constant-time verification. Format scrypt$N$salt$hash. */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  pw: string,
  salt: Buffer,
  len: number,
  opts: object,
) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, n, salt, hash] = stored.split('$');
  if (!n || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const got = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
    ...SCRYPT,
    N: Number(n),
  });
  return timingSafeEqual(got, expected);
}
