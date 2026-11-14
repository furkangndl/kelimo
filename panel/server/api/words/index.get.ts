const PER_PAGE = 20;

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const search = typeof query.q === 'string' ? query.q.trim() : '';
  const page = Math.max(1, Number(query.page) || 1);
  const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  const filter = search ? "AND (word LIKE ?2 ESCAPE '\\' OR meaning LIKE ?2 ESCAPE '\\')" : '';
  const params = search ? [user.id, like] : [user.id];

  const db = useDb(event);
  const total = await db.prepare(`SELECT COUNT(*) AS total FROM saved_words WHERE user_id = ?1 ${filter}`).bind(...params).first<{ total: number }>();
  const rows = await db
    .prepare(`SELECT id, word, meaning, created_at FROM saved_words WHERE user_id = ?1 ${filter} ORDER BY id DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`)
    .bind(...params)
    .all();

  return { data: rows.results, meta: { total: total?.total ?? 0, per_page: PER_PAGE, current_page: page } };
});
