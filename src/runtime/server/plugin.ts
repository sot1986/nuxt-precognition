// Portable Nitro plugin, registered for both Nitro v2 (`nitropack`) and Nitro v3 (`nitro`).
// `defineNitroPlugin()` (nitropack) and `definePlugin()` (nitro) are identity functions,
// so they are replaced by a structural type annotation to avoid importing either runtime.
import type { PrecognitionEventContext } from '../types/eventHandler'

interface PrecognitionHookEvent {
  context: object
  /** h3 v1: Web `Headers` of the request */
  headers?: Headers
  /** h3 v2: Web `Request` (on h3 v1 this is the Node.js `IncomingMessage`) */
  req?: { headers: Headers | object }
}

interface PrecognitionNitroApp {
  hooks: {
    hook: (name: 'request', callback: (event: PrecognitionHookEvent) => void) => unknown
  }
}

function getRequestHeaders(event: PrecognitionHookEvent): Headers | undefined {
  const headers = event.req?.headers
  if (headers && typeof (headers as Headers).get === 'function')
    return headers as Headers
  return event.headers
}

export default function precognitionNitroPlugin(nitroApp: PrecognitionNitroApp) {
  nitroApp.hooks.hook('request', (event) => {
    const context = event.context as PrecognitionEventContext<unknown>

    context.$precognition ??= {
      errorParsers: [],
      statusHandlers: {},
    }

    context.precognitive = getRequestHeaders(event)?.get('Precognition') === 'true'
  })
}
