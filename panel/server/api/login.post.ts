export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const row = await useDb(event)
    .prepare('SELECT id, name, email, native_lang, password FROM users WHERE email = ?')
    .bind(email)
    .first<AuthUser & { password: string }>();

  if (!row || !(await verifyPassword(password, row.password))) {
    throw validationError({ email: ['Invalid credentials.'] });
  }

  const { password: _hash, ...user } = row;
  return { token: await createToken(event, user.id), user };
});
