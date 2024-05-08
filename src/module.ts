import { addImports, addPlugin, addServerImports, createResolver, defineNuxtModule, addTemplate } from '@nuxt/kit'
import defu from 'defu'
import type { Config } from './runtime/types/config'

// Module options TypeScript interface definition
export interface ModuleOptions extends Config {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-precognition',
    configKey: 'precognition',
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
    enableNuxtClientErrorParser: false,
    enableLaravelClientErrorParser: false,
    enableLaravelServerErrorParser: false,
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.precognition = defu(
      nuxt.options.runtimeConfig.public.precognition as Partial<ModuleOptions>,
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
        enableNuxtClientErrorParser: options.enableNuxtClientErrorParser,
        enableLaravelClientErrorParser: options.enableLaravelClientErrorParser,
        enableLaravelServerErrorParser: options.enableLaravelServerErrorParser,
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

    addTemplate({
      filename: 'types/nuxt-precognition.d.ts',
      getContents: () => [
        `import type {ValidationErrorParser} from '${resolver.resolve('./runtime/types/core')}'`,
        `import type {ClientStatusHandlers} from '${resolver.resolve('./runtime/types/form')}'`,
        '',
        'interface NuxtPrecognition {',
        '  $precognition: {',
        '    errorParsers: ValidationErrorParser[],',
        '    statusHandlers: ClientStatusHandlers',
        '  }',
        '}',
        '',
        'declare module \'#app\' {',
        '  interface NuxtApp extends NuxtPrecognition {}',
        '}',
        '',
        'declare module \'vue\' {',
        '  interface ComponentCustomProperties extends NuxtPrecognition {}',
        '}',
        '',
        'export {}',
      ].join('\n'),
    })

    nuxt.hook('prepare:types', (options) => {
      options.references.push({
        path: resolver.resolve(nuxt.options.buildDir, 'types/nuxt-precognition.d.ts'),
      })
    })
  },
})
