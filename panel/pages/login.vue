<script setup lang="ts">
const auth = useAuthStore();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    await navigateTo('/words');
  } catch (e: any) {
    error.value = e?.data?.errors?.email?.[0] || e?.data?.message || 'Giriş başarısız.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <form class="w-full max-w-sm bg-white rounded-xl shadow p-6 flex flex-col gap-4" @submit.prevent="submit">
      <h1 class="text-xl font-semibold">Giriş yap</h1>
      <PrimeMessage v-if="error" severity="error" :closable="false">{{ error }}</PrimeMessage>
      <PrimeInputText v-model="email" type="email" placeholder="E-posta" required />
      <PrimePassword v-model="password" placeholder="Şifre" :feedback="false" toggle-mask input-class="w-full" class="w-full" required />
      <PrimeButton type="submit" label="Giriş yap" :loading="loading" />
      <NuxtLink :to="{ path: '/register', query: $route.query }" class="text-sm text-blue-600 text-center">Hesabın yok mu? Kayıt ol</NuxtLink>
    </form>
  </div>
</template>
