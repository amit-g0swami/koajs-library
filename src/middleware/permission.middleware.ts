import { Request, Response } from '../api'
import { KoaClientAuth } from '../auth'
import { ClientConfigConstant } from '../config'
import { ClientError } from '../error'

export const protectAPIMiddleware =
  (
    enforcer: KoaClientAuth.Enforcer
  ): Request.Middleware<Request.IDecodedState, Request.IDecodedState> =>
  async (state) => {
    let canAccess = false
    let isTokenActive = true

    const { user, auth } = state
    const { emailVerified, isActive } = user

    if (auth.expiryAt < Date.now() / ClientConfigConstant.THOUSAND) {
      isTokenActive = false
    }

    if (emailVerified !== true || isActive !== true) {
      isTokenActive = false
    }

    try {
      canAccess = isTokenActive && (await enforcer(state))
    } catch (err) {
      throw new ClientError.ControllerError(
        ClientError.ERROR_NAME.UNAUTHORISED_ACCESS_TOKEN,
        Response.HTTP_STATUS_CODE.Forbidden,
        'user enforcer permission denied!'
      )
    }

    if (canAccess === false) {
      throw new ClientError.ControllerError(
        ClientError.ERROR_NAME.UNAUTHORISED_ACCESS_TOKEN,
        Response.HTTP_STATUS_CODE.Forbidden,
        'user does not have enough permission!'
      )
    }

    return state
  }
