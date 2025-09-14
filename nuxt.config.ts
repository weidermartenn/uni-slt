// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt'],
  css: [
    '~/assets/css/main.css',
    '@univerjs/preset-sheets-core/lib/index.css',
    '@univerjs/sheets-ui/lib/index.css',
    '@univerjs/preset-sheets-data-validation/lib/index.css',
  ],
  nitro: {
    sourceMap: false,
    experimental: {
      websocket: true
    }
  },
  vite: {
    build: {
      sourcemap: false, cssMinify: true,
      // chunkSizeWarningLimit: 2000,
      // rollupOptions: {
      //   output: {
      //     manualChunks(id: string) {
      //       if (id.includes('node_modules')) {
      //         if (id.includes('@univerjs')) return 'vendor-univer'
      //         if (id.includes('@nuxt/ui') || id.includes('reka-ui')) return 'vendor-nuxtui'
      //         if (id.includes('lucide') || id.includes('iconify')) return 'vendor-icons'
      //         return 'vendor' 
      //       }
      //     }
      //   }
      // }
    },
    css: {
      devSourcemap: false
    },
  },
  ui: {
    colorMode: true
  },
  pinia: {
    storesDirs: ['./stores']
  },
  runtimeConfig: {
    public: {
      wsBackendURI: 'wss:/kings-logix.ru',
      kingsApiBase: 'https://kings-logix.ru/api',
      sltApiBase: 'http://77.222.43.243:8080/api'
    }
  },
  app: {
    head: {
      title: 'SLT',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Транспортный учет'}
      ],
    }
  },
})