export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb(event);

  await db.prepare('DELETE FROM saved_words WHERE user_id = ?').bind(user.id).run();
  await db.prepare('DELETE FROM api_tokens WHERE user_id = ?').bind(user.id).run();
  await db.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();

  setResponseStatus(event, 204);
  return null;
});
