<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TranslateTest extends TestCase
{
    use RefreshDatabase;

    private function fakeAzure(): void
    {
        config(['services.azure_translator.key' => 'test', 'services.azure_translator.region' => 'westeurope']);

        Http::fake([
            '*/dictionary/lookup*' => Http::response([[
                'normalizedSource' => 'run',
                'translations' => [
                    ['normalizedTarget' => 'koşmak', 'posTag' => 'VERB'],
                    ['normalizedTarget' => 'yönetmek', 'posTag' => 'VERB'],
                    ['normalizedTarget' => 'akış', 'posTag' => 'NOUN'],
                ],
            ]]),
            '*/translate*' => Http::response([[
                'translations' => [[
                    'text' => 'Bir şirket yönetiyorum',
                    'to' => 'tr',
                    'alignment' => ['proj' => '0:0-11:21 2:4-11:21 6:6-0:2 8:14-4:9'],
                ]],
            ]]),
        ]);
    }

    public function test_sentence_context_selects_matching_meaning(): void
    {
        $this->fakeAzure();
        $user = User::factory()->create(['native_lang' => 'tr']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/translate?'.http_build_query(['word' => 'run', 'sentence' => 'I run a company']))
            ->assertOk()
            ->assertJson(['word' => 'run', 'meaning' => 'yönetmek', 'pos' => 'verb']);
    }

    public function test_without_sentence_returns_most_common_meaning(): void
    {
        $this->fakeAzure();
        $user = User::factory()->create(['native_lang' => 'tr']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/translate?word=run')
            ->assertOk()
            ->assertJson(['meaning' => 'koşmak', 'pos' => 'verb']);
    }

    public function test_translation_service_failure_returns_502(): void
    {
        config(['services.azure_translator.key' => 'test']);
        Http::fake(['*' => Http::response([], 500)]);
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/translate?word=run')->assertStatus(502);
    }

    public function test_translate_requires_authentication(): void
    {
        $this->getJson('/api/translate?word=run')->assertUnauthorized();
    }
}
