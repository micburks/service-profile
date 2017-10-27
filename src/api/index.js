import express from 'express'
import * as apiMethods from './methods'
import * as apiServices from './services'
import { apiPathPrefix } from '../common'

export { apiMethods, apiServices }

const middlewareApiRegex = `${apiPathPrefix}/:method/:name?/:config?`

/**
 * Middleware that registers the profile api
 * @returns {function}
 */
export function apiMiddleware () {
  const apiRouter = express.Router()
  apiRouter.all(middlewareApiRegex, apiHandler)
  return apiRouter
}

/**
 * Route handler for api calls
 * @returns {void}
 */
function apiHandler (req, res) {
  const { params, body } = req
  const { method } = params
  const name = decodeURIComponent(params.name)
  let config

  if (req.method.toLowerCase() === 'post') {
    config = req.body
  }

  if (!(method in apiMethods)) {
    res.status(501)
    res.send({ message: `mock-server: ${method} not implemented` })
  } else {
    try {
      let payload
      payload = apiMethods[method](name, config)
      res.status(200)
      res.send({ message: `mock-server: ${method} call successful`, payload })
    } catch (e) {
      res.status(500)
      res.send({ message: `mock-server: ${method} call failed` })
    }
  }
  res.end()
}
