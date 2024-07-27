import Koa, { HttpError } from 'koa'
import { DatabaseError } from 'sequelize'
import { Request, Response } from '../api'
import { Logger } from '../logger'
import { ClientError } from '../error'

enum LOG_MSG_KEYS {
  traceId = 'traceId',
  protocol = 'protocol',
  method = 'method',
  url = 'url',
  responseTime = 'responseTime',
  statusCode = 'statusCode',
  contentLength = 'contentLength',
  timestamp = 'timestamp',
  ip = 'ip',
  originalIp = 'originalIp',
  context = 'context',
  userAgent = 'userAgent',
  platform = 'platform',
  device = 'device',
  foreignTraceId = 'fkTraceId'
}

type PrintableLogObject = {
  [keyof in LOG_MSG_KEYS]: string
}

type LogObject = PrintableLogObject & {
  request: any
}

export const requestProcessor = async (
  ctx: Request.Context<Request.IBaseState, Response.BaseDataDTO>,
  next: Koa.Next
) => {
  const startTime = Date.now()
  try {
    await next()
  } catch (err: any) {
    // eslint-disable-next-line max-len
    const errLogMsg = `${ctx.state.trace.traceId} ${err.name}: ${err.message}`
    Logger.error(errLogMsg)

    if (err instanceof DatabaseError) {
      Logger.debug(err.parent.stack, errLogMsg)
    } else {
      Logger.debug(err)
    }

    let payload: ClientError.IServiceError = {
      name: ClientError.ERROR_NAME.INTERNAL_SERVER_ERROR,
      message: ClientError.ERROR_NAME.INTERNAL_SERVER_ERROR,
      type: ClientError.ERROR_TYPE.APPLICATION_ERROR
    }

    let statusCode = Response.HTTP_STATUS_CODE.InternalServerError

    if (err instanceof HttpError) {
      statusCode = err.statusCode
      payload = {
        ...payload,
        name: err.name as ClientError.ERROR_NAME,
        message: err.message,
        type: ClientError.ERROR_TYPE.APPLICATION_ERROR
      }
    } else if (err instanceof ClientError.BaseError) {
      statusCode = err.statusCode
      payload = {
        ...payload,
        name: err.name,
        message: err.message,
        type: err.type
      }
    } else if (err instanceof DatabaseError) {
      statusCode = Response.HTTP_STATUS_CODE.InternalServerError
      payload = {
        ...payload,
        name: ClientError.ERROR_NAME.DB_OPS_ERROR,
        message: ClientError.ERROR_NAME.UNKNOWN_ERROR,
        type: ClientError.ERROR_TYPE.APPLICATION_ERROR
      }
    }

    ctx.status = statusCode
    ctx.body = {
      success: false,
      statusCode: statusCode,
      data: {},
      error: { ...payload }
    }
  } finally {
    const start = 0
    const responseTime = (Date.now() - startTime || start) + 'ms'
    const { trace, metaInfo, request, context } = ctx.state
    const logObject: LogObject = {
      traceId: trace.traceId,
      fkTraceId: trace.fkTraceId || '-',
      originalIp: trace.originalIp || '-',
      device: trace.device || '-',
      platform: trace.platform || '-',
      timestamp: trace.timestamp || '-',
      context: trace.context || context,
      ip: metaInfo.ip,
      protocol: metaInfo.protocol,
      statusCode: ctx.response.status.toString(),
      method: metaInfo.method,
      url: metaInfo.url,
      userAgent: metaInfo.userAgent,
      contentLength: ctx.response.length ? ctx.response.length.toString() : '-',
      responseTime,
      request
    }

    const logMsg = convertLogObjectToString(logObject)
    const MIN_FAILURE_STATUS = 400

    if (ctx.response.status >= MIN_FAILURE_STATUS) {
      Logger.error(logMsg)
      Logger.debug(logObject, logMsg)
    } else {
      Logger.info(logMsg)
      Logger.debug(logObject, logMsg)
    }
  }
}

const convertLogObjectToString = (logObject: LogObject) =>
  Object.keys(LOG_MSG_KEYS).reduce((acc, curr) => {
    acc += `${logObject[curr] || '-'} `
    return acc
  }, '')
