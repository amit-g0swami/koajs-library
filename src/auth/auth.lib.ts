import { Request } from '../api'
import {
  authenticationMiddleware,
  authorizationMiddleware,
  decodeTokenMiddleware,
  protectAPIMiddleware
} from '../middleware'
import { ClientAuth } from './auth.interface'

export namespace KoaClientAuth {
  export enum API_AUTH_STRATEGY {
    NONE = 'NONE',
    ENFORCE = 'ENFORCE'
  }

  export enum STRATEGY_ENFORCE_POLICY {
    ROLE = 'ROLE',
    PERMISSION = 'PERMISSION'
  }

  export enum STRATEGY_ENFORCE_MODE {
    ALL = 'ALL',
    ANY = 'ANY'
  }

  export type Enforcer = (
    state: Request.IDecodedState
  ) => boolean | Promise<boolean>

  type AuthNoneStrategy = [API_AUTH_STRATEGY.NONE]
  type AuthEnforceStrategy = [API_AUTH_STRATEGY.ENFORCE, Enforcer]

  export type APIAuthStrategy = AuthNoneStrategy | AuthEnforceStrategy

  export const validateAccessToken = authenticationMiddleware
  export const validateAuthorizationToken = authenticationMiddleware
  export const authorizeAccessToken = authorizationMiddleware
  export const decodeAuthorizationToken = decodeTokenMiddleware
  export const protectAPI = protectAPIMiddleware

  /**
   * check if user has given permission assigned
   * @param user
   * @param permissionName
   * @returns
   */
  export const hasPermission = (
    user: Request.IDecodedState['user'],
    permissionName: string
  ) => {
    let canAccess = true

    const { permissions } = user
    canAccess = permissions.includes(permissionName)

    return canAccess
  }

  /**
   * check if user has given role assigned
   * @param user
   * @param permissionName
   * @returns
   */
  export const hasRole = (
    user: Request.IDecodedState['user'],
    permissionName: string
  ) => {
    let canAccess = true

    const { roles } = user
    canAccess = roles.includes(permissionName)

    return canAccess
  }

  /**
   * check if user has super-admin role
   * this role is assumed to have all resource access
   * @param user
   * @returns
   */

  export const isSuperAdmin = (user: Request.IDecodedState['user']) => {
    let canAccess = true

    const { roles } = user
    canAccess = roles.includes(ClientAuth.DEFAULT_ROLES.SUPER_ADMIN_ROLE)

    return canAccess
  }

  /**
   * check if user is admin
   * this role will have specified permissions
   * can be used for adminstrative purposes and also protects super-admin access
   * @param user
   * @returns
   */

  export const isAdmin = (user: Request.IDecodedState['user']) => {
    let canAccess = true

    const { roles } = user
    canAccess = roles.includes(ClientAuth.DEFAULT_ROLES.ADMIN)

    return canAccess
  }

  /**
   * check if given user has employee role
   * @param user
   * @returns
   */

  export const isEmployee = (user: Request.IDecodedState['user']) => {
    let canAccess = true

    const { roles } = user
    canAccess = roles.includes(ClientAuth.DEFAULT_ROLES.EMPOLYEE)

    return canAccess
  }

  /**
   * check if given user is customer
   * @param user
   * @returns
   */

  export const isCustomer = (user: Request.IDecodedState['user']) => {
    let canAccess = true

    const { roles } = user
    canAccess = roles.includes(ClientAuth.DEFAULT_ROLES.CUSTOMER)

    return canAccess
  }

  /**
   * check if user email is verified
   * @param user
   * @returns
   */

  export const isEmailVerified = (user: Request.IDecodedState['user']) =>
    user.emailVerified === true

  /**
   * check if user is active
   * @param user
   * @returns
   */

  export const isActive = (user: Request.IDecodedState['user']) =>
    user.isActive === true
}
