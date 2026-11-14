<?php

namespace App\Http\Resources;

use App\Models\SavedWord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SavedWord
 */
class WordResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'word' => $this->word,
            'meaning' => $this->meaning,
            'created_at' => $this->created_at,
        ];
    }
}
