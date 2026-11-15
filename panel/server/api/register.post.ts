export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {};
  const errors: Record<string, string[]> = {};

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    errors.email = ['Geçerli bir e-posta gir.'];
  }
  if (password.length < 8) {
    errors.password = ['Şifre en az 8 karakter olmalı.'];
  }
  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  const db = useDb(event);
  if (await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()) {
    throw validationError({ email: ['Bu e-posta zaten kayıtlı.'] });
  }

  const result = await db
    .prepare("INSERT INTO users (name, email, password, native_lang) VALUES ('', ?, ?, 'tr')")
    .bind(email, await hashPassword(password))
    .run();
  const user: AuthUser = { id: result.meta.last_row_id, name: '', email, native_lang: 'tr' };

  setResponseStatus(event, 201);
  return { token: await createToken(event, user.id), user };
});
