// Portable implementation built on `nuxt/server` (Nuxt >= 4.6).
// It runs on Nitro v3 (Nuxt 5) and on any other server builder.
// The Nitro v2 (`nitropack` + h3 v1) implementation lives in `./definePrecognitiveEventHandler-legacy.ts`.
import { createError, defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'
import type { EventHandler, RequestEvent } from 'nuxt/server'
import type { ValidationErrorParser, ValidationErrorsData } from '../types/core'
import { hasResponse, makeLaravelValidationErrorParser, resolveValidationErrorData } from '../parsers'
import type { PrecognitionEventContext, ServerStatusHandlers } from '../types/eventHandler'
import type { ErrorStatusCode } from '../types/utils'

type MaybePromise<T> = T | Promise<T>

export type PrecognitiveRequestMiddleware = (event: RequestEvent) => MaybePromise<void>

export type PrecognitiveBeforeResponseMiddleware<TResponse> = (
  event: RequestEvent,
  response: { body?: Awaited<TResponse> },
) => MaybePromise<void>

export interface PrecognitiveEventHandlerObject<TResponse> {
  /** Runs before `handler`. Throw here to report validation errors. */
  onRequest?: PrecognitiveRequestMiddleware | PrecognitiveRequestMiddleware[]
  /** Runs only for non-precognitive requests (or precognitive requests without matching errors). */
  handler: EventHandler<TResponse>
  /** Runs after `handler`, before the response is sent. */
  onBeforeResponse?: PrecognitiveBeforeResponseMiddleware<TResponse> | PrecognitiveBeforeResponseMiddleware<TResponse>[]
}

export interface PrecognitiveEventHandlerOptions<TResponse = unknown> {
  errorParsers?: ValidationErrorParser<TResponse>[]
  statusHandlers?: ServerStatusHandlers<RequestEvent>
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value)
    return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Read the precognition context set by the module server plugin.
 * Server builders without Nitro plugins don't run it, so it's initialised lazily here.
 */
function usePrecognitionContext(event: RequestEvent): PrecognitionEventContext<RequestEvent>['$precognition'] {
  const context = event.context as Partial<PrecognitionEventContext<RequestEvent>>
  context.$precognition ??= { errorParsers: [], statusHandlers: {} }
  context.precognitive ??= event.req.headers.get('Precognition') === 'true'
  return context.$precognition
}

function definePrecognitiveEventHandler<TResponse>(
  handler: PrecognitiveEventHandlerObject<TResponse>,
  options?: PrecognitiveEventHandlerOptions<TResponse>,
): EventHandler<Promise<Awaited<TResponse>>> {
  const onRequest = toArray(handler.onRequest)
  const onBeforeResponse = toArray(handler.onBeforeResponse)

  return defineEventHandler(async (event): Promise<Awaited<TResponse>> => {
    const precognition = usePrecognitionContext(event)

    if (onRequest.length) {
      const errorParsers = [...resolveBaseErrorParsers(), ...(options?.errorParsers ?? [])]
      for (const middleware of onRequest) {
        await runPrecognitiveMiddleware(middleware, event, precognition, {
          errorParsers,
          statusHandlers: options?.statusHandlers,
        })
      }
    }

    const response = { body: await onPrecognitiveHandler(handler.handler, event) }

    for (const middleware of onBeforeResponse)
      await middleware(event, response)

    return response.body
  })
}

function resolveBaseErrorParsers(): ValidationErrorParser[] {
  const config = useRuntimeConfig().public.precognition
  return config.enableLaravelServerErrorParser
    ? [makeLaravelValidationErrorParser()]
    : []
}

async function runPrecognitiveMiddleware<TResp>(
  middleware: PrecognitiveRequestMiddleware,
  event: RequestEvent,
  precognition: PrecognitionEventContext<RequestEvent>['$precognition'],
  options: {
    errorParsers: ValidationErrorParser<TResp>[]
    statusHandlers?: ServerStatusHandlers<RequestEvent>
  },
): Promise<void> {
  try {
    await middleware(event)
  }
  catch (error) {
    if (!(error instanceof Error)) {
      throw createError({
        message: 'Unknown server error',
        status: 500,
        data: { message: 'Unknown server error' },
      })
    }

    const statusHandler = hasResponse(error)
      ? (options.statusHandlers?.[`${error.response.status}` as ErrorStatusCode]
        ?? precognition.statusHandlers[`${error.response.status}` as ErrorStatusCode])
      : undefined

    if (statusHandler) {
      return statusHandler(error, event)
    }

    event.res.headers.set('Content-Type', 'application/json')

    const errorsData = resolveValidationErrorData(error, [
      ...precognition.errorParsers,
      ...options.errorParsers,
    ])

    if (!errorsData) {
      throw error
    }

    handleValidationErrorsData(errorsData, event)
  }
}

function handleValidationErrorsData(
  errorsData: ValidationErrorsData,
  event: RequestEvent,
) {
  setResponseStatus(event, 422)
  event.res.headers.set('Content-Type', 'application/json')

  if (event.req.headers.get('Precognition') !== 'true') {
    throw createError({
      status: 422,
      message: errorsData.message,
      data: errorsData,
    })
  }

  event.res.headers.set('Precognition', 'true')

  const validateOnly = event.req.headers.get('Precognition-Validate-Only')

  if (!validateOnly) {
    throw createError({
      status: 422,
      message: errorsData.message,
      data: errorsData,
    })
  }

  event.res.headers.set('Precognition-Validate-Only', validateOnly)

  const validateOnlyKeys = validateOnly.split(',')
  const errors = Object.entries(errorsData.errors).filter(([key]) => validateOnlyKeys.includes(key))
  if (!errors.length)
    return

  const precognitveErrors: Record<string, string[]> = {}
  errors.forEach(([key, value]) => {
    precognitveErrors[key] = Array.isArray(value) ? value : [value]
  })

  throw createError<ValidationErrorsData>({
    status: 422,
    data: {
      message: errorsData.message,
      errors: precognitveErrors,
    },
    message: errorsData.message,
  })
}

async function onPrecognitiveHandler<TResponse>(
  handler: EventHandler<TResponse>,
  event: RequestEvent,
): Promise<Awaited<TResponse>> {
  if (event.req.headers.get('Precognition') !== 'true')
    return await handler(event)

  event.res.headers.set('Content-Type', 'application/json')
  event.res.headers.set('Precognition', 'true')
  event.res.headers.set('Precognition-Success', 'true')

  const validateOnlyKey = event.req.headers.get('Precognition-Validate-Only')
  if (validateOnlyKey)
    event.res.headers.set('Precognition-Validate-Only', validateOnlyKey)
  setResponseStatus(event, 200)
  return null as Awaited<TResponse>
}

definePrecognitiveEventHandler.create = function (
  options: PrecognitiveEventHandlerOptions,
): <TResponse>(
    handler: PrecognitiveEventHandlerObject<TResponse>,
    options?: PrecognitiveEventHandlerOptions<TResponse>,
  ) => EventHandler<Promise<Awaited<TResponse>>> {
  const baseErrorParsers = [...(options.errorParsers ?? [])]
  const baseStatusHandlers = { ...options.statusHandlers }
  return <TResponse>(
    handler: PrecognitiveEventHandlerObject<TResponse>,
    options?: PrecognitiveEventHandlerOptions<TResponse>,
  ) => definePrecognitiveEventHandler(handler, {
    errorParsers: [...baseErrorParsers, ...(options?.errorParsers ?? [])] as ValidationErrorParser<TResponse>[],
    statusHandlers: { ...baseStatusHandlers, ...options?.statusHandlers },
  })
}

export { definePrecognitiveEventHandler }
