<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TranslateController;
use App\Http\Controllers\Api\WordController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/words', [WordController::class, 'index']);
    Route::post('/words', [WordController::class, 'store']);
    Route::delete('/words/{id}', [WordController::class, 'destroy']);

    Route::get('/translate', TranslateController::class)->middleware('throttle:60,1');
});
