export namespace ClientAuth {
  export const RSA_PUBLIC_KEY_CACHE_NAME = 'RSA_PUBLIC_KEY'
  export const AUTH_TOKEN_CACHE_NAME = 'AUTH_TOKEN_CACHE'
  export enum DEFAULT_ROLES {
    SUPER_ADMIN_ROLE = 'super-admin',
    ADMIN = 'admin',
    EMPOLYEE = 'employee',
    CUSTOMER = 'customer'
  }

  export type AuthorizationToken = {
    upgraded: boolean
    accessToken: string
    expiresIn: number
    refreshExpiresIn: number
    refreshToken: string
  }

  export type TokenIntrospection = {
    exp: number
    iat: number
    jti: string
    iss: string
    aud: string
    sub: string
    typ: string
    azp: string
    session_state: string
    id: string
    name?: string
    preferred_username: string
    email: string
    email_verified: boolean
    acr: string
    'allowed-origins': string[]
    realm_access: {
      roles: string[]
    }
    resource_access: ResourceAccess
    scope: string[]
    sid: string
    client_id: string
    username: string
    active: boolean
    authorization: Authorization
  }

  type ResourceAccess = {
    [clientName: string]: {
      roles: string
    }
  } & {
    account: {
      roles: string[]
    }
  }

  type Authorization = {
    permissions: ResourcePermission[]
  }

  type ResourcePermission = {
    scopes?: string[]
    rsid: string
    rsname: string
  }
}
