<script setup lang="ts">
interface Word {
  id: number;
  word: string;
  meaning: string;
  created_at: string;
}

const auth = useAuthStore();
const api = useApi();
const route = useRoute();

const words = ref<Word[]>([]);
const total = ref(0);
const page = ref(1);
const perPage = 20;
const search = ref('');
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await api<{ data: Word[]; meta: { total: number } }>('/words', {
      query: { page: page.value, q: search.value || undefined },
    });
    words.value = res.data;
    total.value = res.meta.total;
  } finally {
    loading.value = false;
  }
}

async function remove(word: Word) {
  await api(`/words/${word.id}`, { method: 'DELETE' });
  await load();
}

async function logout() {
  await auth.logout();
  await navigateTo('/login');
}

let timer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    load();
  }, 300);
});

onMounted(async () => {
  if (!auth.user) {
    auth.user = await api('/me');
  }
  if (route.query.ext) {
    auth.notifyExtension();
  }
  await load();
});
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 flex flex-col gap-4">
    <header class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Kelimo</h1>
      <div class="flex items-center gap-3 text-sm">
        <span>{{ auth.user?.name }}</span>
        <PrimeButton label="Çıkış" severity="secondary" size="small" @click="logout" />
      </div>
    </header>

    <PrimeIconField icon-position="left">
      <PrimeInputIcon class="pi pi-search" />
      <PrimeInputText v-model="search" placeholder="Kelime veya anlam ara" class="w-full" />
    </PrimeIconField>

    <PrimeDataTable :value="words" :loading="loading" data-key="id">
      <template #empty>Henüz kayıtlı kelime yok.</template>
      <PrimeColumn field="word" header="Kelime" />
      <PrimeColumn field="meaning" header="Anlam" />
      <PrimeColumn header="" style="width: 4rem">
        <template #body="{ data }">
          <PrimeButton icon="pi pi-trash" severity="danger" text rounded aria-label="Sil" @click="remove(data)" />
        </template>
      </PrimeColumn>
    </PrimeDataTable>

    <PrimePaginator v-if="total > perPage" :rows="perPage" :total-records="total" :first="(page - 1) * perPage" @page="(e: any) => { page = e.page + 1; load(); }" />
  </div>
</template>
