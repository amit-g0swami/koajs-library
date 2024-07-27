import { ValidationError as JoiValidationError } from 'joi'
import { Response, Request } from '../api/api.interface'

export namespace ClientError {
  export interface IServiceError {
    name: ErrorName
    message: string
    type: ERROR_TYPE
  }

  export enum ERROR_NAME {
    MISSING_APP_ROOT = 'MISSING_APP_ROOT',
    BAD_REQUEST = 'BAD_REQUEST',
    UNPROCESSABLE_REQUEST = 'UNPROCESSABLE_REQUEST',
    GENERIC_ERROR = 'GENERIC_ERROR',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    MISSING_PARAMS = 'MISSING_PARAMS',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
    DB_OPS_ERROR = 'DB_OPS_ERROR',
    MISSING_CONFIG = 'MISSING_CONFIG',
    MISSING_API_HANDLER = 'MISSING_API_HANDLER',
    RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
    INVALID_API_RESOURCE = 'INVALID_API_RESOURCE',
    MISSING_TRACE_ID = 'MISSING_TRACE_ID',
    INVALID_TRACE_ID = 'INVALID_TRACE_ID',
    MISSING_ORIG_IP = 'MISSING_ORIG_IP',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    INVALID_AUTH_TOKEN_FORMAT = 'INVALID_AUTH_TOKEN_FORMAT',
    INVALID_TOKEN_SIGNATURE = 'INVALID_TOKEN_SIGNATURE',
    INVALID_ACCESS_TOKEN = 'INVALID_ACCESS_TOKEN',
    UNAUTHORISED_ACCESS_TOKEN = 'UNAUTHORISED_ACCESS_TOKEN',
    MESH_INVOCATION_FAILED = 'MESH_INVOCATION_FAILED'
  }

  export enum ERROR_TYPE {
    CONFIG_ERROR = 'CONFIG_ERROR',
    APPLICATION_ERROR = 'APPLICATION_ERROR',
    CONTROLLER_ERROR = 'CONTROLLER_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RPC_ERROR = 'RPC_ERROR'
  }

  export type ErrorName = string | ERROR_NAME

  export class BaseError extends Error {
    name: ErrorName
    statusCode: number
    message: string
    type: ERROR_TYPE
    data?: object

    constructor(
      name: ErrorName,
      statusCode: number,
      message: string,
      type: ERROR_TYPE
    ) {
      super(message)

      Object.setPrototypeOf(this, new.target.prototype)

      this.name = name
      this.statusCode = statusCode
      this.message = message
      this.type = type
      Error.captureStackTrace(this)
    }
  }

  /**
   * error class to throw errors related to business logic
   */

  export class ApplicationError extends BaseError {
    constructor(name: ErrorName, statusCode: number, message: string) {
      super(name, statusCode, message, ERROR_TYPE.APPLICATION_ERROR)
    }
  }

  /**
   * error class to throw errors on controller
   */

  export class ControllerError extends BaseError {
    constructor(name: ErrorName, statusCode: number, message: string) {
      super(name, statusCode, message, ERROR_TYPE.CONTROLLER_ERROR)
    }
  }

  /**
   * error class for missing pramas in request
   */

  export class MissingParamsError extends ControllerError {
    constructor(type: Request.Validation.TYPE, missingKeys: string[]) {
      super(
        ERROR_NAME.MISSING_PARAMS,
        Response.HTTP_STATUS_CODE.BadRequest,
        `Following keys are missing from ${type} - ${missingKeys.join(', ')}`
      )
    }
  }

  /**
   * error class for rpc invocation failures
   */

  export class RPCError extends BaseError {
    constructor(name: ErrorName, statusCode: number, message: string) {
      super(name, statusCode, message, ERROR_TYPE.RPC_ERROR)
    }
  }

  /**
   * error class for request validation errors
   */

  export class ValidationError extends BaseError {
    constructor(type: Request.Validation.TYPE, joiError: JoiValidationError) {
      super(
        ERROR_NAME.VALIDATION_ERROR,
        Response.HTTP_STATUS_CODE.BadRequest,
        `${joiError.message} in ${type.toLowerCase()}`,
        ERROR_TYPE.CONTROLLER_ERROR
      )
    }
  }

  /**
   * error class for missing config errors
   */

  export class MissingConfigError extends BaseError {
    constructor(joiError: JoiValidationError) {
      super(
        ERROR_NAME.MISSING_CONFIG,
        Response.HTTP_STATUS_CODE.InternalServerError,
        joiError.message,
        ERROR_TYPE.CONFIG_ERROR
      )
    }
  }

  /**
   * generic error class
   */

  export class GenericError extends BaseError {
    constructor(
      msg: string,
      type: ERROR_TYPE,
      statusCode: Response.HTTP_STATUS_CODE
    ) {
      super(ERROR_NAME.GENERIC_ERROR, statusCode, msg, type)
    }
  }

  /**
   * transform joi error with default bad
   */

  export class CustomJoiError extends BaseError {
    constructor(type: ERROR_TYPE, joiError: JoiValidationError) {
      super(
        ERROR_NAME.VALIDATION_ERROR,
        Response.HTTP_STATUS_CODE.BadRequest,
        joiError.message,
        type
      )
    }
  }
}
