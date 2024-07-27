import { MongoClient } from 'mongodb'
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from 'sequelize'

export namespace Repository {
  export enum DATABASE_TYPE {
    POSTGRES = 'POSTGRES',
    MONGO = 'MONGO'
  }

  export enum DB_LOG_LEVEL {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
  }

  interface IDatabaseConnectionConfig {
    CONNECTION_URI: string
    LOG_LEVEL: DB_LOG_LEVEL
  }

  export interface IDatabaseConfig extends IDatabaseConnectionConfig {
    name: string
    type: DATABASE_TYPE
  }

  export type DatabaseMap = {
    MONGO: MongoClient
    POSTGRES: Sequelize
  }

  export type DatabaseConnection = {
    [name: string]: Sequelize | MongoClient
  }

  export enum ERROR_MESSAGE {
    INVALID_CONFIG = 'INVALID_CONFIG',
    UNABLE_TO_AUTHENTICATE = 'UNABLE_TO_AUTHENTICATE',
    UNABLE_TO_SYNC_MODELS = 'UNABLE_TO_SYNC_MODELS'
  }

  export namespace PG {
    type BaseSchema = {}

    interface IBaseSchema extends BaseSchema {}

    interface ICreatedAt extends IBaseSchema {
      createdAt: Date
    }

    interface IUpdatedAt extends IBaseSchema {
      updatedAt: Date
    }

    interface IDeletedAt extends IBaseSchema {
      deletedAt: Date
    }

    interface IEntityId extends IBaseSchema {
      id: number
    }

    interface ICreatedBy extends IBaseSchema {
      createdBy: string
    }

    export interface ICreateSchema extends ICreatedAt {}
    export interface IUpdateSchema extends IUpdatedAt {}
    export interface IDeleteSchema extends IDeletedAt {}

    export interface ICreateUpdateSchema extends ICreatedAt, IUpdatedAt {}
    export interface ICreateUpdateDeleteSchema
      extends ICreatedAt,
        IUpdatedAt,
        IDeletedAt {}

    export interface IDefaultPKSchema extends IEntityId {}
    export interface ICreatedBySchema extends ICreatedBy {}

    interface IBaseModel extends IBaseSchema {}

    type InferAttributesOptions<Excluded> = { omit?: Excluded }
    class BaseModel<
        M extends Model,
        Options extends InferAttributesOptions<keyof M | never | ''> = {
          omit: never
        }
      >
      extends Model<
        InferAttributes<M, Options>,
        InferCreationAttributes<M, Options>
      >
      implements IBaseModel {}

    export class ModelWithoutTimestamp<
      M extends Model,
      Options extends InferAttributesOptions<keyof M | never | ''> = {
        omit: never
      }
    > extends BaseModel<M, Options> {}

    export class ModelWithTimestamp<
        M extends Model,
        Options extends InferAttributesOptions<keyof M | never | ''> = {
          omit: never
        }
      >
      extends BaseModel<M, Options>
      implements ICreateUpdateSchema
    {
      declare createdAt: CreationOptional<Date>
      declare updatedAt: CreationOptional<Date>
    }

    export class ModelWithDeleteTimestamp<
        M extends Model,
        Options extends InferAttributesOptions<keyof M | never | ''> = {
          omit: never
        }
      >
      extends BaseModel<M, Options>
      implements ICreateUpdateDeleteSchema
    {
      declare createdAt: CreationOptional<Date>
      declare updatedAt: CreationOptional<Date>
      declare deletedAt: CreationOptional<Date>
    }

    export type RegisterModel = (sequelize: Sequelize) => void
  }
}
