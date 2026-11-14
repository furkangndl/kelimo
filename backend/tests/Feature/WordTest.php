<?php

namespace Tests\Feature;

use App\Models\SavedWord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WordTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_save_a_word(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/words', ['word' => 'run', 'meaning' => 'koşmak'])
            ->assertCreated()
            ->assertJsonPath('data.word', 'run');

        $this->assertDatabaseHas('saved_words', ['user_id' => $user->id, 'word' => 'run', 'meaning' => 'koşmak']);
    }

    public function test_saving_same_word_and_meaning_twice_does_not_duplicate(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/words', ['word' => 'run', 'meaning' => 'koşmak'])->assertCreated();
        $this->actingAs($user, 'sanctum')->postJson('/api/words', ['word' => 'run', 'meaning' => 'koşmak'])->assertOk();

        $this->assertDatabaseCount('saved_words', 1);
    }

    public function test_index_lists_only_own_words_and_supports_search(): void
    {
        $user = User::factory()->create();
        SavedWord::factory()->for($user)->create(['word' => 'run', 'meaning' => 'koşmak']);
        SavedWord::factory()->for($user)->create(['word' => 'book', 'meaning' => 'kitap']);
        SavedWord::factory()->create(['word' => 'run', 'meaning' => 'başkasının']);

        $this->actingAs($user, 'sanctum')->getJson('/api/words')->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($user, 'sanctum')->getJson('/api/words?q=kitap')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_user_can_delete_own_word_but_not_others(): void
    {
        $user = User::factory()->create();
        $own = SavedWord::factory()->for($user)->create();
        $other = SavedWord::factory()->create();

        $this->actingAs($user, 'sanctum')->deleteJson("/api/words/{$other->id}")->assertNotFound();
        $this->actingAs($user, 'sanctum')->deleteJson("/api/words/{$own->id}")->assertNoContent();

        $this->assertDatabaseMissing('saved_words', ['id' => $own->id]);
        $this->assertDatabaseHas('saved_words', ['id' => $other->id]);
    }

    public function test_words_require_authentication(): void
    {
        $this->getJson('/api/words')->assertUnauthorized();
    }
}
