import { addImports, addPlugin, addServerImports, createResolver, defineNuxtModule } from '@nuxt/kit'
import defu from 'defu'
import type { Config } from './runtime/types/config'

// Module options TypeScript interface definition
export interface ModuleOptions extends Config {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-precognition',
    configKey: 'nuxtPrecognition',
    compatibility: {
      nuxt: '^3.9.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    validationTimeout: 1500,
    backendValidation: false,
    precognitiveHeader: 'Precognition',
    validateOnlyHeader: 'Precognition-Validate-Only',
    validatingKeysSeparator: ',',
    successfulHeader: 'Precognition-success',
    validateFiles: false,
    errorStatusCode: 422,
    successValidationStatusCode: 204,
    enableClientNuxtErrorParser: false,
    enableClientLaravelErrorParser: false,
    enableServerLaravelErrorParser: false,
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.nuxtPrecognition = defu(
      nuxt.options.runtimeConfig.public.nuxtPrecognition as Partial<ModuleOptions>,
      {
        validationTimeout: options.validationTimeout,
        backendValidation: options.backendValidation,
        precognitiveHeader: options.precognitiveHeader,
        validateOnlyHeader: options.validateOnlyHeader,
        validatingKeysSeparator: options.validatingKeysSeparator,
        successfulHeader: options.successfulHeader,
        validateFiles: options.validateFiles,
        errorStatusCode: options.errorStatusCode,
        successValidationStatusCode: options.successValidationStatusCode,
        enableClientNuxtErrorParser: options.enableClientNuxtErrorParser,
        enableClientLaravelErrorParser: options.enableClientLaravelErrorParser,
        enableServerLaravelErrorParser: options.enableServerLaravelErrorParser,
      },
    )

    const resolver = createResolver(import.meta.url)

    nuxt.options.nitro.plugins = nuxt.options.nitro.plugins || []

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    addImports({
      name: 'useForm',
      from: resolver.resolve('./runtime/useForm'),
      as: 'useForm',
    })

    addServerImports([
      {
        from: resolver.resolve('./runtime/server/definePrecognitiveEventHandler'),
        name: 'definePrecognitiveEventHandler',
      },
    ])
  },
})
