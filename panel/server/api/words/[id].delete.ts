export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const result = await useDb(event)
    .prepare('DELETE FROM saved_words WHERE id = ? AND user_id = ?')
    .bind(Number(getRouterParam(event, 'id')), user.id)
    .run();

  if (result.meta.changes === 0) {
    throw createError({ statusCode: 404, data: { message: 'Not found.' } });
  }
  setResponseStatus(event, 204);
  return null;
});
