import Koa from 'koa'
import Joi from 'joi'
import { ClientError } from '../error'
import { Request, Response } from '../api'

const validator =
  <ObjSchema>(
    type: Request.Validation.TYPE,
    schema: Joi.ObjectSchema<ObjSchema>
  ) =>
  async (
    ctx: Request.Context<Request.IBaseState, Response.BaseDataDTO>,
    next: Koa.Next
  ) => {
    try {
      switch (type) {
        case Request.Validation.TYPE.QUERY:
          await schema.validateAsync(ctx.state.request.query)
          break
        case Request.Validation.TYPE.PARAMS:
          await schema.validateAsync(ctx.state.request.params)
          break
        case Request.Validation.TYPE.BODY:
          await schema.validateAsync(ctx.state.request.body)
          break
        case Request.Validation.TYPE.HEADERS:
          await schema.validateAsync(ctx.state.request.headers)
          break
        case Request.Validation.TYPE.COOKIE:
          await schema.validateAsync(ctx.state.request.cookies)
          break
        default:
          break
      }
    } catch (err) {
      throw new ClientError.ValidationError(type, err as Joi.ValidationError)
    }

    await next()
  }

export const convertValidatorsToPipeline = (
  validators: Request.Validation.Validator
) => {
  const validatorPipeline: Koa.Middleware[] = []

  for (const key in validators) {
    if (validators[key]) {
      const schema = validators[key]

      switch (key) {
        case Request.Validation.TYPE.BODY:
          validatorPipeline.push(
            validator(Request.Validation.TYPE.BODY, schema)
          )
          break

        case Request.Validation.TYPE.PARAMS:
          validatorPipeline.push(
            validator(Request.Validation.TYPE.PARAMS, schema)
          )
          break

        case Request.Validation.TYPE.QUERY:
          validatorPipeline.push(
            validator(Request.Validation.TYPE.QUERY, schema)
          )
          break

        case Request.Validation.TYPE.HEADERS:
          validatorPipeline.push(
            validator(Request.Validation.TYPE.HEADERS, schema)
          )
          break

        case Request.Validation.TYPE.COOKIE:
          validatorPipeline.push(
            validator(Request.Validation.TYPE.COOKIE, schema)
          )
          break
        default:
          break
      }
    }
  }

  return validatorPipeline
}

export const validateTraceMiddleware: Koa.Middleware<
  Request.IBaseState
> = async (ctx, next) => {
  try {
    await Request.TRACE_STATE_SCHEMA.validateAsync(ctx.state.trace)
  } catch (error: any) {
    throw new ClientError.CustomJoiError(
      ClientError.ERROR_TYPE.CONTROLLER_ERROR,
      error
    )
  }

  await next()
}
