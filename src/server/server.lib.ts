import R from 'ramda'
import Koa from 'koa'
import koaCors from '@koa/cors'
import Router from 'koa-router'
import compose from 'koa-compose'
import koaHelmet from 'koa-helmet'
import koaCompress from 'koa-compress'
import { Logger } from '../logger/logger.lib'
import { ClientError } from '../error/error.lib'
import {
  convertValidatorsToPipeline,
  validateTraceMiddleware
} from '../middleware/validator.middleware'
import bodyParser from 'koa-bodyparser'
import { requestProcessor } from '../middleware/processor.middleware'
import { ClientConfig, ClientConfigConstant, Config } from '../config'
import { healthCheck, Request, Response } from '../api'
import {
  buildTraceStateFromHeadersMiddleware,
  queryParserMiddleware,
  requestFormatter,
  responseFormatter,
  setTraceStateMiddleware
} from '../middleware'
import { KoaClientAuth } from '../auth'
import { Server } from './server.interface'

const _registerAPI = <State extends Request.IBaseState, ResponseDTO>(
  api: Server.API<State, ResponseDTO>,
  resource: Server.Resource
) => {
  const { uri, requestHandler, validators, type, enableListParsing } = api
  const { authStrategy } = api
  let apiPipeline = api.pipeline

  if (!requestHandler) {
    throw new ClientError.ApplicationError(
      ClientError.ERROR_NAME.MISSING_API_HANDLER,
      Response.HTTP_STATUS_CODE.ServiceUnavailable,
      'API handler is missing, can not process request!'
    )
  }

  const { router } = resource
  const methodToInvoke = getMethodFunction(type, router).bind(router)

  let defaultPipeline: Koa.Middleware<any, any>[] = [bodyParser()]

  if (enableListParsing && enableListParsing[0] === true) {
    const [allowedFilters, allowedSorts] = enableListParsing[1]
    defaultPipeline.push(queryParserMiddleware(allowedFilters, allowedSorts))
  }

  let sanitisationPipeline: Koa.Middleware<any, any>[] =
    convertValidatorsToPipeline(validators)

  const appRole = Config.serviceConfig.AppRole

  switch (appRole[0]) {
    case ClientConfig.APP_ROLE.gateway:
      defaultPipeline = [
        ...defaultPipeline,
        setTraceStateMiddleware(appRole[1])
      ]
      break

    case ClientConfig.APP_ROLE.service: {
      defaultPipeline = [
        ...defaultPipeline,
        buildTraceStateFromHeadersMiddleware
      ]
      sanitisationPipeline = [validateTraceMiddleware, ...sanitisationPipeline]
      break
    }

    default:
      break
  }

  defaultPipeline = [...defaultPipeline, requestFormatter, requestProcessor]

  switch (authStrategy[0]) {
    case KoaClientAuth.API_AUTH_STRATEGY.ENFORCE: {
      const enforcer = authStrategy[1]
      apiPipeline = [
        KoaClientAuth.validateAuthorizationToken,
        KoaClientAuth.decodeAuthorizationToken,
        KoaClientAuth.protectAPI(enforcer),
        ...apiPipeline
      ]
      break
    }

    default:
      break
  }

  methodToInvoke(
    uri,
    compose([
      ...defaultPipeline,
      ...sanitisationPipeline,
      convertPipelineToMiddleware(apiPipeline),
      responseFormatter(requestHandler)
    ])
  )

  Logger.debug(`register API - ${type} ${resource.path}${uri}`)
  return api
}

const convertPipelineToMiddleware =
  (pipeline: Request.Pipeline) =>
  async (ctx: Koa.ParameterizedContext<any, any, any>, next: Koa.Next) => {
    let state = ctx.state || {}

    for (const middleware of pipeline) {
      try {
        state = await middleware(state, ctx)
      } catch (err) {
        Logger.error(
          `${state?.traceId || '-'} middleware execution failed - ${
            middleware.name
          }`
        )
        throw err
      }
    }

    ctx.state = {
      ...ctx.state,
      ...state
    }
    await next()
  }

const getMethodFunction = (type: Request.TYPE, router: Router) => {
  switch (type) {
    case Request.TYPE.POST:
      return router.post

    case Request.TYPE.PATCH:
      return router.patch

    case Request.TYPE.DELETE:
      return router.delete

    case Request.TYPE.PUT:
      return router.put

    default:
      return router.get
  }
}

class ClientServer implements Server.IServer {
  private koaApp = new Koa()
  private mainRouter = new Router()
  private resources: Server.Resource[] = []

  getAllResources = () => this.resources

  createResource = (resource: Omit<Server.Resource, 'router'>) => {
    const [existingResource] = this.resources.filter(
      (elm) => elm.name === resource.name || elm.path === resource.path
    )

    if (existingResource) {
      throw new ClientError.ApplicationError(
        ClientError.ERROR_NAME.RESOURCE_ALREADY_EXISTS,
        Response.HTTP_STATUS_CODE.InternalServerError,
        `resource already exists with name 
        ${resource.name} or path ${resource.path}`
      )
    }

    const router = new Router()
    this.resources.push({ ...resource, router })

    // eslint-disable-next-line no-magic-numbers
    return this.resources[this.resources.length - 1]
  }

  getResource = (name: string) => {
    const [resource] = this.resources.filter(
      (resource) => name === resource.name
    )

    if (!resource) {
      throw new ClientError.ApplicationError(
        ClientError.ERROR_NAME.INVALID_API_RESOURCE,
        Response.HTTP_STATUS_CODE.InternalServerError,
        `invalid resource access with name ${name}`
      )
    }

    return resource
  }

  mountResources = () => {
    const indexRouter = new Router()
    indexRouter.get('/health', healthCheck)

    for (const resource of Config.serviceConfig.Resources) {
      const { path, router, apis } = resource

      for (const api of apis) {
        const { enabled } = api

        if (enabled === false) {
          continue
        }

        _registerAPI(api, resource)
      }

      indexRouter.use(path, router.routes())
      Logger.debug(`mount Resource - ${path}`)
    }

    const allowedOrigins = Config.getEnv('ALLOWED_CORS_ORIGINS') || ''
    const validOrigins = allowedOrigins.split(',')

    const verifyOrigin = (ctx) => {
      const origin = ctx.headers.origin

      if (validOrigins.indexOf('*') !== R.negate(ClientConfigConstant.ONE)) {
        return '*'
      }

      if (!isOriginValid(origin)) {
        return false
      }
      return origin
    }

    const isOriginValid = (origin: string) =>
      validOrigins.indexOf(origin) !== R.negate(ClientConfigConstant.ONE)

    this.koaApp.use(koaHelmet())
    this.koaApp.use(koaCompress())
    this.koaApp.use(
      koaCors({
        origin: verifyOrigin,
        credentials: true
      })
    )
    this.mainRouter.use('/api', indexRouter.routes())
    this.koaApp.use(this.mainRouter.routes())

    return this.koaApp
  }

  startServer = () => {
    const appPort = Config.getEnv('APP_PORT')

    return new Promise<Koa<Request.IBaseState, Koa.DefaultContext>>(
      (resolve) => {
        this.koaApp.listen(appPort, () => {
          Logger.info(`service is running on ${appPort}`)
          resolve(this.koaApp)
        })
      }
    )
  }

  private _createAPI = <
    RequestState extends Request.IBaseState,
    ResponseDTO = {}
  >(
    type: Request.TYPE,
    apiDefinition: Omit<Server.API<RequestState, ResponseDTO>, 'type'>
  ): Server.API<RequestState, ResponseDTO> => {
    return {
      ...apiDefinition,
      authStrategy: apiDefinition.authStrategy,
      type,
      enabled: true
    }
  }

  get = <State extends Request.IBaseState, ResponseDTO>(
    api: Omit<Server.API<State, ResponseDTO>, 'type'>
  ) => this._createAPI(Request.TYPE.GET, api)

  post = <State extends Request.IBaseState, ResponseDTO>(
    api: Omit<Server.API<State, ResponseDTO>, 'type'>
  ) => this._createAPI(Request.TYPE.POST, api)

  put = <State extends Request.IBaseState, ResponseDTO>(
    api: Omit<Server.API<State, ResponseDTO>, 'type'>
  ) => this._createAPI(Request.TYPE.PUT, api)

  patch = <State extends Request.IBaseState, ResponseDTO>(
    api: Omit<Server.API<State, ResponseDTO>, 'type'>
  ) => this._createAPI(Request.TYPE.PATCH, api)

  delete = <State extends Request.IBaseState, ResponseDTO>(
    api: Omit<Server.API<State, ResponseDTO>, 'type'>
  ) => this._createAPI(Request.TYPE.DELETE, api)
}

export const KoaClientServer = new ClientServer()
