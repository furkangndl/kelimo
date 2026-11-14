<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class AzureTranslator
{
    /**
     * Pick the single meaning of $word that fits $sentence.
     *
     * @return array{meaning: string|null, pos: string|null}
     *
     * @throws RequestException
     */
    public function senseFor(string $word, ?string $sentence, string $from, string $to): array
    {
        $key = 'sense:'.md5(implode('|', [$word, $sentence, $from, $to]));

        return Cache::remember($key, now()->addDays(30), function () use ($word, $sentence, $from, $to) {
            $candidates = $this->lookup($word, $from, $to);
            $aligned = $sentence ? $this->alignedWords($word, $sentence, $from, $to) : [];

            $best = $this->bestCandidate($candidates, $aligned);

            if ($best !== null) {
                return $best;
            }

            if ($aligned !== []) {
                return ['meaning' => $aligned[0], 'pos' => null];
            }

            if ($candidates !== []) {
                return $candidates[0];
            }

            return ['meaning' => $this->translate($word, $from, $to)['text'], 'pos' => null];
        });
    }

    /**
     * @return list<array{meaning: string, pos: string|null}>
     *
     * @throws RequestException
     */
    private function lookup(string $word, string $from, string $to): array
    {
        $response = $this->post('/dictionary/lookup', ['from' => $from, 'to' => $to], $word);

        return collect($response[0]['translations'] ?? [])
            ->map(fn (array $item) => [
                'meaning' => $item['normalizedTarget'],
                'pos' => isset($item['posTag']) ? strtolower($item['posTag']) : null,
            ])
            ->values()
            ->all();
    }

    /**
     * Target-language words the translator aligned to $word inside $sentence.
     *
     * @return list<string>
     *
     * @throws RequestException
     */
    private function alignedWords(string $word, string $sentence, string $from, string $to): array
    {
        $pattern = '/(?<![\p{L}\p{N}])'.preg_quote($word, '/').'(?![\p{L}\p{N}])/iu';

        if (! preg_match($pattern, $sentence, $match, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        $position = mb_strlen(substr($sentence, 0, $match[0][1]));
        $translation = $this->translate($sentence, $from, $to, true);
        $words = [];

        foreach (explode(' ', $translation['alignment']) as $pair) {
            if (! preg_match('/^(\d+):(\d+)-(\d+):(\d+)$/', $pair, $m)) {
                continue;
            }

            if ($position >= (int) $m[1] && $position <= (int) $m[2]) {
                $words[] = mb_substr($translation['text'], (int) $m[3], (int) $m[4] - (int) $m[3] + 1);
            }
        }

        return $words;
    }

    /**
     * Candidate whose text best matches an aligned word, judged by shared prefix (handles Turkish suffixes).
     *
     * @param  list<array{meaning: string, pos: string|null}>  $candidates
     * @param  list<string>  $aligned
     * @return array{meaning: string, pos: string|null}|null
     */
    private function bestCandidate(array $candidates, array $aligned): ?array
    {
        $best = null;
        $bestScore = 0;

        foreach ($candidates as $candidate) {
            $target = mb_strtolower($candidate['meaning']);

            foreach ($aligned as $alignedWord) {
                $score = $this->commonPrefixLength($target, mb_strtolower($alignedWord));

                if ($score >= min(3, mb_strlen($target)) && $score > $bestScore) {
                    $best = $candidate;
                    $bestScore = $score;
                }
            }
        }

        return $best;
    }

    private function commonPrefixLength(string $a, string $b): int
    {
        $length = 0;
        $max = min(mb_strlen($a), mb_strlen($b));

        while ($length < $max && mb_substr($a, $length, 1) === mb_substr($b, $length, 1)) {
            $length++;
        }

        return $length;
    }

    /**
     * @return array{text: string, alignment: string}
     *
     * @throws RequestException
     */
    private function translate(string $text, string $from, string $to, bool $align = false): array
    {
        $query = ['from' => $from, 'to' => $to];

        if ($align) {
            $query['includeAlignment'] = 'true';
        }

        $translation = $this->post('/translate', $query, $text)[0]['translations'][0] ?? [];

        return [
            'text' => $translation['text'] ?? '',
            'alignment' => $translation['alignment']['proj'] ?? '',
        ];
    }

    /**
     * @param  array<string, string>  $query
     * @return array<int, array<string, mixed>>
     *
     * @throws RequestException
     */
    private function post(string $path, array $query, string $text): array
    {
        return Http::baseUrl(config('services.azure_translator.endpoint'))
            ->withHeaders([
                'Ocp-Apim-Subscription-Key' => config('services.azure_translator.key'),
                'Ocp-Apim-Subscription-Region' => config('services.azure_translator.region'),
            ])
            ->asJson()
            ->post($path.'?'.http_build_query(['api-version' => '3.0'] + $query), [['Text' => $text]])
            ->throw()
            ->json();
    }
}
