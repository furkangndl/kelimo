export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  experimental: { appManifest: false },
  nitro: { preset: 'cloudflare_pages' },
  runtimeConfig: {
    azureTranslatorKey: '',
    azureTranslatorRegion: 'global',
    azureTranslatorEndpoint: 'https://api.cognitive.microsofttranslator.com',
    public: {
      apiBase: process.env.API_BASE_URL || '/api',
    },
  },
  modules: ['@pinia/nuxt', 'nitro-cloudflare-dev'],
  css: ['bulma/css/bulma.min.css', '~/assets/css/main.css'],
  app: {
    head: {
      title: 'Kelimo',
      htmlAttrs: { lang: 'tr', 'data-theme': 'light' },
      meta: [{ name: 'theme-color', content: '#dfe6ec' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
});
