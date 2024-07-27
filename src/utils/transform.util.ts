export namespace Transform {
  export const snakeToCamel = (str: string): string =>
    str
      .toString()
      .replace(/([_-][a-z])/gi, (word: string) =>
        word.toUpperCase().replace('-', '').replace('_', '')
      )

  export const camelToSnake = (str: string): string =>
    str.replace(/([A-Z])/g, (word: string) => `_${word.toLowerCase()}`)

  export const camelizeKeys = (obj: Object) => {
    if (Array.isArray(obj)) {
      return obj.map((v) => camelizeKeys(v))
    } else if (obj !== null && obj.constructor === Object) {
      return Object.keys(obj).reduce(
        (result, key) => ({
          ...result,
          [snakeToCamel(key)]: camelizeKeys(obj[key])
        }),
        {}
      )
    }
    return obj
  }

  export const snakifyKeys = (obj: Object) => {
    if (Array.isArray(obj)) {
      return obj.map((v) => camelizeKeys(v))
    } else if (obj !== null && obj.constructor === Object) {
      return Object.keys(obj).reduce(
        (result, key) => ({
          ...result,
          [camelToSnake(key)]: camelizeKeys(obj[key])
        }),
        {}
      )
    }
    return obj
  }
}
