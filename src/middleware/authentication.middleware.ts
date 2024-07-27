import { Request, Response } from '../api'
import { ClientConfigConstant } from '../config'
import { ClientError } from '../error'

export const authenticationMiddleware: Request.Middleware<
  Request.IExpectedAuthenticationState,
  Request.IAuthenticatedState
> = (state) => {
  const { request } = state
  const { authorization } = request.headers

  if (
    !authorization ||
    typeof authorization !== 'string' ||
    authorization.split(' ').length !== ClientConfigConstant.TWO ||
    authorization.split(' ')[0] !== 'Bearer'
  ) {
    throw new ClientError.ControllerError(
      ClientError.ERROR_NAME.INVALID_AUTH_TOKEN_FORMAT,
      Response.HTTP_STATUS_CODE.BadRequest,
      'auth token header valid format: Bearer <token>'
    )
  }
  const token = authorization.split(' ')[1]

  return {
    ...state,
    auth: {
      accessToken: token
    }
  }
}
