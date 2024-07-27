import { ClientConfigConstant } from '../config'
import { RUtil } from '../utils'
import { QueryParser } from '../utils/parser.util'

export const queryParserMiddleware: QueryParser.Middleware =
  (allowedFilters: string[], allowedSorts: string[]) => async (ctx, next) => {
    const parsedQuery = RUtil.QueryParser.parseQueryString(ctx.querystring)
    const { filters, sorts } = parsedQuery

    for (const filter in filters) {
      if (!allowedFilters.includes(filter)) {
        delete filters[filter]
      }
    }

    for (
      let i = sorts.length - ClientConfigConstant.ONE;
      i >= ClientConfigConstant.ZERO;
      i -= ClientConfigConstant.ONE
    ) {
      if (!allowedSorts.includes(sorts[i][0])) {
        sorts.splice(i, ClientConfigConstant.ONE)
      }
    }

    ctx.state = {
      ...ctx.state,
      request: {
        ...ctx.state.request,
        query: {
          ...ctx.state.request.query,
          ...parsedQuery
        }
      }
    }

    await next()
  }
