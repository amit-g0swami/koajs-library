import Koa from 'koa'
import Joi, { Schema as JoiSchema } from 'joi'
import { validate } from 'uuid'
import { ClientError } from '../error'
import { IncomingHttpHeaders } from 'http'

export namespace Request {
  export enum PLATFORM {
    ios = 'ios',
    android = 'android',
    web = 'web',
    other = 'other'
  }

  export enum CONTEXT {
    dashboard = 'dashboard',
    web = 'web',
    app = 'app',
    external = 'external',
    programmatic = 'programmatic',
    other = 'other'
  }

  export enum TYPE {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE'
  }

  export const BASE_STATE_SCHEMA = Joi.object<Request.IBaseState, true>({
    trace: Joi.object(),
    metaInfo: Joi.object({
      method: Joi.string()
        .valid(...Object.values(TYPE))
        .required(),
      url: Joi.string().required(),
      ip: Joi.string().default('-'),
      remoteAddress: Joi.string().default('-'),
      remotePort: Joi.string().default('-'),
      remoteFamily: Joi.string().default('-'),
      protocol: Joi.string().required(),
      userAgent: Joi.string().required()
    }).required(),
    context: Joi.string()
      .valid(...Object.values(CONTEXT))
      .required(),
    request: Joi.object()
  })
}

export namespace Request {
  export type BasePayload = any & {
    [key: string]: any
  }

  type BaseState = Koa.DefaultState
  type BaseContext = Koa.DefaultContext

  interface IBodyPayload extends BasePayload {}
  interface IParamsPayload extends BasePayload {}
  interface IQueryPayload extends BasePayload {}
  interface IHeadersPayload extends BasePayload {}
  interface ICookiesPayload extends BasePayload {}

  interface IBasePayload<
    Body extends IBodyPayload = BasePayload,
    Params extends IParamsPayload = BasePayload,
    Query extends IQueryPayload = BasePayload,
    Headers extends IHeadersPayload = BasePayload,
    Cookies extends ICookiesPayload = BasePayload
  > {
    body: Body
    params: Params
    query: Query
    headers: Headers
    cookies: Cookies
  }

  interface IStateMetaInfo {
    method: Request.TYPE
    url: string
    ip: string
    remoteAddress: string
    remotePort: string
    remoteFamily: string
    protocol: string
    userAgent: string
  }

  export interface ITraceInfo {
    traceId: string
    context: Request.CONTEXT
    platform?: Request.PLATFORM
    timestamp?: string
    originalIp?: string
    fkTraceId?: string
    device?: string
  }

  export interface IBaseState<
    Body extends IBodyPayload = BasePayload,
    Params extends IParamsPayload = BasePayload,
    Query extends IQueryPayload = BasePayload,
    Headers extends IHeadersPayload = BasePayload,
    Cookies extends ICookiesPayload = BasePayload
  > extends BaseState {
    trace: ITraceInfo
    context: Request.CONTEXT
    metaInfo: IStateMetaInfo
    request: IBasePayload<Body, Params, Query, Headers, Cookies>
  }

  export type DefaultGatewayState = {
    context: Request.CONTEXT
    trace: ITraceInfo
  }

  export type Context<
    State = BaseState,
    DataDTO = Response.BaseDataDTO
  > = Koa.ParameterizedContext<State, BaseContext, Response.BaseDTO<DataDTO>>

  export type Handler<State = BaseState, DataDTO = Response.BaseDataDTO> = (
    state: State,
    ctx: Context<State, DataDTO>
  ) => Response.BaseDTO<DataDTO> | Promise<Response.BaseDTO<DataDTO>>

  export type Middleware<CurrentState = any, NewState = any> = (
    state: CurrentState,
    ctx: Context<CurrentState, NewState>
  ) => NewState | Promise<NewState>

  export type Pipeline = Middleware<any, any>[]
}

export namespace Response {
  export type BaseDataDTO = any

  export enum HTTP_STATUS_CODE {
    // eslint-disable-next-line no-magic-numbers
    BadRequest = 400,
    // eslint-disable-next-line no-magic-numbers
    Unauthorized = 401,
    // eslint-disable-next-line no-magic-numbers
    Forbidden = 403,
    // eslint-disable-next-line no-magic-numbers
    NotFound = 404,
    // eslint-disable-next-line no-magic-numbers
    UnprocessableEntity = 422,
    // eslint-disable-next-line no-magic-numbers
    InternalServerError = 500,
    // eslint-disable-next-line no-magic-numbers
    ServiceUnavailable = 503,
    // eslint-disable-next-line no-magic-numbers
    GatewayTimeout = 504,
    // eslint-disable-next-line no-magic-numbers
    Ok = 200,
    // eslint-disable-next-line no-magic-numbers
    Created = 201,
    // eslint-disable-next-line no-magic-numbers
    Updated = 200,
    // eslint-disable-next-line no-magic-numbers
    Conflict = 409
  }

  export type BaseDTO<DataDTO extends BaseDataDTO> = {
    requestId?: string
    success?: boolean
    statusCode?: HTTP_STATUS_CODE
    data: DataDTO
    error: ClientError.IServiceError | null
  }
}

export namespace Request {
  export namespace Validation {
    export enum TYPE {
      BODY = 'BODY',
      PARAMS = 'PARAMS',
      QUERY = 'QUERY',
      HEADERS = 'HEADERS',
      COOKIE = 'COOKIE'
    }

    export type Validator<
      BodySchema = {},
      ParamsSchema = {},
      QuerySchema = {},
      HeadersSchema = {},
      CookiesSchema = {}
    > = {
      BODY?: JoiSchema<BodySchema>
      PARAMS?: JoiSchema<ParamsSchema>
      QUERY?: JoiSchema<QuerySchema>
      HEADERS?: JoiSchema<HeadersSchema>
      COOKIE?: JoiSchema<CookiesSchema>
    }
  }
}

export namespace Request {
  type AuthenticationHeader = {
    authorization?: string
  }

  type AuthenticationInfo = {
    accessToken: string
  }

  type AuthorizationInfo = AuthenticationInfo & {
    authorizationToken: string
  }

  type AuthenticatedUser = {
    id: string
    name: string
    email: string
    isActive: boolean
    username: string
    emailVerified: boolean
  }

  type AuthorizedUser = AuthenticatedUser & {
    userId: number
    permissions: string[]
    roles: string[]
  }

  export interface IExpectedAuthenticationState
    extends Request.IBaseState<
      Request.BasePayload,
      Request.BasePayload,
      Request.BasePayload,
      AuthenticationHeader
    > {}

  export interface IExpectedAuthorizationState extends IAuthenticatedState {}

  export interface IAuthenticatedState<
    Body extends Request.BasePayload = Request.BasePayload,
    Params extends Request.BasePayload = Request.BasePayload,
    Query extends Request.BasePayload = Request.BasePayload,
    Headers extends Request.BasePayload = Request.BasePayload,
    Cookies extends Request.BasePayload = Request.BasePayload
  > extends Request.IBaseState<Body, Params, Query, Headers, Cookies> {
    auth: AuthenticationInfo
  }

  export interface IAuthorizedState<
    Body extends Request.BasePayload = {},
    Params extends Request.BasePayload = {},
    Query extends Request.BasePayload = {},
    Headers extends Request.BasePayload = {},
    Cookies extends Request.BasePayload = {}
  > extends IAuthenticatedState<Body, Params, Query, Headers, Cookies> {
    auth: AuthorizationInfo
  }

  export type DecodedTokenInfo = {
    sub: string
    issuer: string
    issuedAt: number
    expiryAt: number
    sessionId: string
  }

  export interface IDecodedState<
    Body extends Request.BasePayload = Request.BasePayload,
    Params extends Request.BasePayload = Request.BasePayload,
    Query extends Request.BasePayload = Request.BasePayload,
    Headers extends Request.BasePayload = Request.BasePayload,
    Cookies extends Request.BasePayload = Request.BasePayload
  > extends IAuthorizedState<Body, Params, Query, Headers, Cookies> {
    auth: AuthorizationInfo & DecodedTokenInfo
    user: AuthorizedUser
  }
}

export namespace Request {
  export enum MANDATORY_TRACE_HEADERS {
    TRACE_ID = 'x-trace-id',
    CONTEXT = 'x-context'
  }

  export enum OPTIONAL_TRACE_HEADERS {
    FK_TRACE_ID = 'fk-trace-id',
    ORIGINAL_IP = 'x-orig-ip',
    PLATFORM = 'x-platform',
    ORIG_TIMESTAMP = 'x-orig-timestamp',
    DEVICE_ID = 'x-device-id'
  }

  export type MandatoryTraceHeaders = {
    [header in MANDATORY_TRACE_HEADERS]: string
  }

  export type OptionalTraceHeaders = {
    [header in OPTIONAL_TRACE_HEADERS]: string
  }

  export type TraceHeaders = MandatoryTraceHeaders &
    Partial<OptionalTraceHeaders>

  export type DefaultHeaders = TraceHeaders & IncomingHttpHeaders
  export type TraceHeaderSetter = () => Promise<TraceHeaders> | TraceHeaders

  export type TraceStateToHeaderTransformer = (
    traceState: Request.ITraceInfo
  ) => TraceHeaders

  export type TraceHeaderToStateTransformer = (
    traceHeaders: DefaultHeaders | TraceHeaders
  ) => Request.ITraceInfo

  export const TRACE_STATE_SCHEMA = Joi.object<Request.ITraceInfo, true>({
    traceId: Joi.string()
      .required()
      .custom((value, helper) => {
        if (!validate(value)) {
          return helper.error('any.invalid')
        }
        return value
      }),
    context: Joi.string().required(),
    platform: Joi.string().valid(...Object.values(Request.PLATFORM)),
    timestamp: Joi.string(),
    fkTraceId: Joi.string(),
    originalIp: Joi.string(),
    device: Joi.string()
  })
}

export namespace Response {
  export type ListDTO<T> = {
    list: T[]
    page: number
    limit: number
    total?: number
    hasMore?: boolean
  }
}
