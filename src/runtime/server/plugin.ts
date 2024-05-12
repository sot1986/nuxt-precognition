import type { ValidationErrorParser } from '../types/core'
import type { ClientStatusHandlers } from '../types/form'
import { defineNitroPlugin } from '#imports'

export default defineNitroPlugin((nitroApp) => {
  const errorParsers: ValidationErrorParser[] = []
  const statusHandlers = {} as ClientStatusHandlers

  nitroApp.hooks.hook('request', (event) => {
    event.context.precognition = {
      errorParsers,
      statusHandlers,
    }

    event.context.precognitive = event.headers.get('Precognition') === 'true'
  })
})
