import type { ErrorStatusCode } from './utils'
import type { ValidationErrorParser } from './core'

export type ServerStatusHandler<TEvent = unknown> = (error: Error, event: TEvent) => void | Promise<void>

export type ServerStatusHandlers<TEvent = unknown> = Partial<Record<ErrorStatusCode, ServerStatusHandler<TEvent>>>

export interface PrecognitionEventContext<TEvent = unknown> {
  $precognition: {
    errorParsers: ValidationErrorParser[]
    statusHandlers: ServerStatusHandlers<TEvent>
  }
  precognitive: boolean
}

export {}
