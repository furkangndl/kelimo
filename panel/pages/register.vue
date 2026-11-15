<script setup lang="ts">
const auth = useAuthStore();
const card = ref<HTMLElement>();
const form = reactive({ email: '', password: '' });
const error = ref('');
const loading = ref(false);

useStamp(card);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.register({ ...form });
    await navigateTo('/welcome');
  } catch (e: any) {
    const errors = e?.data?.errors;
    error.value = errors ? Object.values(errors).flat().join(' ') : e?.data?.message || 'Kayıt başarısız.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="section is-flex is-justify-content-center is-align-items-center" style="min-height: 100vh">
    <form ref="card" class="ink-box p-6" style="width: 100%; max-width: 26rem" @submit.prevent="submit">
      <img src="/logo.svg" alt="Kelimo" class="mb-5" style="height: 44px" />
      <h1 class="title is-4 display mb-4">Hesap oluştur</h1>
      <div v-if="error" class="notification is-danger is-light py-3">{{ error }}</div>
      <div class="field">
        <div class="control"><input v-model="form.email" class="input" type="email" placeholder="E-posta" autocomplete="email" required /></div>
      </div>
      <div class="field">
        <div class="control">
          <input v-model="form.password" class="input" type="password" placeholder="Şifre (en az 8 karakter)" autocomplete="new-password" minlength="8" required />
        </div>
      </div>
      <button class="button is-primary is-fullwidth mt-5" :class="{ 'is-loading': loading }" type="submit">Devam et</button>
      <p class="has-text-centered mt-4">
        <NuxtLink :to="{ path: '/login', query: $route.query }" class="link">Zaten hesabın var mı? Giriş yap</NuxtLink>
      </p>
      <p class="has-text-centered mt-2"><NuxtLink to="/privacy" class="has-text-muted is-size-7">Gizlilik politikası</NuxtLink></p>
    </form>
  </main>
</template>
