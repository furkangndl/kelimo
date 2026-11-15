<script setup lang="ts">
const auth = useAuthStore();
const card = ref<HTMLElement>();
const loading = ref<'tr' | 'en' | null>(null);
const options = [
  { value: 'tr' as const, title: 'Türkçe', note: 'İngilizce öğreniyorum' },
  { value: 'en' as const, title: 'English', note: 'I am learning Turkish' },
];

useStamp(card);

async function choose(value: 'tr' | 'en') {
  loading.value = value;
  try {
    await auth.setNativeLang(value);
    await navigateTo('/words');
  } finally {
    loading.value = null;
  }
}
</script>

<template>
  <main class="section is-flex is-justify-content-center is-align-items-center" style="min-height: 100vh">
    <div ref="card" class="ink-box p-6" style="width: 100%; max-width: 26rem">
      <img src="/logo.svg" alt="Kelimo" class="mb-5" style="height: 44px" />
      <h1 class="title is-4 display mb-2">Ana dilin hangisi?</h1>
      <p class="has-text-muted mb-5">Çeviriler buna göre yönlenir.</p>
      <div class="is-flex is-flex-direction-column" style="gap: 0.9rem">
        <button
          v-for="option in options"
          :key="option.value"
          class="button is-light is-medium is-justify-content-space-between"
          :class="{ 'is-loading': loading === option.value }"
          :disabled="loading !== null"
          @click="choose(option.value)"
        >
          <strong class="display" style="font-size: 1.4rem">{{ option.title }}</strong>
          <span class="has-text-muted is-size-6">{{ option.note }}</span>
        </button>
      </div>
    </div>
  </main>
</template>
