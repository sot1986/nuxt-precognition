import type { EventHandler, EventHandlerObject, EventHandlerRequest, H3Event, _RequestMiddleware } from 'h3'
import { defineEventHandler, setResponseHeader } from 'h3'
import type { PrecognitiveErrorParser, ValidationErrorsData } from './types/core'
import { hasPrecognitiveRequestsHeader } from './core'
import { createError, setResponseStatus, useRuntimeConfig } from '#imports'

export function definePrecognitiveEventHandler<
TRequest extends EventHandlerRequest,
TResponse,
>(
  handler: EventHandlerObject<TRequest, TResponse>,
  errorParsers: PrecognitiveErrorParser[] = [],
): EventHandler<TRequest, TResponse> {
  return defineEventHandler<TRequest, TResponse>({
    onRequest: onPrecognitiveRequest(handler.onRequest, errorParsers),
    handler: onPrecognitiveHandler(handler.handler),
    onBeforeResponse: handler.onBeforeResponse,
  })
}

function onPrecognitiveRequest<T extends EventHandlerRequest>(
  onRequest: _RequestMiddleware<T> | _RequestMiddleware<T>[] | undefined,
  errorParsers: PrecognitiveErrorParser[],
) {
  if (!onRequest)
    return undefined

  if (typeof onRequest === 'function')
    return onPrecognitiveRequestWrapper(onRequest, errorParsers)

  return onRequest.map(
    middleware => onPrecognitiveRequestWrapper(middleware, errorParsers),
  )
}

function onPrecognitiveRequestWrapper<T extends EventHandlerRequest>(
  middleware: _RequestMiddleware<T>,
  errorParsers: PrecognitiveErrorParser[],
): _RequestMiddleware<T> {
  return async (event) => {
    const config = useRuntimeConfig().public.nuxtPrecognition

    if (!hasPrecognitiveRequestsHeader(event.headers, config))
      return middleware(event)

    const validatingOnly = event.headers.get(config.validateOnlyHeader) ?? ''

    try {
      await middleware(event)
    }
    catch (error) {
      if (!(error instanceof Error)) {
        setResponseHeader(event, 'Content-Type', 'application/json')
        setResponseHeader(event, config.precognitiveHeader, 'true')
        setResponseHeader(event, config.validateOnlyHeader, validatingOnly)
        setResponseHeader(event, config.successfulHeader, 'false')
        throw error
      }

      const errorsData = errorParsers.reduce<undefined | ValidationErrorsData>(
        (errorsData, parser) => parser(error) ?? errorsData,
        undefined,
      )

      if (!errorsData) {
        setResponseHeader(event, 'Content-Type', 'application/json')
        setResponseHeader(event, config.precognitiveHeader, 'true')
        setResponseHeader(event, config.validateOnlyHeader, validatingOnly)
        setResponseHeader(event, config.successfulHeader, 'false')
        throw error
      }

      handlePrecognitiveErrorsData(errorsData, event, validatingOnly)
    }
  }
}

function handlePrecognitiveErrorsData<T extends EventHandlerRequest>(
  errorsData: ValidationErrorsData,
  event: H3Event<T>,
  validatingOnly: string,
) {
  const { successfulHeader, errorStatusCode, precognitiveHeader, validateOnlyHeader, validatingKeysSeparator } = useRuntimeConfig().public.nuxtPrecognition

  const errors = Object.keys(errorsData.errors).filter(e => validatingOnly.split(validatingKeysSeparator).includes(e))
  if (!errors.length)
    return

  const precognitveErrors = {} as Record<string, string | string[]>
  errors.forEach((key) => {
    const value = errorsData.errors[key]
    precognitveErrors[key] = Array.isArray(value) ? value : [value]
  })

  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, successfulHeader, 'false')
  setResponseHeader(event, precognitiveHeader, 'true')
  setResponseHeader(event, validateOnlyHeader, validatingOnly)
  throw createError({
    statusCode: errorStatusCode,
    data: {
      error: errorsData.error,
      errors: precognitveErrors,
    },
    message: errorsData.error,
  })
}

function onPrecognitiveHandler<TRequest extends EventHandlerRequest, TResponse>(
  handler: EventHandler<TRequest, TResponse>,
): EventHandler<TRequest, TResponse> {
  return (event: H3Event<EventHandlerRequest>) => {
    const { successfulHeader, successValidationStatusCode, precognitiveHeader, validateOnlyHeader } = useRuntimeConfig().public.nuxtPrecognition

    if (event.headers.get(precognitiveHeader) !== 'true')
      return handler(event)

    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseHeader(event, precognitiveHeader, 'true')
    setResponseHeader(event, successfulHeader, 'true')
    setResponseHeader(event, validateOnlyHeader, event.headers.get(validateOnlyHeader) ?? '')
    setResponseStatus(event as any, successValidationStatusCode)
    return null as unknown as TResponse
  }
}
