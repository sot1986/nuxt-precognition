import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MyModule as any,
  ],
  nuxtPrecognition: {
    enableClientNuxtErrorParser: true,
  },
  plugins: [
    {
      mode: 'all',
      src: './plugins/precognition.ts',
      name: 'nuxt-precognition',
      order: 1,
    },
  ],
})
