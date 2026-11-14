<script setup lang="ts">
const auth = useAuthStore();
const form = reactive({ name: '', email: '', password: '', native_lang: 'tr' });
const languages = [
  { label: 'Türkçe (İngilizce öğreniyorum)', value: 'tr' },
  { label: 'English (I am learning Turkish)', value: 'en' },
];
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.register({ ...form });
    await navigateTo('/words');
  } catch (e: any) {
    const errors = e?.data?.errors;
    error.value = errors ? Object.values(errors).flat().join(' ') : e?.data?.message || 'Kayıt başarısız.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <form class="w-full max-w-sm bg-white rounded-xl shadow p-6 flex flex-col gap-4" @submit.prevent="submit">
      <h1 class="text-xl font-semibold">Kayıt ol</h1>
      <PrimeMessage v-if="error" severity="error" :closable="false">{{ error }}</PrimeMessage>
      <PrimeInputText v-model="form.name" placeholder="Ad" required />
      <PrimeInputText v-model="form.email" type="email" placeholder="E-posta" required />
      <PrimePassword v-model="form.password" placeholder="Şifre (en az 8 karakter)" :feedback="false" toggle-mask input-class="w-full" class="w-full" required />
      <PrimeDropdown v-model="form.native_lang" :options="languages" option-label="label" option-value="value" placeholder="Ana dilin" />
      <PrimeButton type="submit" label="Kayıt ol" :loading="loading" />
      <NuxtLink :to="{ path: '/login', query: $route.query }" class="text-sm text-blue-600 text-center">Zaten hesabın var mı? Giriş yap</NuxtLink>
    </form>
  </div>
</template>
