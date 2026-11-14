<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AzureTranslator;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TranslateController extends Controller
{
    public function __invoke(Request $request, AzureTranslator $translator): JsonResponse
    {
        $data = $request->validate([
            'word' => ['required', 'string', 'max:100'],
            'sentence' => ['nullable', 'string', 'max:500'],
        ]);

        [$from, $to] = $request->user()->native_lang === 'tr' ? ['en', 'tr'] : ['tr', 'en'];

        try {
            $sense = $translator->senseFor($data['word'], $data['sentence'] ?? null, $from, $to);
        } catch (RequestException) {
            return response()->json(['message' => 'Translation service unavailable.'], 502);
        }

        return response()->json(['word' => $data['word']] + $sense);
    }
}
