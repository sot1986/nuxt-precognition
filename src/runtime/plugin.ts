import type { PrecognitiveErrorParser } from './types/core'
import { isPrecognitiveResponseError } from './core'
import { defineNuxtPlugin, ref, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin((_nuxtApp) => {
  const errorParsers = ref<PrecognitiveErrorParser[]>([])

  function addErrorParser(parser: PrecognitiveErrorParser) {
    errorParsers.value.push(parser)
  }

  const config = useRuntimeConfig().public.nuxtPrecognition

  addErrorParser(error =>
    isPrecognitiveResponseError(error, config) ? error.data.data : null,
  )

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
