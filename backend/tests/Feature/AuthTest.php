<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_native_language(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Ada',
            'email' => 'ada@example.com',
            'password' => 'secret-pass',
            'native_lang' => 'tr',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.native_lang', 'tr')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'native_lang']]);
    }

    public function test_register_rejects_unsupported_language(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Ada',
            'email' => 'ada@example.com',
            'password' => 'secret-pass',
            'native_lang' => 'de',
        ])->assertUnprocessable()->assertJsonValidationErrors('native_lang');
    }

    public function test_user_can_login_and_fetch_profile(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        $token = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'secret-pass'])
            ->assertOk()
            ->json('token');

        $this->withToken($token)->getJson('/api/me')->assertOk()->assertJsonPath('email', $user->email);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertUnprocessable();
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
