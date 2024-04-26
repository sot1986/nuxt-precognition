import type { EventHandler, EventHandlerObject, EventHandlerRequest, H3Event, _RequestMiddleware } from 'h3'
import { defineEventHandler, setResponseHeader, createError, setResponseStatus } from 'h3'
import type { ValidationErrorParser, ValidationErrorsData } from '../types/core'
import { hasPrecognitiveRequestsHeader, makeLaravelValidationErrorParser, resolveValidationErrorData } from '../core'
import { useRuntimeConfig } from '#imports'

function definePrecognitiveEventHandler<
TRequest extends EventHandlerRequest,
TResponse,
>(
  handler: EventHandlerObject<TRequest, TResponse>,
  errorParsers: ValidationErrorParser[] = [],
): EventHandler<TRequest, TResponse> {
  return defineEventHandler<TRequest, TResponse>({
    onRequest: onPrecognitiveRequest(handler.onRequest, errorParsers),
    handler: onPrecognitiveHandler(handler.handler),
    onBeforeResponse: handler.onBeforeResponse,
  })
}

function onPrecognitiveRequest<T extends EventHandlerRequest>(
  onRequest: _RequestMiddleware<T> | _RequestMiddleware<T>[] | undefined,
  errorParsers: ValidationErrorParser[],
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
  errorParsers: ValidationErrorParser[],
): _RequestMiddleware<T> {
  const config = useRuntimeConfig().public.nuxtPrecognition
  const baseParsers = [] as ValidationErrorParser[]
  if (config.enableServerLaravelErrorParser)
    baseParsers.push(makeLaravelValidationErrorParser(config))

  return async (event) => {
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
        throw error
      }

      const errorsData = resolveValidationErrorData(error, [...baseParsers, ...errorParsers])

      if (!errorsData) {
        setResponseHeader(event, 'Content-Type', 'application/json')
        setResponseHeader(event, config.precognitiveHeader, 'true')
        setResponseHeader(event, config.validateOnlyHeader, validatingOnly)
        throw error
      }

      handleValidationErrorsData(errorsData, event, validatingOnly)
    }
  }
}

function handleValidationErrorsData<T extends EventHandlerRequest>(
  errorsData: ValidationErrorsData,
  event: H3Event<T>,
  validatingOnly: string,
) {
  const config = useRuntimeConfig().public.nuxtPrecognition

  const errors = Object.keys(errorsData.errors).filter(e => validatingOnly.split(config.validatingKeysSeparator).includes(e))
  if (!errors.length)
    return

  const precognitveErrors = {} as Record<string, string | string[]>
  errors.forEach((key) => {
    const value = errorsData.errors[key]
    precognitveErrors[key] = Array.isArray(value) ? value : [value]
  })

  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, config.precognitiveHeader, 'true')
  setResponseHeader(event, config.validateOnlyHeader, validatingOnly)
  throw createError<ValidationErrorsData>({
    statusCode: config.errorStatusCode,
    data: {
      message: errorsData.message,
      errors: precognitveErrors,
    },
    message: errorsData.message,
  })
}

function onPrecognitiveHandler<TRequest extends EventHandlerRequest, TResponse>(
  handler: EventHandler<TRequest, TResponse>,
): EventHandler<TRequest, TResponse> {
  return (event: H3Event<EventHandlerRequest>) => {
    const config = useRuntimeConfig().public.nuxtPrecognition

    if (!hasPrecognitiveRequestsHeader(event.headers, config))
      return handler(event)

    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseHeader(event, config.precognitiveHeader, 'true')
    setResponseHeader(event, config.successfulHeader, 'true')

    const validateOnlyKey = event.headers.get(config.validateOnlyHeader)
    if (validateOnlyKey)
      setResponseHeader(event, config.validateOnlyHeader, validateOnlyKey)
    setResponseStatus(event, config.successValidationStatusCode)
    return null as unknown as TResponse
  }
}

definePrecognitiveEventHandler.create = function (
  errorParsers: ValidationErrorParser[],
): <TRequest extends EventHandlerRequest, TResponse>(
    handler: EventHandlerObject<TRequest, TResponse>,
    errorParsers?: ValidationErrorParser[],
  ) => EventHandler<TRequest, TResponse> {
  const baseErrorParsers = [...errorParsers]
  return <
  TRequest extends EventHandlerRequest,
  TResponse,
  >(handler: EventHandlerObject<TRequest, TResponse>, errorParsers: ValidationErrorParser[] = []) => definePrecognitiveEventHandler(handler, [...baseErrorParsers, ...errorParsers])
}

export { definePrecognitiveEventHandler }
