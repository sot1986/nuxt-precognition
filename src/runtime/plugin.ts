import type { ValidationErrorParser } from './types/core'
import type { ClientStatusHandlers } from './types/form'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin(() => {
  const errorParsers: ValidationErrorParser[] = []

  const statusHandlers = {} as ClientStatusHandlers

  return {
    provide: {
      precognition: {
        errorParsers,
        statusHandlers,
      },
    },
  }
})
