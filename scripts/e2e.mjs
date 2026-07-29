import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 1))
  })
}

const npmEntryPoint = process.env.npm_execpath
if (!npmEntryPoint) {
  throw new Error('npm_execpath is required to run the E2E suite')
}

const buildCode = await run(process.execPath, [npmEntryPoint, 'run', 'build'])
if (buildCode !== 0) process.exit(buildCode)

const server = await preview({
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
})

if (!process.argv.includes('--server-only')) {
  let testCode = 1
  try {
    const playwrightCli = fileURLToPath(
      new URL('../node_modules/@playwright/test/cli.js', import.meta.url),
    )
    testCode = await run(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)])
  } finally {
    server.httpServer.closeAllConnections?.()
    await new Promise((resolve, reject) => {
      server.httpServer.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  process.exitCode = testCode
}
