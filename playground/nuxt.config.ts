export default defineNuxtConfig({
  modules: ['../src/module'],
  nuxtPrecognition: {
    backendValidation: true,
  },
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
})
