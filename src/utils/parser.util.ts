import { ClientConfigConstant } from '../config'
import Koa from 'koa'

export namespace QueryParser {
  export type Middleware = (
    allowedFilters: string[],
    allowedSorts: string[]
  ) => Koa.Middleware<Koa.DefaultState, Koa.DefaultContext>

  export enum FILTER_TYPE {
    string = 'string',
    list_of_strings = 'list_of_strings',
    list_of_numbers = 'list_of_numbers',
    regex = 'regex',
    date = 'date',
    date_range = 'date_range',
    date_time = 'date_time',
    date_time_range = 'date_time_range',
    number = 'number',
    numeric_range = 'numeric_range',
    boolean = 'boolean'
  }

  export enum SORT_TYPE {
    desc = 'desc',
    asc = 'asc'
  }

  export type Pagination = {
    limit?: number
    page?: number
    lastId?: string
  }

  export type NumRange = { min: number; max: number }
  export type DateRange = { start: string; end: string }

  export type FilterType =
    | string
    | string[]
    | number
    | number[]
    | RegExp
    | NumRange
    | DateRange
    | boolean

  export type ParsedFilter = Record<string, FilterType>
  export type ParsedSort = Array<[string, SORT_TYPE]>
  export type ParsedPagination = Required<Pick<Pagination, 'limit' | 'page'>> &
    Pick<Pagination, 'lastId'>

  export type ParsedQuery<Filters = ParsedFilter> = {
    filters: Filters
    sorts: ParsedSort
    pagination: ParsedPagination
  }

  export const DEFAULT_PAGE_SIZE = 50
  export const DEFAULT_PAGE_NUMBER = 0
  export const MAX_PAGE_SIZE = 100
  export const MAX_RECORD_FETCH = 1000

  const getFilterType = (value: string): FILTER_TYPE => {
    const regexCheck = /^\/.*\/$/
    const dateCheck = /^\d{4}-\d{2}-\d{2}$/
    const dateTimeCheckWithTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{3}Z$/
    const dateTimeCheckWithoutTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
    const numberCheck = /^-?\d*\.?\d+$/
    const numericRangeCheck = /^\d+-\d+$/
    const dateRangeCheck = /^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}$/
    const dateTimeRangeCheckWithTimezone =
      // eslint-disable-next-line max-len
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/gm
    const dateTimeRangeCheckWithoutTimezone =
      // eslint-disable-next-line max-len
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/gm
    const booleanCheck = /^(true|false)$/
    const listOfNumberCheck = /^\d+(?:\|\d+$)*/

    if (regexCheck.test(value)) {
      return FILTER_TYPE.regex
    }
    if (dateCheck.test(value)) {
      return FILTER_TYPE.date
    }
    if (
      dateTimeCheckWithTimezone.test(value) ||
      dateTimeCheckWithoutTimezone.test(value)
    ) {
      return FILTER_TYPE.date_time
    }
    if (numberCheck.test(value)) {
      return FILTER_TYPE.number
    }
    if (numericRangeCheck.test(value)) {
      return FILTER_TYPE.numeric_range
    }
    if (dateRangeCheck.test(value)) {
      return FILTER_TYPE.date_range
    }
    if (
      dateTimeRangeCheckWithTimezone.test(value) ||
      dateTimeRangeCheckWithoutTimezone.test(value)
    ) {
      return FILTER_TYPE.date_time_range
    }
    if (booleanCheck.test(value)) {
      return FILTER_TYPE.boolean
    }
    if (
      value.indexOf('|') !== -ClientConfigConstant.ONE &&
      /^.*|.*/.test(value)
    ) {
      if (listOfNumberCheck.test(value)) {
        return FILTER_TYPE.list_of_numbers
      }
      return FILTER_TYPE.list_of_strings
    }
    return FILTER_TYPE.string
  }

  /**
   * parse the passed filters string into object
   * @param filters
   * @returns
   */
  const parseFilters = (filterQueryString: string): ParsedFilter => {
    const parsedFilters: ParsedFilter = {}
    const filterSegments = filterQueryString.split(',')

    for (const segment of filterSegments) {
      const key = segment.substring(
        ClientConfigConstant.ZERO,
        segment.indexOf(':')
      )
      const value = segment.substring(
        segment.indexOf(':') + ClientConfigConstant.ONE
      )

      if (!key || !value) {
        continue
      }

      const filterType = getFilterType(value)
      switch (filterType) {
        case FILTER_TYPE.string:
        case FILTER_TYPE.regex:
          parsedFilters[key] = value
          break
        case FILTER_TYPE.boolean:
          parsedFilters[key] = value === 'true'
          break
        case FILTER_TYPE.list_of_strings:
          parsedFilters[key] = value.split('|')
          break
        case FILTER_TYPE.list_of_numbers:
          parsedFilters[key] = value.split('|').map(Number)
          break
        case FILTER_TYPE.number:
          parsedFilters[key] = Number(value)
          break
        case FILTER_TYPE.numeric_range:
          {
            const [min, max] = value.split('-').map(Number)
            parsedFilters[key] = { min, max }
          }
          break
        case FILTER_TYPE.date:
          parsedFilters[key] = new Date(value).toISOString().split('T')[0]
          break
        case FILTER_TYPE.date_time:
          parsedFilters[key] = new Date(value).toISOString()
          break
        case FILTER_TYPE.date_range:
          {
            const start = value.substring(
              ClientConfigConstant.ZERO,
              ClientConfigConstant.TEN
            )
            const end = value.substring(
              ClientConfigConstant.TEN + ClientConfigConstant.ONE
            )
            parsedFilters[key] = { start, end }
          }
          break
        case FILTER_TYPE.date_time_range:
          {
            const start = value.substring(
              ClientConfigConstant.ZERO,
              // eslint-disable-next-line no-mixed-operators
              ClientConfigConstant.TEN * ClientConfigConstant.TWO +
                ClientConfigConstant.FOUR
            )
            const end = value.substring(
              // eslint-disable-next-line no-mixed-operators
              ClientConfigConstant.TEN * ClientConfigConstant.TWO +
                ClientConfigConstant.FOUR +
                ClientConfigConstant.ONE
            )
            parsedFilters[key] = { start, end }
          }
          break
        default:
          parsedFilters[key] = value
      }
    }

    return parsedFilters
  }

  /**
   * parse sorts
   * @param sorts
   * @returns
   */
  const parseSorts = (sorts: string): ParsedSort => {
    const sortArray: ParsedSort = []
    if (!sorts) {
      return sortArray
    }

    sorts.split(',').forEach((sort) => {
      const [key, value] = sort.split(':')

      if (key && Object.values(SORT_TYPE).includes(SORT_TYPE[value])) {
        sortArray.push([key, SORT_TYPE[value]])
      }
    })

    return sortArray
  }

  /**
   * parse pagination
   * @param params
   * @returns
   */
  const parsePagination = (params: URLSearchParams): ParsedPagination => {
    const queryPage = Number(params.get('page'))
    const queryLimit = Number(params.get('limit'))

    const pagination: ParsedPagination = {
      limit: queryLimit,
      page: queryPage
    }

    const lastId = params.get('lastId')
    if (!isNaN(queryLimit) && queryLimit !== ClientConfigConstant.ZERO) {
      pagination.limit = queryLimit
    } else {
      pagination.limit = DEFAULT_PAGE_SIZE
    }

    if (lastId) {
      pagination.lastId = lastId
    } else if (!isNaN(queryPage)) {
      pagination.page = queryPage
    } else {
      pagination.page = DEFAULT_PAGE_NUMBER
    }

    const { limit, page } = pagination
    if (limit && page) {
      if (limit > MAX_PAGE_SIZE) {
        pagination.limit = MAX_PAGE_SIZE
      }

      if (
        // eslint-disable-next-line no-mixed-operators
        page * DEFAULT_PAGE_SIZE + limit >
        MAX_RECORD_FETCH
      ) {
        pagination.limit = DEFAULT_PAGE_SIZE
        pagination.page = DEFAULT_PAGE_NUMBER
      }
    }

    return pagination
  }

  /**
   * parse given query string
   * @param queryString
   * @returns
   */

  export const parseQueryString = (queryString: string): ParsedQuery => {
    const params = new URLSearchParams(decodeURIComponent(queryString))

    const filters = parseFilters(params.get('filters') || '')
    const sorts = parseSorts(params.get('sorts') || '')
    const pagination = parsePagination(params)

    return { filters, sorts, pagination }
  }
}
