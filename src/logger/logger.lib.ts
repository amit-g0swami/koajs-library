import pino from 'pino'
import { ClientLogger } from './logger.interface'

class KoaClientLogger implements ClientLogger.ILogger {
  declare trace: pino.LogFn
  declare debug: pino.LogFn
  declare info: pino.LogFn
  declare warn: pino.LogFn
  declare error: pino.LogFn
  declare fatal: pino.LogFn

  private _createLogger = () =>
    pino({
      name: process.env.SERVICE_NAME
        ? `${process.env.SERVICE_NAME}-logger`
        : 'app-logger',
      level: process.env.LOG_LEVEL || ClientLogger.LOG_LEVEL.INFO,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          levelFirst: true,
          ignore: 'pid,hostname',
          singleLine: true
        }
      }
    })

  constructor() {
    // eslint-disable-next-line no-console
    this.trace = console.trace.bind(this)
    // eslint-disable-next-line no-console
    this.debug = console.debug.bind(this)
    // eslint-disable-next-line no-console
    this.info = console.info.bind(this)
    // eslint-disable-next-line no-console
    this.warn = console.warn.bind(this)
    // eslint-disable-next-line no-console
    this.error = console.error.bind(this)
    // eslint-disable-next-line no-console
    this.fatal = console.error.bind(this)
  }

  createLogger = () => {
    const logger = this._createLogger()

    this.trace = logger.trace.bind(logger)
    this.debug = logger.debug.bind(logger)
    this.info = logger.info.bind(logger)
    this.warn = logger.warn.bind(logger)
    this.error = logger.error.bind(logger)
    this.fatal = logger.fatal.bind(logger)

    return logger
  }
}

export const Logger = new KoaClientLogger()
