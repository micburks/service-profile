import fs from 'fs'
import path from 'path'
import uuid from 'uuid'
import express from 'express'
import store from './state/store'
import { serverError, serverLog } from './log'
import { apiPathPrefix, apiVersion } from './common'
import {
  profileByIdSel,
  profilesSel,
  profileDataSel,
  profileDirSel,
  serviceByIdSel,
  serviceIdByUrlSel,
  servicesSel
} from './state/selectors'

export const apiRouter = express.Router()
export const apiPath = `${apiPathPrefix}/${apiVersion}`

// /ping GET
apiRouter.get('/ping', (req, res) => {
  res.send({ status: 'success', message: 'pong' })
})

// /veggie/api/v1/store/profile/:id GET
apiRouter.get('/store/profile/:id', (req, res) => {
  const { id } = req.params
  const data = profileByIdSel(id)

  if (data) {
    res.send({ status: 'success', data })
  } else {
    res.status(404).send({ status: 'failed' })
  }
})

// /veggie/api/v1/store/profile/:id POST - save
apiRouter.post('/store/profile/:id', (req, res) => {
  // TODO
  res.send({})
})

// /veggie/api/v1/store/profile/:id DELETE - delete
apiRouter.delete('/store/profile/:id', (req, res) => {
  // TODO
  res.send({})
})

// /veggie/api/v1/store/profile GET
apiRouter.get('/store/profile', (req, res) => {
  const data = profilesSel()
  res.send({ status: 'success', data })
})

/**
 * Save
 * Save the current overrides to disk as a profile
 * /veggie/api/v1/store/profile POST - save
 */
apiRouter.post('/store/profile', (req, res) => {
  const { name } = req.body
  const profileDir = profileDirSel()
  const profileData = profileDataSel()

  if (name) {
    let profilePath = name
    try {
      // Add json extension
      if (!profilePath.includes('.json')) {
        profilePath = `${profilePath}.json`
      }

      // Make path absolute
      if (!path.isAbsolute(profilePath)) {
        profilePath = path.join(profileDir, profilePath)
      }

      fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2))

      const message = `saving ${name} profile`
      serverLog(message)

      res.send({ status: 'success', message })
    } catch (e) {
      const error = `saving ${profileName} profile failed at ${profilePath}`
      serverError(error)

      res.status(500).send({ status: 'failed', error })
    }
  } else {
    const error = 'save requires a name'
    serverError(error)

    res.status(400).send({ status: 'failed', error })
  }
})

/**
 * Load
 * Load a previously saved profile from disk
 * /veggie/api/v1/store/profile PUT - load
 */
apiRouter.put('/store/profile', (req, res) => {
  const { id } = req.body
  const profile = profileById(id)

  if (profile) {
    let profileData = profile.data

    if (!profileData) {
      const profileDir = profileDirSel()
      let profilePath = profile.name

      try {
        // Add json extension
        if (!profilePath.includes('.json')) {
          profilePath = `${profilePath}.json`
        }

        // Make path absolute
        if (!path.isAbsolute(profilePath)) {
          profilePath = path.join(profileDir, profilePath)
        }

        const fileData = fs.readFileSync(profilePath)
        profileData = JSON.parse(fileData)
      } catch (e) {
        const error = `loading ${profile.name} profile failed at ${profilePath}`
        serverError(error)

        return res.status(500).send({ status: 'failed', error })
      }

      const profileUrls = Object.keys(profileData)
      store.dispatch(state => {
        state.id = uuid.v4()
        state.profiles.current = id
        state.profiles.byId[id].data = profileData

        state.services.ids.forEach(id => {
          const { url } = state.services.byId[id]

          if (profileUrls.includes(url)) {
            state.services.byId[id].override = profileData[url]
          } else {
            state.services.byId[id].override = null
          }
        })

        return state
      })

      const message = `loading ${profile.name} profile`
      serverLog(message)

      res.send({ status: 'success', message })
    }
  } else {
    const error = `could not find profile with id ${id}`
    serverError(error)

    res.status(400).send({ status: 'failed', error })
  }
})

/**
 * Reset all
 * /veggie/api/v1/store/profile DELETE - resetAll
 */
apiRouter.delete('/store/profile', (req, res) => {
  const message = 'reseting on to all service defaults'
  serverLog(message)

  store.dispatch(state => {
    state.id = uuid.v4()
    state.profiles.current = null
    state.services.ids.forEach(id => {
      state.services.byId[id].override = null
    })

    return state
  })

  res.send({ status: 'success', message })
})

/**
 * Show all
 * Show all service overrides and their override payload
 * /veggie/api/v1/store GET - internals
 */
apiRouter.get('/store', (req, res) => {
  const data = servicesSel()
  res.send({ status: 'success', data })
})

/**
 * New
 * /veggie/api/v1/store POST
 */
apiRouter.post('/store', (req, res) => {
  // TODO: create new service with only an override
  res.send({})
})

/**
 * Show
 * Show the path of all overriden services
 * /veggie/api/v1/store/:id GET
 */
apiRouter.get('/store/:id', (req, res) => {
  const { id } = req.params
  const data = serviceByIdSel(id)
  res.send({ status: 'success', data })
})

/**
 * Set
 * Set the status code and response for a given service
 * /veggie/api/v1/store/:id POST - set, block, reset, hang
 */
apiRouter.post('/store/:id', (req, res) => {
  const { id } = req.params
  const { status, response, hang } = req.body
  const service = serviceByIdSel(id)

  if (service) {
    let override
    if (!status && !response) {
      override = null
    } else {
      override = {
        status: status || 404,
        response: response || {},
        hang: hang || false
      }
    }

    store.dispatch(state => {
      state.id = uuid.v4()
      state.services.byId[id].override = override

      return state
    })

    const message = `setting override on ${service.url} service with ${override} status`
    serverLog(message)

    res.send({ status: 'success', message })
  } else {
    const error = `could not find ${service.url} service to override`
    serverError(error)

    res.status(400).send({ status: 'failed', error })
  }
})