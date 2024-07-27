import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { Request, Response } from '../api/api.interface'
import { traceStateToHeaders } from '../middleware'
import { Logger } from '../logger'
import { ClientError } from '../error'

const instance = axios.create({
  timeout: 5000
})

const invokeServiceMeshEndpoint = async (
  state: Request.IBaseState,
  type: Request.TYPE,
  opts: AxiosRequestConfig
) => {
  const { auth, trace } = state
  try {
    opts = {
      ...(opts || {}),
      data: {
        ...(opts.data || {})
      },
      headers: {
        Authorization: auth
          ? `Bearer ${auth.authorizationToken || auth.accessToken}`
          : null,
        ...traceStateToHeaders(trace),
        ...(opts.headers || {})
      },
      params: {
        ...(opts.params || {})
      }
    }

    const res = await instance({
      method: type,
      ...opts
    })

    const { statusCode, success, data, error } = res.data as Required<
      Response.BaseDTO<any>
    >

    if (error && success === false) {
      throw new ClientError.BaseError(
        error.name,
        statusCode,
        error.message,
        error.type
      )
    }

    return data
  } catch (error: any) {
    Logger.error(`RPC Error: ${error.message}`)
    Logger.debug(error.stack)
    if (error instanceof AxiosError) {
      const {
        statusCode,
        success,
        error: apiError
      } = error.response?.data as Required<Response.BaseDTO<any>>

      if (apiError && success === false) {
        throw new ClientError.BaseError(
          apiError.name,
          statusCode,
          apiError.message,
          apiError.type
        )
      } else {
        throw new ClientError.RPCError(
          ClientError.ERROR_NAME.MESH_INVOCATION_FAILED,
          error.response?.status || Response.HTTP_STATUS_CODE.BadRequest,
          error.message
        )
      }
    } else {
      throw new ClientError.RPCError(
        ClientError.ERROR_NAME.UNKNOWN_ERROR,
        Response.HTTP_STATUS_CODE.BadRequest,
        error.message
      )
    }
  }
}

export namespace RMesh {
  export const get = (state: Request.IBaseState, opts: AxiosRequestConfig) =>
    invokeServiceMeshEndpoint(state, Request.TYPE.GET, opts)
  export const post = (state: Request.IBaseState, opts: AxiosRequestConfig) =>
    invokeServiceMeshEndpoint(state, Request.TYPE.POST, opts)
  export const patch = (state: Request.IBaseState, opts: AxiosRequestConfig) =>
    invokeServiceMeshEndpoint(state, Request.TYPE.PATCH, opts)
  export const del = (state: Request.IBaseState, opts: AxiosRequestConfig) =>
    invokeServiceMeshEndpoint(state, Request.TYPE.DELETE, opts)
  export const put = (state: Request.IBaseState, opts: AxiosRequestConfig) =>
    invokeServiceMeshEndpoint(state, Request.TYPE.PUT, opts)
}
