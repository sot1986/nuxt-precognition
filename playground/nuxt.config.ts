export default defineNuxtConfig({
  modules: ['../src/module'],
  precognition: {
    backendValidation: true,
    enableNuxtClientErrorParser: true,
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
