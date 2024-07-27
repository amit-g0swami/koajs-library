import { createClient, SetOptions } from 'redis'
import { Response } from '../api'
import { Cache } from './cache.interface'
import { Config } from '../config'
import { Logger } from '../logger'
import { ClientError } from '../error'

export class RedisCache implements Cache.CacheStore {
  name: string
  conn?: Cache.Redis.ConnectionType
  opts: Cache.Redis.ClientOptions = {}

  constructor(
    name: string,
    opts?: Omit<Cache.Redis.ClientOptions, 'url' | 'name'>
  ) {
    this.name = name.toUpperCase()
    this.opts = { ...this.opts, ...opts, name: this.name }
  }

  /**
   * get conn uri
   * @returns
   */
  private getConnectionURI = () => {
    const connectionURI = Config.getEnv(`${this.name}_REDIS_URI`)

    if (!connectionURI) {
      throw new ClientError.ApplicationError(
        Cache.ERROR_NAME.INVALID_CACHE_URI,
        Response.HTTP_STATUS_CODE.InternalServerError,
        'Invalid connection URI!'
      )
    }

    return connectionURI
  }

  /**
   * get redis conn
   * @returns
   */
  getConnection = () => {
    let conn = this.conn
    if (!conn || !conn.isOpen) {
      conn = createClient({
        ...this.opts,
        url: this.getConnectionURI()
      })
    }

    this.conn = conn
    return conn
  }

  /**
   * get existing value in cache using key
   * and if not value is not found and setter is provided
   * it will set the value and return
   * @param key
   * @param setter
   * @returns
   */

  get = async <T = string>(
    key: string,
    setter?: string | Function | Promise<string>,
    opts?: SetOptions
  ) => {
    const existingValue = await this.getConnection().get(key)
    if (existingValue) {
      return JSON.parse(existingValue) as T
    }

    if (setter) {
      return this.set<T>(key, setter, opts)
    }
  }

  /**
   *
   * @param key
   * @param setter
   * @returns
   */

  set = async <T = string>(
    key: string,
    setter: string | Function | Promise<string>,
    opts?: SetOptions
  ) => {
    let valueToSet: string = ''

    if (typeof setter === 'string') {
      valueToSet = setter
    } else if (typeof setter === 'function') {
      valueToSet = await setter()
    }

    await this.getConnection().set(key, JSON.stringify(valueToSet), {
      ...(opts || {})
    })
    return valueToSet as T
  }

  del = async (key: string) => {
    await this.getConnection().del(key)
  }

  /**
   * connect to redis server
   * @returns
   */
  connect = async () => {
    try {
      const client = this.getConnection()
      await client.connect()

      Logger.info(`redis cache with name ${this.name} successfully connected`)
      return client
    } catch (err: any) {
      Logger.error(err.message)
      Logger.debug(err.stack)
      throw new ClientError.ApplicationError(
        Cache.ERROR_NAME.REDIS_CONNECTION_ERROR,
        Response.HTTP_STATUS_CODE.InternalServerError,
        'could not connect to redis client'
      )
    }
  }

  /**
   * disconnect redis client
   * @returns
   */
  disconnect = () => this.getConnection().disconnect()
}
