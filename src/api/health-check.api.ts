import Koa from 'koa'
import { Logger } from '../logger'

export const healthCheck = (ctx: Koa.Context) => {
  Logger.info('health check: service is up!')
  ctx.body = {}
}
