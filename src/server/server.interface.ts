import Router from 'koa-router'
import { Request, Response } from '../api'
import { KoaClientAuth } from '../auth'

export namespace Server {
  export type Resource = {
    name: string
    path: string
    router: Router
    apis: API<any, any>[]
  }

  type AllowedFilters = Array<string>
  type AllowedSorts = Array<string>
  type ListQueryParserArgs = [AllowedFilters, AllowedSorts]

  export type API<
    State extends Request.IBaseState,
    DataDTO extends Response.BaseDataDTO
  > = {
    uri: string
    type: Request.TYPE
    pipeline: Request.Pipeline
    authStrategy: KoaClientAuth.APIAuthStrategy
    requestHandler: Request.Handler<State, DataDTO>
    validators: Request.Validation.Validator<
      State['request']['body'],
      State['request']['params'],
      State['request']['query'],
      State['request']['headers'],
      State['request']['cookies']
    >
    enabled?: boolean
    enableListParsing?: false | [true, ListQueryParserArgs]
  }

  export interface IServer {
    getAllResources: () => Resource[]
    createResource: (resource: Omit<Resource, 'router'>) => Resource
    getResource: (name: string) => Resource

    get: <State extends Request.IBaseState, ResponseDTO>(
      api: Omit<API<State, ResponseDTO>, 'type'>
    ) => API<State, ResponseDTO>

    post: <State extends Request.IBaseState, ResponseDTO>(
      api: Omit<API<State, ResponseDTO>, 'type'>
    ) => API<State, ResponseDTO>

    put: <State extends Request.IBaseState, ResponseDTO>(
      api: Omit<API<State, ResponseDTO>, 'type'>
    ) => API<State, ResponseDTO>

    delete: <State extends Request.IBaseState, ResponseDTO>(
      api: Omit<API<State, ResponseDTO>, 'type'>
    ) => API<State, ResponseDTO>

    patch: <State extends Request.IBaseState, ResponseDTO>(
      api: Omit<API<State, ResponseDTO>, 'type'>
    ) => API<State, ResponseDTO>
  }
}
