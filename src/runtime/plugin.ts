import type { ValidationErrorParser } from './types/core'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin((_nuxtApp) => {
  const errorParsers: ValidationErrorParser[] = []

  function addErrorParser(parser: ValidationErrorParser) {
    errorParsers.push(parser)
  }

  return {
    provide: {
      precognition: {
        parsers: {
          errorParsers,
          addErrorParser,
        },
      },
    },
  }
})
