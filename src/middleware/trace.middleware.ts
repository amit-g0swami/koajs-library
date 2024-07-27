import { Request, Response } from '../api'
import Koa from 'koa'
import cleanDeep from 'clean-deep'

const getTraceId = (ctx: Request.Context<Request.IBaseState, any>) => {
  return ctx.request.headers[Request.MANDATORY_TRACE_HEADERS.TRACE_ID] as string
}

const getFkTraceId = (ctx: Request.Context<Request.IBaseState, any>) => {
  return ctx.request.headers[
    Request.OPTIONAL_TRACE_HEADERS.FK_TRACE_ID
  ] as string
}

const getContext = (ctx: Request.Context<Request.IBaseState, any>) => {
  return ctx.request.headers[
    Request.MANDATORY_TRACE_HEADERS.CONTEXT
  ] as Request.CONTEXT
}

const getDeviceId = (ctx: Request.Context<Request.IBaseState, any>) => {
  return ctx.request.headers[Request.OPTIONAL_TRACE_HEADERS.DEVICE_ID] as string
}

const getOrigIp = (ctx: Request.Context<Request.IBaseState, any>) => {
  return ctx.request.headers[
    Request.OPTIONAL_TRACE_HEADERS.ORIGINAL_IP
  ] as string
}

const getOrigTimestamp = (ctx: Request.Context<Request.IBaseState, any>) => {
  return ctx.request.headers[
    Request.OPTIONAL_TRACE_HEADERS.ORIG_TIMESTAMP
  ] as string
}

const getPlatform = (ctx: Request.Context<Request.IBaseState, any>) => {
  return ctx.request.headers[
    Request.OPTIONAL_TRACE_HEADERS.PLATFORM
  ] as Request.PLATFORM
}

const geTraceStateFromHeaders = (
  ctx: Request.Context<Request.IBaseState, Response.BaseDataDTO>
) =>
  cleanDeep({
    traceId: getTraceId(ctx),
    fkTraceId: getFkTraceId(ctx),
    originalIp: getOrigIp(ctx),
    platform: getPlatform(ctx),
    timestamp: getOrigTimestamp(ctx),
    device: getDeviceId(ctx),
    context: getContext(ctx)
  }) as Request.ITraceInfo

export const traceStateToHeaders: Request.TraceStateToHeaderTransformer = ({
  traceId,
  fkTraceId,
  context,
  device,
  originalIp,
  timestamp,
  platform
}) => {
  return cleanDeep({
    'x-trace-id': traceId,
    'fk-trace-id': fkTraceId,
    'x-context': context,
    'x-device-id': device,
    'x-orig-ip': originalIp,
    'x-orig-timestamp': timestamp,
    'x-platform': platform
  }) as Request.TraceHeaders
}

export const traceHeadersToState: Request.TraceHeaderToStateTransformer = ({
  'x-trace-id': traceId,
  'fk-trace-id': fkTraceId,
  'x-context': context,
  'x-device-id': device,
  'x-orig-ip': originalIp,
  'x-orig-timestamp': timestamp,
  'x-platform': platform
}) => {
  return cleanDeep({
    traceId,
    fkTraceId,
    device,
    originalIp,
    timestamp,
    context: context as Request.CONTEXT,
    platform: platform as Request.PLATFORM
  }) as Request.ITraceInfo
}

export const setTraceStateMiddleware =
  (setter: Request.TraceHeaderSetter) =>
  async (
    ctx: Request.Context<Request.IBaseState, Response.BaseDataDTO>,
    next: Koa.Next
  ) => {
    ctx.state = {
      ...(ctx.state || {}),
      trace: {
        ...(ctx.state.trace || {}),
        ...geTraceStateFromHeaders(ctx),
        ...traceHeadersToState(await setter())
      }
    }

    await next()
  }

export const buildTraceStateFromHeadersMiddleware = async (
  ctx: Request.Context<Request.IBaseState, Response.BaseDataDTO>,
  next: Koa.Next
) => {
  ctx.state = {
    ...(ctx.state || {}),
    trace: {
      ...(ctx.state.trace || {}),
      ...geTraceStateFromHeaders(ctx)
    }
  }

  await next()
}
