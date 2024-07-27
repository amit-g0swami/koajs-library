import { Request, Response } from '../api'
import { verify, JwtPayload } from 'jsonwebtoken'
import { JwksClient } from 'jwks-rsa'
import { ClientAuth } from '../auth'
import { Config } from '../config'
import { ClientCache } from '../cache'
import { ClientError } from '../error'

const getCertUrl = (context: Request.CONTEXT) =>
  `${Config.getEnv(
    'SSO_BASE_URL'
  )}/realms/${context}/protocol/openid-connect/certs`

const getPublicKey = async (context: Request.CONTEXT) => {
  const certURL = getCertUrl(context)
  const jwksClient = new JwksClient({
    jwksUri: certURL
  })
  try {
    const publicKeyCache = ClientCache.getCacheConnectionByName(
      ClientAuth.RSA_PUBLIC_KEY_CACHE_NAME
    )
    const cacheKey = `RSA_PUBLIC_KEY_${context.toUpperCase()}`
    let publicKey = await publicKeyCache.get(cacheKey)

    if (!publicKey) {
      publicKey = (await jwksClient.getSigningKey()).getPublicKey()
      publicKeyCache.set(cacheKey, publicKey)
    }

    return publicKey
  } catch (error) {
    throw new ClientError.ControllerError(
      ClientError.ERROR_NAME.UNPROCESSABLE_REQUEST,
      Response.HTTP_STATUS_CODE.UnprocessableEntity,
      'invalid request context!'
    )
  }
}

const verifyTokenAsync = (token: string, publicKey: string) => {
  return new Promise<string | JwtPayload | undefined>((resolve, reject) => {
    verify(
      token,
      publicKey,
      {
        algorithms: ['RS256']
      },
      (err, decoded) => {
        if (err) {
          reject(err)
        }
        resolve(decoded)
      }
    )
  })
}

const getAllPermissions = (decoded: ClientAuth.TokenIntrospection) => {
  let allowedPermissions: string[] = []
  const { authorization } = decoded

  if (authorization) {
    const permissions = authorization.permissions || []
    permissions.map((perm) => {
      const { scopes } = perm
      if (scopes) {
        allowedPermissions = [...allowedPermissions, ...scopes]
      }
    })
  }

  return allowedPermissions
}

const getAllRoles = (decoded: ClientAuth.TokenIntrospection) => {
  let allowedRoles: string[] = []
  const { resource_access, realm_access } = decoded

  if (realm_access) {
    const realmRoles = realm_access.roles || []
    allowedRoles = [...allowedRoles, ...realmRoles]
  }

  if (resource_access) {
    const { account } = resource_access
    if (account) {
      const accountRoles = account.roles || []
      allowedRoles = [...allowedRoles, ...accountRoles]
    }

    for (const client in resource_access) {
      if (client in resource_access) {
        const clientRoles = resource_access[client].roles || []
        allowedRoles = [...allowedRoles, ...clientRoles]
      }
    }
  }

  return allowedRoles
}

export const decodeTokenMiddleware: Request.Middleware<
  Request.IAuthorizedState,
  Request.IDecodedState
> = async (state) => {
  // token signature is verified in authorizer middleware
  // prefer authorizationToken if set over access token
  const tokenToDecode = state.auth.authorizationToken || state.auth.accessToken
  let decoded: string | JwtPayload | undefined

  try {
    decoded = await verifyTokenAsync(
      tokenToDecode,
      await getPublicKey(state.context)
    )
  } catch (err) {
    throw new ClientError.ControllerError(
      ClientError.ERROR_NAME.UNAUTHORISED_ACCESS_TOKEN,
      Response.HTTP_STATUS_CODE.Forbidden,
      'request denied!'
    )
  }

  if (!decoded || typeof decoded === 'string') {
    throw new ClientError.ControllerError(
      ClientError.ERROR_NAME.UNAUTHORISED_ACCESS_TOKEN,
      Response.HTTP_STATUS_CODE.Forbidden,
      'request denied!'
    )
  }

  const decodedToken: Request.DecodedTokenInfo = {
    issuedAt: decoded.iat!,
    expiryAt: decoded.exp!,
    issuer: decoded.iss!,
    sessionId: decoded.sid,
    sub: decoded.sub!
  }

  return {
    ...state,
    auth: {
      ...state.auth,
      ...decodedToken
    },
    user: {
      id: decoded.id || decoded.sub,
      isActive: decoded.active
        ? decoded.active === 'true' || Boolean(decoded.active) === true
        : false,
      userId: decoded.user_id,
      name: decoded.name || decoded.preferred_username,
      username: decoded.preferred_username,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      permissions: getAllPermissions(decoded as ClientAuth.TokenIntrospection),
      roles: getAllRoles(decoded as ClientAuth.TokenIntrospection)
    }
  }
}
