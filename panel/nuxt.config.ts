export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:8000/api',
    },
  },
  modules: ['@nuxtjs/tailwindcss', 'nuxt-primevue', '@pinia/nuxt'],
  primevue: {
    options: { ripple: true },
    components: {
      prefix: 'Prime',
      include: ['Button', 'InputText', 'Password', 'Dropdown', 'DataTable', 'Column', 'Message', 'IconField', 'InputIcon', 'Paginator'],
    },
    cssLayerOrder: 'tailwind-base, primevue, tailwind-utilities',
  },
  css: ['primeicons/primeicons.css', 'primevue/resources/themes/aura-light-blue/theme.css'],
  app: {
    head: { title: 'Kelime Defteri' },
  },
});
