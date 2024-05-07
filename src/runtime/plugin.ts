import type { ValidationErrorParser } from './types/core'
import type { ClientStatusHandler } from './types/form'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin((_nuxtApp) => {
  const errorParsers: ValidationErrorParser[] = []

  const statusHandlers = new Map<number, ClientStatusHandler>()

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
