const MAX_WORDS = 5000;

/** Every saved word of the user, used by the extension to mark known words in captions. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const rows = await useDb(event)
    .prepare(`SELECT id, word, meaning FROM saved_words WHERE user_id = ? ORDER BY id DESC LIMIT ${MAX_WORDS}`)
    .bind(user.id)
    .all();

  return { data: rows.results };
});
