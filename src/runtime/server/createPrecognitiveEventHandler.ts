import type { EventHandler, EventHandlerObject, EventHandlerRequest, _RequestMiddleware } from 'h3'
import type { PrecognitiveErrorParser } from '../types/core'
import { definePrecognitiveEventHandler } from './definePrecognitiveEventHandler'

export function createPrecognitiveEventHandler(
  errorParsers: PrecognitiveErrorParser[],
): <TRequest extends EventHandlerRequest, TResponse>(
    handler: EventHandlerObject<TRequest, TResponse>,
    errorParsers?: PrecognitiveErrorParser[],
  ) => EventHandler<TRequest, TResponse> {
  const baseErrorParsers = [...errorParsers]
  return <
  TRequest extends EventHandlerRequest,
  TResponse,
  >(handler: EventHandlerObject<TRequest, TResponse>, errorParsers: PrecognitiveErrorParser[] = []) => definePrecognitiveEventHandler(handler, [...baseErrorParsers, ...errorParsers])
}
