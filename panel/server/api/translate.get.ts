export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const word = typeof query.word === 'string' ? query.word.trim() : '';
  const sentence = typeof query.sentence === 'string' && query.sentence.trim() ? query.sentence.trim() : null;

  if (!word || word.length > 100 || (sentence && sentence.length > 500)) {
    throw validationError({ word: ['The word field is required (max 100 characters), sentence max 500.'] });
  }

  const [from, to] = user.native_lang === 'tr' ? ['en', 'tr'] : ['tr', 'en'];
  try {
    return { word, ...(await senseFor(event, word, sentence, from, to)) };
  } catch {
    throw createError({ statusCode: 502, data: { message: 'Translation service unavailable.' } });
  }
});
