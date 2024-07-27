import Koa from 'koa'
import { Request, Response } from '../api'

export const responseFormatter =
  (handler: Request.Handler<any, any>) =>
  async (ctx: Request.Context<Request.IBaseState, Response.BaseDataDTO>) => {
    const { success, statusCode, data, error } = (await handler(
      ctx.state,
      ctx
    )) as Response.BaseDTO<Response.BaseDataDTO>

    ctx.status = statusCode || Response.HTTP_STATUS_CODE.Ok
    ctx.body = {
      requestId: ctx.state.trace.traceId,
      success: error ? false : Boolean(success) || true,
      statusCode,
      data,
      error
    }
  }

export const requestFormatter = async <
  State extends Request.IBaseState,
  DataDTO
>(
  ctx: Request.Context<State, DataDTO>,
  next: Koa.Next
) => {
  const { trace } = ctx.state
  const baseState: Omit<Request.IBaseState, 'trace'> = {
    metaInfo: {
      method: Request.TYPE[ctx.method],
      url: ctx.request.originalUrl || '-',
      ip: ctx.request.ip || '-',
      userAgent: ctx.request.headers['user-agent'] || '-',
      remoteAddress: ctx.request.socket.remoteAddress || '-',
      remotePort: ctx.request.socket.remotePort?.toString() || '-',
      remoteFamily: ctx.request.socket.remoteFamily || '-',
      protocol: ctx.request.protocol || '-'
    },
    context: trace.context,
    request: {
      body: {
        ...(ctx.request.body || {})
      },
      params: {
        ...(ctx.params || {})
      },
      query: {
        ...(ctx.query || {})
      },
      headers: {
        ...(ctx.request.headers || {})
      },
      cookies: {
        ...{}
      }
    }
  }

  ctx.state = {
    ...ctx.state,
    ...baseState
  }

  await next()
}
