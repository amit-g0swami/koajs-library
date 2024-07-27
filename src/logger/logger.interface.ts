import pino from 'pino'

export namespace ClientLogger {
  export enum LOG_LEVEL {
    TRACE = 'trace',
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal'
  }

  export interface ILogger {
    trace: pino.Logger['trace']
    debug: pino.Logger['debug']
    info: pino.Logger['info']
    warn: pino.Logger['warn']
    error: pino.Logger['error']
    fatal: pino.Logger['fatal']
  }
}
