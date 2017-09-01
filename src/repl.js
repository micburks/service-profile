import fs from 'fs'
import net from 'net'
import path from 'path'
import repl from 'repl'
import { addr, profileMethods } from './profile'
import { clientLog, clientError, prompt, serverLog, serverError } from './log'
import { socketPath } from './common'

/**
 * Create the repl server
 * @returns void
 */
export default function replServer () {
  // cleanup leftover socket if it exists
  fs.unlinkSync(socketPath)

  // Open net connection for repl
  const replServer = net.createServer()
  
  replServer.on('connection', socket => {
    serverLog('repl client session connected')

    const session = repl.start({
      prompt: prompt('mock-client > '),
      input: socket,
      output: socket,
      terminal: true
    })

    session.defineCommand('save', {
      help: 'Save session to file',
      action (name) {
        const file = getFilePath(name)
        // fs.writeFileSync(file, profileMethods.showVerbose())
        clientLog(`saved to ${file}`)
        this.displayPrompt()
      }
    })

    session.defineCommand('load', {
      help: 'Load session from file',
      action (name) {
        const file = getFilePath(name)
        // const fileData = fs.readFileSync(fileName)
        // try {
        // const json = JSON.parse(fileData)
        // profileMethods.loadProfile(json)
        clientLog(`profile loaded from ${file}`)
        // } catch (e) {
        // clientError(`error reading profile from ${file}`)
        // }
      }
    })

    session.on('exit', () => {
      serverLog('repl client session exited')
      socket.end()
    })

    session.context = Object.assign(session.context, profileMethods)
  })

  replServer.on('listening', () => {
    serverLog(`repl listening at ${socketPath}`)
  })

  replServer.on('error', (e) => {
    serverError(`repl error - ${e}`)
    replServer.close()
  })

  replServer.on('close', () => {
    serverLog('repl closing')
  })

  replServer.listen(socketPath)
}

function getFilePath (name) {
  return path.join(process.cwd(), name)
}

