<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WordResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WordController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('q')->trim()->toString();

        $words = $request->user()->words()
            ->when($search !== '', fn ($query) => $query->where(
                fn ($inner) => $inner->where('word', 'like', "%{$search}%")->orWhere('meaning', 'like', "%{$search}%")
            ))
            ->latest('id')
            ->paginate(20);

        return WordResource::collection($words);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'word' => ['required', 'string', 'max:100'],
            'meaning' => ['required', 'string', 'max:255'],
        ]);

        $word = $request->user()->words()->firstOrCreate($data);

        return (new WordResource($word))->response()->setStatusCode($word->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->user()->words()->findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
