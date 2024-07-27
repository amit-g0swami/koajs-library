import { ClientCache } from './cache'
import { ClientConfig, Config } from './config'
import { Logger } from './logger'
import { KoaClientRepository } from './repository'
import { KoaClientServer } from './server'

class KoaClientService {
  configure = <IAppEnv>(config: ClientConfig.InputAppConfig<IAppEnv>) => {
    // initialise config first
    Config.init(config)

    // initialise logger
    Logger.createLogger()

    // mount registered resources
    KoaClientServer.mountResources()
  }

  private clean = (err: any) => {
    const EXIT_PROCESS_STATUS = 1

    Logger.fatal(err)
    KoaClientRepository.disconnect()
    ClientCache.disconnect()
    process.exit(EXIT_PROCESS_STATUS)
  }

  start = async () => {
    process
      .on('unhandledRejection', (reason, p) => {
        Logger.warn(`found unhandled promise rejection! ${reason}`)
        Logger.warn(p)
      })
      .on('uncaughtException', this.clean)
      .on('SIGHUP', this.clean)
      .on('SIGINT', this.clean)
      .on('exit', this.clean)

    // start statements

    await KoaClientRepository.connect()
    await ClientCache.connect()
    await KoaClientServer.startServer()
  }
}

export const Service = new KoaClientService()

export * from './api'
export * from './config'
export * from './error'
export * from './logger'
export * from './repository'
export * from './server'
export * from './utils'
export * from './middleware'
export * from './auth'
export * from './cache'
export * from './network'
