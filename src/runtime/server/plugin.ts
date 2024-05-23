import { defineNitroPlugin } from '#imports'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.$precognition = {
      errorParsers: [],
      statusHandlers: {},
    }

    event.context.precognitive = event.headers.get('Precognition') === 'true'
  })
})
