import { MongoClient } from 'mongodb'
import { Sequelize } from 'sequelize'
import { Repository } from './repository.interface'
import { Response } from '../api'
import { Logger } from '../logger'
import { ClientError } from '../error'
import { Config } from '../config'

interface IRepository {
  getConnection: <Type extends Repository.DATABASE_TYPE>(
    name: string
  ) => Repository.DatabaseMap[Type]
  connect: () => void
  disconnect: () => void
  registerPGModel: (fn: Repository.PG.RegisterModel) => void
}

class KoaRepository implements IRepository {
  private conn: Repository.DatabaseConnection = {}
  private pgModels: Repository.PG.RegisterModel[] = []

  private connectToPostgres = async (
    pgURI: string,
    enableLogging: boolean = false
  ) => {
    try {
      const conn = new Sequelize(pgURI, {
        logging: enableLogging ? Logger.debug : enableLogging,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      })
      await conn.authenticate()
      Logger.info('postgres successfully authenticated')
      return conn
    } catch (err: any) {
      Logger.error(err.message)
      Logger.debug(err.stack)
      throw new ClientError.ApplicationError(
        ClientError.ERROR_NAME.DB_CONNECTION_ERROR,
        Response.HTTP_STATUS_CODE.InternalServerError,
        Repository.ERROR_MESSAGE.UNABLE_TO_AUTHENTICATE
      )
    }
  }

  private syncPgModels = async (conn: Sequelize) => {
    this.pgModels.map((fn) => fn(conn))

    try {
      await conn.sync()
    } catch (err: any) {
      Logger.error(err.message)
      Logger.debug(err.stack)
      throw new ClientError.ApplicationError(
        ClientError.ERROR_NAME.DB_OPS_ERROR,
        Response.HTTP_STATUS_CODE.InternalServerError,
        Repository.ERROR_MESSAGE.UNABLE_TO_SYNC_MODELS
      )
    }
  }

  private connectToMongoDb = async (
    mongodbURI: string,
    enableLogging: boolean = false
  ) => {
    try {
      const conn = await MongoClient.connect(mongodbURI, {
        ignoreUndefined: true,
        monitorCommands: enableLogging
      })

      await conn.connect()
      Logger.info('mongodb successfully authenticated')
      return conn
    } catch (err: any) {
      Logger.error(err.message)
      Logger.debug(err.stack)
      throw new ClientError.ApplicationError(
        ClientError.ERROR_NAME.DB_CONNECTION_ERROR,
        Response.HTTP_STATUS_CODE.InternalServerError,
        Repository.ERROR_MESSAGE.UNABLE_TO_AUTHENTICATE
      )
    }
  }

  getConnection = <Type extends Repository.DATABASE_TYPE>(name: string) => {
    const conn = this.conn[name]
    if (!conn) {
      throw new ClientError.ApplicationError(
        ClientError.ERROR_NAME.DB_CONNECTION_ERROR,
        Response.HTTP_STATUS_CODE.ServiceUnavailable,
        'Could not find database connection!'
      )
    }

    return conn as Repository.DatabaseMap[Type]
  }

  connect = async () => {
    const { serviceConfig } = Config
    if (!serviceConfig) {
      throw new ClientError.ApplicationError(
        ClientError.ERROR_NAME.INTERNAL_SERVER_ERROR,
        Response.HTTP_STATUS_CODE.InternalServerError,
        'service config was not found!'
      )
    }

    const { Databases } = serviceConfig
    for (const dbConfig of Databases) {
      const connectionURI = Config.getEnv(`${dbConfig.name}_URI`)

      if (!connectionURI) {
        throw new ClientError.ApplicationError(
          ClientError.ERROR_NAME.DB_CONNECTION_ERROR,
          Response.HTTP_STATUS_CODE.InternalServerError,
          'Invalid connection URI!'
        )
      }

      switch (dbConfig.type) {
        case Repository.DATABASE_TYPE.MONGO:
          this.conn[dbConfig.name] = await this.connectToMongoDb(
            connectionURI,
            dbConfig.LOG_LEVEL === Repository.DB_LOG_LEVEL.DEBUG
          )
          break
        case Repository.DATABASE_TYPE.POSTGRES: {
          const conn = await this.connectToPostgres(
            connectionURI,
            dbConfig.LOG_LEVEL === Repository.DB_LOG_LEVEL.DEBUG
          )
          this.conn[dbConfig.name] = conn
          await this.syncPgModels(conn)
          break
        }
        default:
          break
      }
    }
  }

  disconnect = () => {
    for (const key in this.conn) {
      if (key in this.conn) {
        const conn = this.conn[key]

        if (conn instanceof Sequelize) {
          conn.close()
        }

        if (conn instanceof MongoClient) {
          conn.close()
        }
      }
    }
  }

  registerPGModel = (fn: Repository.PG.RegisterModel) => this.pgModels.push(fn)
}

export const KoaClientRepository = new KoaRepository()
