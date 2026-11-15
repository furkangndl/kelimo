import type { H3Event } from 'h3';

interface Sense {
  meaning: string | null;
  pos: string | null;
}

interface Candidate {
  meaning: string;
  pos: string | null;
}

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const commonPrefixLength = (a: string, b: string): number => {
  const left = [...a];
  const right = [...b];
  let length = 0;
  while (length < Math.min(left.length, right.length) && left[length] === right[length]) {
    length++;
  }
  return length;
};

export const senseFor = async (event: H3Event, word: string, sentence: string | null, from: string, to: string): Promise<Sense> => {
  const db = useDb(event);
  const key = await cacheKey(['v3', word, sentence ?? '', from, to]);
  const now = Math.floor(Date.now() / 1000);

  const cached = await db.prepare('SELECT value FROM translation_cache WHERE key = ? AND created_at > ?').bind(key, now - CACHE_TTL_SECONDS).first<{ value: string }>();
  if (cached) {
    return JSON.parse(cached.value);
  }

  const sense = await resolveSense(event, word, sentence, from, to);
  await db
    .prepare('INSERT INTO translation_cache (key, value, created_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, created_at = excluded.created_at')
    .bind(key, JSON.stringify(sense), now)
    .run();
  return sense;
};

const cacheKey = async (parts: string[]): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('|')));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const sameWord = (a: string, b: string): boolean => a.toLocaleLowerCase() === b.toLocaleLowerCase();
const isPhrase = (text: string): boolean => /\s/.test(text.trim());
const isSuffixEntry = (meaning: string): boolean => /(^|\s)-/.test(meaning);

/** Dictionary meanings joined for words whose context could not pick a single one. */
const topCandidates = (candidates: Candidate[]): Sense => {
  const seen = new Set<string>();
  const meanings: string[] = [];
  for (const candidate of candidates) {
    const key = candidate.meaning.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      meanings.push(candidate.meaning);
    }
    if (meanings.length === 3) {
      break;
    }
  }
  return { meaning: meanings.join(', '), pos: candidates[0].pos };
};

/**
 * Meaning of a word in its sentence.
 *
 * The dictionary supplies clean base-form candidates; the sentence translation's word alignment is only trusted to
 * choose between them (aligned target words are often inflected suffix pieces, so they are never shown as the meaning).
 */
const resolveSense = async (event: H3Event, word: string, sentence: string | null, from: string, to: string): Promise<Sense> => {
  if (isPhrase(word)) {
    const translated = (await translate(event, word, from, to)).text.toLocaleLowerCase(to);
    return { meaning: translated && !sameWord(translated, word) ? translated : null, pos: null };
  }

  // The service sometimes "translates" a word to itself (loanwords, slang) or returns bare suffixes; neither is a meaning.
  const candidates = (await lookup(event, word, from, to)).filter(
    (candidate) => !sameWord(candidate.meaning, word) && !isSuffixEntry(candidate.meaning),
  );
  const aligned = sentence ? await alignedWords(event, word, sentence, from, to) : [];

  const best = bestCandidate(candidates, aligned);
  if (best) {
    return best;
  }

  const alone = (await translate(event, word, from, to)).text.toLocaleLowerCase(to);
  const hasAlone = alone !== '' && !sameWord(alone, word);
  const pos = candidates[0]?.pos ?? null;

  if (hasAlone) {
    const exact = candidates.find((candidate) => sameWord(candidate.meaning, alone));
    if (exact) {
      return exact;
    }
    // e.g. "En yeni" for "newest" where the dictionary only has the base form "yeni".
    if (candidates.some((candidate) => alone.includes(candidate.meaning.toLocaleLowerCase(to)))) {
      return { meaning: alone, pos };
    }
  }

  if (candidates.length > 0) {
    return topCandidates(candidates);
  }
  return { meaning: hasAlone ? alone : null, pos: null };
};

const lookup = async (event: H3Event, word: string, from: string, to: string): Promise<Candidate[]> => {
  const response = await post(event, '/dictionary/lookup', { from, to }, word);
  return (response[0]?.translations ?? []).map((item: any) => ({
    meaning: item.normalizedTarget,
    pos: item.posTag ? String(item.posTag).toLowerCase() : null,
  }));
};

const alignedWords = async (event: H3Event, word: string, sentence: string, from: string, to: string): Promise<string[]> => {
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(word)}(?![\\p{L}\\p{N}])`, 'iu').exec(sentence);
  if (!match) {
    return [];
  }
  const position = match.index;
  const translation = await translate(event, sentence, from, to, true);

  const words: string[] = [];
  for (const pair of translation.alignment.split(' ')) {
    const parts = /^(\d+):(\d+)-(\d+):(\d+)$/.exec(pair);
    if (!parts) {
      continue;
    }
    if (position >= Number(parts[1]) && position <= Number(parts[2])) {
      words.push(translation.text.slice(Number(parts[3]), Number(parts[4]) + 1));
    }
  }
  return words;
};

const bestCandidate = (candidates: Candidate[], aligned: string[]): Candidate | null => {
  let best: Candidate | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const target = candidate.meaning.toLocaleLowerCase();
    for (const alignedWord of aligned) {
      const score = commonPrefixLength(target, alignedWord.toLocaleLowerCase());
      if (score >= Math.min(3, [...target].length) && score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }
  return best;
};

const translate = async (event: H3Event, text: string, from: string, to: string, align = false): Promise<{ text: string; alignment: string }> => {
  const query: Record<string, string> = { from, to };
  if (align) {
    query.includeAlignment = 'true';
  }
  const translation = (await post(event, '/translate', query, text))[0]?.translations?.[0] ?? {};
  return { text: translation.text ?? '', alignment: translation.alignment?.proj ?? '' };
};

const post = async (event: H3Event, path: string, query: Record<string, string>, text: string): Promise<any[]> => {
  const config = useRuntimeConfig(event);
  const url = `${config.azureTranslatorEndpoint}${path}?${new URLSearchParams({ 'api-version': '3.0', ...query })}`;
  return $fetch<any[]>(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.azureTranslatorKey,
      'Ocp-Apim-Subscription-Region': config.azureTranslatorRegion,
    },
    body: [{ Text: text }],
  });
};
