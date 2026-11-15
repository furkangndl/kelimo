export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = (await readBody(event)) ?? {};

  if (!['tr', 'en'].includes(body.native_lang)) {
    throw validationError({ native_lang: ['Ana dil tr veya en olmalı.'] });
  }

  await useDb(event).prepare('UPDATE users SET native_lang = ? WHERE id = ?').bind(body.native_lang, user.id).run();
  return { ...user, native_lang: body.native_lang };
});
