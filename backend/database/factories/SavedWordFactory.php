<?php

namespace Database\Factories;

use App\Models\SavedWord;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedWord>
 */
class SavedWordFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'word' => fake()->unique()->word(),
            'meaning' => fake()->word(),
        ];
    }
}
