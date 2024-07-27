import Joi from 'joi'
import { ClientLogger } from '../logger/logger.interface'
import { Request } from '../api'
import { Repository } from '../repository'
import { Server } from '../server'
import { Cache } from '../cache'

export namespace ClientConfig {
  export type IMandatoryEnvConfig = {
    NODE_ENV: string
    SERVICE_NAME: string
    APP_HOST: string
    APP_PORT: string
  }

  type IOptionalEnvConfig = {
    PM2_PUBLIC_KEY: string
    PM2_SECRET_KEY: string
    DEBUG_PORT: string
    LOG_LEVEL: ClientLogger.LOG_LEVEL
    ALLOWED_CORS_ORIGINS: string
  }

  export type AuthorizationConfig = {
    SSO_BASE_URL: string
    SSO_CLIENT_ID: string
    SSO_CLIENT_SECRET: string
    RSA_PUBLIC_KEY_REDIS_URI: string
  }

  export enum APP_ROLE {
    gateway = 'gateway',
    service = 'service',
    worker = 'worker',
    replica = 'replica'
  }

  export type IBaseEnvConfig = IMandatoryEnvConfig &
    Partial<IOptionalEnvConfig & AuthorizationConfig>

  export type AppRole =
    | [APP_ROLE.gateway, Request.TraceHeaderSetter]
    | [APP_ROLE.service]
    | [APP_ROLE.replica]
    | [APP_ROLE.worker]

  export interface IAppConfig<IEnvConfig> {
    AppRoot: string
    EnvConfigSchema: Joi.ObjectSchema<IEnvConfig & ClientConfig.IBaseEnvConfig>
    Databases: Omit<Repository.IDatabaseConfig, 'CONNECTION_URI'>[]
    Resources: Server.Resource[]
    Caches: Cache.CacheStore[]
    AppRole: AppRole
  }

  export type InputAppConfig<IEnvConfig> = Omit<
    IAppConfig<IEnvConfig>,
    'AppRole'
  > &
    Partial<Pick<IAppConfig<IEnvConfig>, 'AppRole'>>

  export interface IServiceConfig<
    IEnvConfig extends ClientConfig.IBaseEnvConfig
  > extends IAppConfig<IEnvConfig> {}

  export enum SERVICE_ENV {
    PRODUCTION = 'production',
    STAGING = 'staging',
    DEV = 'development',
    LOCAL = 'local'
  }
}

export namespace ClientConfigConstant {
  export const ZERO = 0
  export const ONE = 1
  export const TWO = 2
  export const THREE = 3
  export const FOUR = 4
  export const FIVE = 5
  export const SIX = 6
  export const SEVEN = 7
  export const EIGHT = 8
  export const NINE = 9
  export const TEN = 10
  export const HUNDRED = 100
  export const THOUSAND = 1000
  export const SMALLEST = -Infinity
  export const LARGEST = Infinity
}
