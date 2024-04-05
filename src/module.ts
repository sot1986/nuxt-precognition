import { addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import defu from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  /** base validation timeout, @default 1500 ms */
  validationTimeout: number
  /** enable backend validation @default false */
  backendValidation: boolean
  /** precognitive request flag header, @default 'Precognition' */
  isPrecognitiveHeader: string
  /** precognitive validate only header, @default 'Precognition-Validate-Only' */
  validateOnlyHeader: string
  /** precognitive validate only keys separator, @default ',' */
  validatingKeysSeparator: string
  /** precognitive response successful flag header, @default 'Precognition-success' */
  isSuccessfulHeader: string
  /** precognitive files validation, @default false */
  validateFiles: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-precognition',
    configKey: 'nuxtPrecognition',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    validationTimeout: 1500,
    backendValidation: false,
    isPrecognitiveHeader: 'Precognition',
    validateOnlyHeader: 'Precognition-Validate-Only',
    validatingKeysSeparator: ',',
    isSuccessfulHeader: 'Precognition-success',
    validateFiles: false,
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.nuxtPrecognition = defu(
      nuxt.options.runtimeConfig.public.nuxtPrecognition as Partial<ModuleOptions>,
      {
        validationTimeout: options.validationTimeout,
        backendValidation: options.backendValidation,
        isPrecognitiveHeader: options.isPrecognitiveHeader,
        validateOnlyHeader: options.validateOnlyHeader,
        validatingKeysSeparator: options.validatingKeysSeparator,
        isSuccessfulHeader: options.isSuccessfulHeader,
        validateFiles: options.validateFiles,
      },
    )

    const resolver = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    addImports({
      name: 'useForm',
      from: resolver.resolve('./runtime/useForm'),
      as: 'useForm',
    })
  },
})
