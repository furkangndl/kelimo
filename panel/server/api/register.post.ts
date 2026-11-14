export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {};
  const errors: Record<string, string[]> = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || name.length > 100) {
    errors.name = ['The name field is required (max 100 characters).'];
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    errors.email = ['The email field must be a valid email address.'];
  }
  if (password.length < 8) {
    errors.password = ['The password field must be at least 8 characters.'];
  }
  if (!['tr', 'en'].includes(body.native_lang)) {
    errors.native_lang = ['The native language must be tr or en.'];
  }
  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  const db = useDb(event);
  if (await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()) {
    throw validationError({ email: ['The email has already been taken.'] });
  }

  const result = await db
    .prepare('INSERT INTO users (name, email, password, native_lang) VALUES (?, ?, ?, ?)')
    .bind(name, email, await hashPassword(password), body.native_lang)
    .run();
  const user: AuthUser = { id: result.meta.last_row_id, name, email, native_lang: body.native_lang };

  setResponseStatus(event, 201);
  return { token: await createToken(event, user.id), user };
});
