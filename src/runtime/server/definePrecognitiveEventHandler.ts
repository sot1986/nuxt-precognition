import type { EventHandler, EventHandlerObject, EventHandlerRequest, H3Event, _RequestMiddleware } from 'h3'
import type { ValidationErrorParser, ValidationErrorsData } from '../types/core'
import { hasResponse, makeLaravelValidationErrorParser, resolveValidationErrorData } from '../core'
import type { Config } from '../types/config'
import type { ServerStatusHandlers } from '../types/eventHandler'
import type { ErrorStatusCode } from '../types/utils'
import { useRuntimeConfig, defineEventHandler, setResponseHeader, createError, setResponseStatus } from '#imports'

function definePrecognitiveEventHandler<
TRequest extends EventHandlerRequest,
TResponse,
>(
  handler: EventHandlerObject<TRequest, TResponse>,
  options?: {
    errorParsers?: ValidationErrorParser[]
    statusHandlers?: ServerStatusHandlers
  },
): EventHandler<TRequest, TResponse> {
  return defineEventHandler<TRequest, TResponse>({
    onRequest: onPrecognitiveRequest(handler.onRequest, options),
    handler: onPrecognitiveHandler(handler.handler),
    onBeforeResponse: handler.onBeforeResponse,
  })
}

function onPrecognitiveRequest<T extends EventHandlerRequest>(
  onRequest: _RequestMiddleware<T> | _RequestMiddleware<T>[] | undefined,
  options?: {
    errorParsers?: ValidationErrorParser[]
    statusHandlers?: ServerStatusHandlers
  },
) {
  if (!onRequest)
    return undefined

  const config = useRuntimeConfig().public.precognition
  const baseParsers = [] as ValidationErrorParser[]

  if (config.enableLaravelServerErrorParser)
    baseParsers.push(makeLaravelValidationErrorParser(config))

  if (typeof onRequest === 'function')
    return onPrecognitiveRequestWrapper(
      onRequest,
      config,
      {
        errorParsers: [...baseParsers, ...(options?.errorParsers ?? [])],
        statusHandlers: options?.statusHandlers,
      },
    )

  return onRequest.map(middleware => onPrecognitiveRequestWrapper(
    middleware,
    config,
    {
      errorParsers: [...baseParsers, ...(options?.errorParsers ?? [])],
      statusHandlers: options?.statusHandlers,
    },
  ))
}

function onPrecognitiveRequestWrapper<T extends EventHandlerRequest>(
  middleware: _RequestMiddleware<T>,
  config: Config,
  options: {
    errorParsers: ValidationErrorParser[]
    statusHandlers?: ServerStatusHandlers
  },
): _RequestMiddleware<T> {
  return async (event) => {
    try {
      await middleware(event)
    }
    catch (error) {
      if (!(error instanceof Error)) {
        throw createError({
          message: 'Unknown server error',
          statusCode: 500,
          data: { message: 'Unknown server error' },
        })
      }

      const statusHandler = hasResponse(error) && options.statusHandlers
        ? options.statusHandlers[`${error.response.status}` as ErrorStatusCode]
        : undefined

      if (statusHandler) {
        return statusHandler(error, event)
      }

      setResponseHeader(event, 'Content-Type', 'application/json')

      const errorsData = resolveValidationErrorData(error, options.errorParsers)

      if (!errorsData) {
        throw error
      }

      handleValidationErrorsData(errorsData, event, config)
    }
  }
}

function handleValidationErrorsData<T extends EventHandlerRequest>(
  errorsData: ValidationErrorsData,
  event: H3Event<T>,
  config: Config,
) {
  setResponseStatus(event, config.errorStatusCode)
  setResponseHeader(event, 'Content-Type', 'application/json')

  if (!event.headers.has(config.precognitiveHeader)) {
    throw createError({
      message: errorsData.message,
      data: errorsData,
    })
  }

  setResponseHeader(event, config.precognitiveHeader, 'true')

  const validateOnly = event.headers.get(config.validateOnlyHeader)

  if (!validateOnly) {
    throw createError({
      status: config.errorStatusCode,
      message: errorsData.message,
      data: errorsData,
    })
  }

  setResponseHeader(event, config.validateOnlyHeader, validateOnly)

  const errors = Object.keys(errorsData.errors).filter(e => validateOnly.split(config.validatingKeysSeparator).includes(e))
  if (!errors.length)
    return

  const precognitveErrors = {} as Record<string, string | string[]>
  errors.forEach((key) => {
    const value = errorsData.errors[key]
    precognitveErrors[key] = Array.isArray(value) ? value : [value]
  })

  throw createError<ValidationErrorsData>({
    status: config.errorStatusCode,
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
    const config = useRuntimeConfig().public.precognition

    if (event.headers.get(config.precognitiveHeader) !== 'true')
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

definePrecognitiveEventHandler.create = function <TRequest extends EventHandlerRequest, TResponse>(
  options: {
    errorParsers?: ValidationErrorParser[]
    statusHandlers?: ServerStatusHandlers
  },
): (
    handler: EventHandlerObject<TRequest, TResponse>,
    options?: {
      errorParsers?: ValidationErrorParser[]
      statusHandlers?: ServerStatusHandlers
    },
  ) => EventHandler<TRequest, TResponse> {
  const baseErrorParsers = [...(options.errorParsers ?? [])]
  const baseStatusHandlers = { ...options.statusHandlers }
  return <
  TRequest extends EventHandlerRequest,
  TResponse,
  >(
    handler: EventHandlerObject<TRequest, TResponse>,
    options?: {
      errorParsers?: ValidationErrorParser[]
      statusHandlers?: ServerStatusHandlers
    },
  ) => definePrecognitiveEventHandler(handler, { errorParsers: [...baseErrorParsers, ...(options?.errorParsers ?? [])], statusHandlers: { ...baseStatusHandlers, ...options?.statusHandlers } })
}

export { definePrecognitiveEventHandler }
