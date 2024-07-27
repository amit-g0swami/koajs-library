import Joi from 'joi'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { ClientConfig } from './config.interface'
import { ClientLogger } from '../logger/logger.interface'
import { ClientError } from '../error'
import { Response } from '../api'
import { Logger } from '../logger'

class KoaClientConfig<IEnvConfig extends ClientConfig.IBaseEnvConfig> {
  declare serviceConfig: ClientConfig.IServiceConfig<IEnvConfig>
  appRoot?: string

  private mandatoryConfigSchema = Joi.object<any>({
    NODE_ENV: Joi.string()
      .valid(...Object.values(ClientConfig.SERVICE_ENV))
      .required(),
    APP_PORT: Joi.number().required(),
    SERVICE_NAME: Joi.string().required(),
    APP_HOST: Joi.string().required(),
    LOG_LEVEL: Joi.string()
      .valid(...Object.values(ClientLogger.LOG_LEVEL))
      .default(ClientLogger.LOG_LEVEL.INFO),
    PM2_PUBLIC_KEY: Joi.string().default(process.env.PM2_PUBLIC_KEY || ''),
    PM2_SECRET_KEY: Joi.string().default(process.env.PM2_SECRET_KEY || '')
  })

  /**
   * initiate the service with provide config
   * @param config
   * @returns
   */

  init = (config: ClientConfig.InputAppConfig<IEnvConfig>) => {
    this.appRoot = config.AppRoot

    this.serviceConfig = {
      AppRoot: config.AppRoot,
      AppRole: config.AppRole || [ClientConfig.APP_ROLE.service],
      EnvConfigSchema: config.EnvConfigSchema,
      Databases: config.Databases,
      Resources: config.Resources,
      Caches: config.Caches
    }

    /**
     * validate application role strategy before config as it might include extra env variables
     */
    this.enforceAppRole({
      ...config,
      AppRole: config.AppRole || [ClientConfig.APP_ROLE.service]
    })

    /**
     * load and validate required config
     */
    this.loadAndValidateConfig()
    return this
  }

  private enforceAppRole = (config: ClientConfig.IAppConfig<IEnvConfig>) => {
    const { AppRole } = config

    switch (AppRole[0]) {
      case ClientConfig.APP_ROLE.gateway:
        {
          const gatewayMandatorySchema = Joi.object({
            SSO_CLIENT_ID: Joi.string().required(),
            SSO_CLIENT_SECRET: Joi.string().required(),
            ALLOWED_CORS_ORIGINS: Joi.string().required(),
            AUTH_TOKEN_CACHE_REDIS_URI: Joi.string().required()
          })

          this.mandatoryConfigSchema = this.mandatoryConfigSchema.concat(
            gatewayMandatorySchema
          )

          this.serviceConfig.Caches.push(
            new RedisCache(Auth.AUTH_TOKEN_CACHE_NAME)
          )
        }
        break
      case ClientConfig.APP_ROLE.service:
        {
          const serviceMandatorySchema = Joi.object({
            SSO_BASE_URL: Joi.string().required(),
            RSA_PUBLIC_KEY_REDIS_URI: Joi.string().required()
          })

          this.mandatoryConfigSchema = this.mandatoryConfigSchema.concat(
            serviceMandatorySchema
          )

          this.serviceConfig.Caches.push(
            new RedisCache(Auth.RSA_PUBLIC_KEY_CACHE_NAME)
          )
        }
        break
      case ClientConfig.APP_ROLE.replica:
      case ClientConfig.APP_ROLE.worker:
        return

      default:
        throw new ClientError.ApplicationError(
          ClientError.ERROR_NAME.INTERNAL_SERVER_ERROR,
          Response.HTTP_STATUS_CODE.InternalServerError,
          'invalid app role strategy'
        )
    }
  }

  /**
   * load and validate the input app config schema after appending mand schema to it
   * @param configSchema
   * @returns
   */

  private loadAndValidateConfig = <T>() => {
    const { NODE_ENV } = process.env
    const configSchema = this.mandatoryConfigSchema

    if (!NODE_ENV || NODE_ENV === ClientConfig.SERVICE_ENV.LOCAL) {
      if (!this.appRoot) {
        throw new ClientError.ApplicationError(
          ClientError.ERROR_NAME.MISSING_APP_ROOT,
          Response.HTTP_STATUS_CODE.InternalServerError,
          'appRoot is not set to load the env!'
        )
      }

      this.loadEnvFromFile(this.appRoot)
    }

    const config: { [k: string]: string } = {}
    const configKeys = Object.keys(configSchema.describe().keys)
    for (const key of configKeys) {
      const envValue = process.env[key]

      if (envValue) {
        config[key] = envValue
      }
    }

    const validationResult = configSchema.validate(config)
    if (validationResult.error) {
      throw new ClientError.MissingConfigError(validationResult.error)
    }

    Logger.info(
      `loaded environment for ${NODE_ENV || ClientConfig.SERVICE_ENV.LOCAL}`
    )
    return { ...config } as T & ClientConfig.IBaseEnvConfig
  }

  /**
   * load environment file for given app root path
   * @param appRoot
   */

  private loadEnvFromFile = (appRoot: string) => {
    Logger.info(`loading environment from ${appRoot}/environment`)

    const envPath = resolve(`${appRoot}/environment/.env`)
    dotenv.config({ path: envPath })
  }

  /**
   * create config schema for any new service
   * @param configSchema
   * @returns
   */

  createConfigSchema = <IAppEnvSchema>(
    configSchema: Joi.StrictSchemaMap<
      Omit<IAppEnvSchema, keyof ClientConfig.IBaseEnvConfig>
    >
  ): Joi.ObjectSchema<IAppEnvSchema & ClientConfig.IBaseEnvConfig> => {
    this.mandatoryConfigSchema = this.mandatoryConfigSchema.concat(
      Joi.object(configSchema)
    )
    return this.mandatoryConfigSchema
  }

  /**
   * get env value for the given key
   * @param key
   * @returns
   */

  getEnv = <IAppEnv = ClientConfig.IBaseEnvConfig>(key: keyof IAppEnv) => {
    const envValue = process.env[key] as string | undefined
    return envValue
  }
}

export const Config = new KoaClientConfig()
