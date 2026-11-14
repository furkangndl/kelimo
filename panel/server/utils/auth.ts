import type { H3Event } from 'h3';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  native_lang: 'tr' | 'en';
}

const PBKDF2_ITERATIONS = 100_000;

const toHex = (bytes: ArrayBuffer | Uint8Array): string =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/.{2}/g) ?? [], (pair) => parseInt(pair, 16));

const derive = async (password: string, salt: Uint8Array, iterations: number): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toHex(bits);
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${await derive(password, salt, PBKDF2_ITERATIONS)}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, iterations, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) {
    return false;
  }
  const candidate = await derive(password, fromHex(salt), Number(iterations));
  let difference = candidate.length ^ hash.length;
  for (let index = 0; index < candidate.length; index++) {
    difference |= candidate.charCodeAt(index) ^ (hash.charCodeAt(index) || 0);
  }
  return difference === 0;
};

const sha256 = async (value: string): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));

export const createToken = async (event: H3Event, userId: number): Promise<string> => {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  await useDb(event).prepare('INSERT INTO api_tokens (user_id, token_hash) VALUES (?, ?)').bind(userId, await sha256(token)).run();
  return token;
};

export const bearerToken = (event: H3Event): string | null => {
  const header = getHeader(event, 'authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

export const revokeToken = async (event: H3Event, token: string): Promise<void> => {
  await useDb(event).prepare('DELETE FROM api_tokens WHERE token_hash = ?').bind(await sha256(token)).run();
};

export const requireUser = async (event: H3Event): Promise<AuthUser> => {
  const token = bearerToken(event);
  const user = token
    ? await useDb(event)
        .prepare(
          'SELECT users.id, users.name, users.email, users.native_lang FROM api_tokens JOIN users ON users.id = api_tokens.user_id WHERE api_tokens.token_hash = ?',
        )
        .bind(await sha256(token))
        .first<AuthUser>()
    : null;
  if (!user) {
    throw createError({ statusCode: 401, data: { message: 'Unauthenticated.' } });
  }
  return user;
};

export const validationError = (errors: Record<string, string[]>) =>
  createError({ statusCode: 422, data: { message: 'The given data was invalid.', errors } });
