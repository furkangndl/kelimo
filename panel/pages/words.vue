<script setup lang="ts">
import { gsap } from 'gsap';

interface Word {
  id: number;
  word: string;
  meaning: string;
  created_at: string;
}

const auth = useAuthStore();
const api = useApi();
const route = useRoute();
const sceneWords = useState<string[]>('sceneWords', () => []);

const root = ref<HTMLElement>();
const words = ref<Word[]>([]);
const flipped = reactive<Record<number, boolean>>({});
const total = ref(0);
const page = ref(1);
const perPage = 20;
const search = ref('');
const loading = ref(false);
const pages = computed(() => Math.max(1, Math.ceil(total.value / perPage)));

async function load(animate = true) {
  loading.value = true;
  try {
    const res = await api<{ data: Word[]; meta: { total: number } }>('/words', {
      query: { page: page.value, q: search.value || undefined },
    });
    words.value = res.data;
    total.value = res.meta.total;
    if (!search.value && page.value === 1) {
      sceneWords.value = res.data.map((item) => item.word);
    }
    if (animate) {
      await nextTick();
      gsap.fromTo(
        '.word-card',
        { y: -50, rotate: -4, opacity: 0 },
        { y: 0, rotate: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.04, clearProps: 'transform,opacity' },
      );
    }
  } finally {
    loading.value = false;
  }
}

function flip(item: Word, event: MouseEvent) {
  flipped[item.id] = !flipped[item.id];
  const inner = (event.currentTarget as HTMLElement).querySelector('.card-flip');
  gsap.to(inner, { rotateY: flipped[item.id] ? 180 : 0, duration: 0.7, ease: 'back.out(1.4)' });
}

function tilt(event: PointerEvent) {
  const card = event.currentTarget as HTMLElement;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - 0.5;
  const y = (event.clientY - box.top) / box.height - 0.5;
  gsap.to(card, { rotateY: x * 10, rotateX: -y * 10, duration: 0.3, ease: 'power2.out' });
}

function untilt(event: PointerEvent) {
  gsap.to(event.currentTarget as HTMLElement, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power3.out' });
}

async function remove(item: Word, event: MouseEvent) {
  const card = (event.currentTarget as HTMLElement).closest('.word-card');
  await gsap.to(card, { scale: 0.5, opacity: 0, rotate: -8, duration: 0.35, ease: 'power2.in' });
  await api(`/words/${item.id}`, { method: 'DELETE' });
  sceneWords.value = sceneWords.value.filter((word) => word !== item.word);
  await load(false);
}

function go(delta: number) {
  page.value = Math.min(pages.value, Math.max(1, page.value + delta));
  load();
}

const confirmingDelete = ref(false);
let confirmTimer: ReturnType<typeof setTimeout>;

async function deleteAccount() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true;
    confirmTimer = setTimeout(() => (confirmingDelete.value = false), 5000);
    return;
  }
  clearTimeout(confirmTimer);
  await api('/me', { method: 'DELETE' });
  auth.clear();
  await navigateTo('/login');
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

onBeforeUnmount(() => {
  sceneWords.value = [];
});
</script>

<template>
  <div ref="root" class="container is-max-desktop px-4 py-5">
    <header class="level is-mobile mb-5">
      <div class="level-left"><img src="/logo.svg" alt="Kelimo" style="height: 40px" /></div>
      <div class="level-right">
        <span class="has-text-muted is-hidden-mobile mr-4 is-size-7">{{ auth.user?.email }}</span>
        <button class="button is-light is-small mr-2" :class="{ 'is-danger': confirmingDelete }" @click="deleteAccount">
          {{ confirmingDelete ? 'Emin misin? Tekrar tıkla' : 'Hesabı sil' }}
        </button>
        <button class="button is-light is-small" @click="logout">Çıkış</button>
      </div>
    </header>

    <section class="columns is-vcentered mb-4">
      <div class="column">
        <p class="display" style="font-size: clamp(2.2rem, 6vw, 3.6rem); line-height: 1">
          <span class="marker">{{ total }}</span> kelime
        </p>
      </div>
      <div class="column is-5">
        <input v-model="search" class="input" placeholder="Kelime veya anlam ara" />
      </div>
    </section>

    <section v-if="words.length" class="columns is-multiline">
      <div v-for="item in words" :key="item.id" class="column is-12-mobile is-6-tablet is-4-desktop">
        <article class="word-card" @click="flip(item, $event)" @pointermove="tilt" @pointerleave="untilt">
          <div class="card-flip">
            <div class="card-face ink-box">
              <span class="card-hint">kelime</span>
              <span class="card-word">{{ item.word }}</span>
              <span class="card-hint">anlam için dokun</span>
            </div>
            <div class="card-face back ink-box">
              <button class="button is-light card-del" aria-label="Sil" @click.stop="remove(item, $event)">✕</button>
              <span class="card-word">{{ item.meaning }}</span>
              <span class="card-hint">{{ item.word }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="!loading" class="ink-box p-6 has-text-centered">
      <p class="display is-size-3 mb-2">Henüz kelime yok</p>
      <p class="has-text-muted">Eklentiyle YouTube'da bir kelimeye tıkla, burada belirsin.</p>
    </section>

    <nav v-if="pages > 1" class="is-flex is-justify-content-center is-align-items-center mt-5" style="gap: 1rem">
      <button class="button is-light" :disabled="page === 1" @click="go(-1)">←</button>
      <span class="has-text-muted">{{ page }} / {{ pages }}</span>
      <button class="button is-light" :disabled="page === pages" @click="go(1)">→</button>
    </nav>
  </div>
</template>
