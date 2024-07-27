import { Request, Response } from '../api'
import { ClientAuth } from '../auth'
import { ClientCache } from '../cache'
import { ClientConfigConstant, Config } from '../config'
import { ClientError } from '../error'
import { RMesh } from '../network'

const getAuthorizationToken =
  (state: Request.IAuthenticatedState) => async () => {
    const clientId = Config.getEnv('SSO_CLIENT_ID')
    const clientSecret = Config.getEnv('SSO_CLIENT_SECRET')

    const res = await RMesh.post(state, {
      baseURL: Config.getEnv('AUTH_SERVICE_URL'),
      url: '/auth/exchange-token',
      data: {
        clientId,
        clientSecret
      }
    })

    return res.accessToken
  }

export const authorizationMiddleware: Request.Middleware<
  Request.IAuthenticatedState,
  Request.IAuthorizedState
> = async (state) => {
  const { accessToken } = state.auth
  if (!accessToken) {
    throw new ClientError.ControllerError(
      ClientError.ERROR_NAME.INVALID_ACCESS_TOKEN,
      Response.HTTP_STATUS_CODE.Unauthorized,
      'invalid authentication state!'
    )
  }

  const authTokenCache = ClientCache.getCacheConnectionByName(
    ClientAuth.AUTH_TOKEN_CACHE_NAME
  )
  const expirationTime =
    ClientConfigConstant.SIX *
    ClientConfigConstant.THREE *
    ClientConfigConstant.HUNDRED // half an hour in seconds

  const authorizationToken = await authTokenCache.get(
    accessToken,
    getAuthorizationToken(state),
    {
      EX: expirationTime
    }
  )

  if (!authorizationToken) {
    throw new ClientError.ControllerError(
      ClientError.ERROR_NAME.INVALID_ACCESS_TOKEN,
      Response.HTTP_STATUS_CODE.Forbidden,
      'token does not have required permissions!'
    )
  }

  return {
    ...state,
    auth: {
      ...state.auth,
      authorizationToken
    }
  }
}
