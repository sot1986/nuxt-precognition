import { isPrecognitiveResponseError } from './core'
import type { PrecognitiveErrorParser } from './types/core'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((_nuxtApp) => {
  const errorParsers: PrecognitiveErrorParser[] = [
    (error) => {
      if (isPrecognitiveResponseError(error))
        return error.response.data.errors
    },
  ]
  function addErrorParser(parser: PrecognitiveErrorParser) {
    errorParsers.push(parser)
  }

  return {
    provide: {
      nuxtPrecognition: {
        parsers: {
          errorParsers,
          addErrorParser,
        },
      },
    },
  }
})
