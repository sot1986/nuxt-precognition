import type { ValidationErrorParser } from './types/core'
import type { ClientStatusHandlers } from './types/form'
import { assertSuccessfulPrecognitiveResponses } from './core'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin(() => {
  const errorParsers: ValidationErrorParser[] = []
  const statusHandlers = {} as ClientStatusHandlers

  return {
    provide: {
      precognition: {
        errorParsers,
        statusHandlers,
        assertSuccessfulPrecognitiveResponses,
      },
    },
  }
})
