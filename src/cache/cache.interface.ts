import {
  RedisClientType,
  RedisClientOptions,
  RedisModules,
  RedisFunctions,
  RedisScripts,
  SetOptions
} from 'redis'

export namespace Cache {
  export declare class CacheStore {
    name: string
    getConnection: () => AvailableCacheType
    connect: () => Promise<AvailableCacheType>
    disconnect: () => Promise<void>
    get: <T = string>(
      key: string,
      setter?: CacheSetter<T>,
      opts?: CacheSetOptions
    ) => Promise<T | undefined>
    set: <T = string>(
      key: string,
      setter: CacheSetter<T>,
      opts?: CacheSetOptions
    ) => Promise<T>
    del: (key: string) => void | Promise<void>
  }

  export type AvailableCacheType = Redis.ConnectionType
  export type CacheSetOptions = Redis._SetOptions
  type FnCacheSetter<T> = (...args: any) => T
  type StringCacheSetter = string

  export type CacheSetter<T> = StringCacheSetter | FnCacheSetter<T>

  export enum ERROR_NAME {
    INVALID_CACHE_URI = 'INVALID_CACHE_URI',
    INVALID_CACHE_NAME = 'INVALID_CACHE_NAME',
    REDIS_CONNECTION_ERROR = 'REDIS_CONNECTION_ERROR',
    INVALID_CLIENT_OPTIONS = 'INVALID_CLIENT_OPTIONS'
  }

  export namespace Redis {
    export type ConnectionType = RedisClientType<
      RedisModules,
      RedisFunctions,
      RedisScripts
    >

    export type ClientOptions = RedisClientOptions
    export type _SetOptions = SetOptions
  }
}
