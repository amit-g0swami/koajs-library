import { Transform as RT } from './transform.util'
import { QueryParser as RQP } from './parser.util'

export * from './transform.util'
export * from './parser.util'

export namespace RUtil {
  export const Transform = RT
  export const QueryParser = RQP
}
