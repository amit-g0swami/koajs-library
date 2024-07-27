import { Response } from '../api'
import { Config } from '../config'
import { ClientError } from '../error'
import { Cache } from './cache.interface'
import { RedisCache } from './redis.lib'

export namespace ClientCache {
  /**
   * connect to all caches
   */
  export const connect = async () => {
    const { serviceConfig } = Config
    for (const cacheInstance of serviceConfig.Caches) {
      await cacheInstance.connect()
    }
  }

  /**
   * disconnect from cache service
   */
  export const disconnect = async () => {
    const { serviceConfig } = Config
    for (const cacheInstance of serviceConfig.Caches) {
      await cacheInstance.disconnect()
    }
  }

  /**
   * get conn instance using name
   * @param name
   */
  export const getCacheConnectionByName = (name: string) => {
    const { serviceConfig } = Config
    for (const cacheInstance of serviceConfig.Caches) {
      if (cacheInstance.name === name) {
        return cacheInstance
      }
    }

    throw new ClientError.ApplicationError(
      Cache.ERROR_NAME.INVALID_CACHE_NAME,
      Response.HTTP_STATUS_CODE.InternalServerError,
      `no cache connection found with name ${name}`
    )
  }
  /**
   * point to redis cache class
   */
  export const Redis = RedisCache
}
