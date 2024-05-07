import type { ValidationErrorParser } from './types/core'
import type { ClientStatusHandlers } from './types/form'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin((_nuxtApp) => {
  const errorParsers: ValidationErrorParser[] = []

  const statusHandlers = {} as ClientStatusHandlers

  return {
    provide: {
      precognition: {
        parsers: {
          errorParsers,
        },
        statusHandlers,
      },
    },
  }
})
