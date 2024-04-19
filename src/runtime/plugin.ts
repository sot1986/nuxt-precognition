import type { PrecognitiveErrorParser } from './types/core'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin((_nuxtApp) => {
  const errorParsers: PrecognitiveErrorParser[] = []

  function addErrorParser(parser: PrecognitiveErrorParser) {
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
