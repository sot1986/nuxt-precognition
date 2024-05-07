import type { H3Event, EventHandlerRequest } from 'h3'
import type { ErrorStatusCode } from './utils'

export type ServerStatusHandlers = Partial<Record<ErrorStatusCode, <TRequest extends EventHandlerRequest>(error: Error, event: H3Event<TRequest>) => void | Promise<void>>>

export {}
