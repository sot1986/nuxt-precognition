export interface Config {
  /** base validation timeout, @default 1500 ms */
  validationTimeout: number
  /** enable backend validation @default false */
  backendValidation: boolean
  /** precognitive files validation, @default false */
  validateFiles: boolean
  /** enable Nuxt precognitive error parser client side, @default false */
  enableNuxtClientErrorParser: boolean
  /** enable Laravel precognitive error parser client side, @default false */
  enableLaravelClientErrorParser: boolean
  /** enable Laravel precognitive error parsers server side, @default false */
  enableLaravelServerErrorParser: boolean
}

export {}
