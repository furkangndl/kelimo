export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = (await readBody(event)) ?? {};
  const word = typeof body.word === 'string' ? body.word.trim() : '';
  const meaning = typeof body.meaning === 'string' ? body.meaning.trim() : '';

  const errors: Record<string, string[]> = {};
  if (!word || word.length > 100) {
    errors.word = ['The word field is required (max 100 characters).'];
  }
  if (!meaning || meaning.length > 255) {
    errors.meaning = ['The meaning field is required (max 255 characters).'];
  }
  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  const db = useDb(event);
  const inserted = await db
    .prepare('INSERT INTO saved_words (user_id, word, meaning) VALUES (?, ?, ?) ON CONFLICT(user_id, word, meaning) DO NOTHING')
    .bind(user.id, word, meaning)
    .run();
  const saved = await db
    .prepare('SELECT id, word, meaning, created_at FROM saved_words WHERE user_id = ? AND word = ? AND meaning = ?')
    .bind(user.id, word, meaning)
    .first();

  setResponseStatus(event, inserted.meta.changes > 0 ? 201 : 200);
  return { data: saved };
});
