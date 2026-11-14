export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  nitro: { preset: 'cloudflare_pages' },
  runtimeConfig: {
    azureTranslatorKey: '',
    azureTranslatorRegion: 'global',
    azureTranslatorEndpoint: 'https://api.cognitive.microsofttranslator.com',
    public: {
      apiBase: process.env.API_BASE_URL || '/api',
    },
  },
  modules: ['@nuxtjs/tailwindcss', 'nuxt-primevue', '@pinia/nuxt', 'nitro-cloudflare-dev'],
  tailwindcss: { cssPath: '~/assets/css/tailwind.css' },
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
    head: { title: 'Kelimo' },
  },
});
