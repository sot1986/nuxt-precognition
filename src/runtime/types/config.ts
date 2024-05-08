export interface Config {
  /** base validation timeout, @default 1500 ms */
  validationTimeout: number
  /** enable backend validation @default false */
  backendValidation: boolean
  /** precognitive request flag header, @default 'Precognition' */
  precognitiveHeader: string
  /** precognitive validate only header, @default 'Precognition-Validate-Only' */
  validateOnlyHeader: string
  /** precognitive validate only keys separator, @default ',' */
  validatingKeysSeparator: string
  /** precognitive response successful flag header, @default 'Precognition-success' */
  successfulHeader: string
  /** precognitive files validation, @default false */
  validateFiles: boolean
  /** precognitive error status code, @default 422 */
  errorStatusCode: number
  /** precognitive success validation status code, @default 204 */
  successValidationStatusCode: number
  /** enable Nuxt precognitive error parser client side, @default false */
  enableNuxtClientErrorParser: boolean
  /** enable Laravel precognitive error parser client side, @default false */
  enableLaravelClientErrorParser: boolean
  /** enable Laravel precognitive error parsers server side, @default false */
  enableLaravelServerErrorParser: boolean
}

export {}
