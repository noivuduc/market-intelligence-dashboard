#!/usr/bin/env node
/**
 * Sets PORT=3001 before spawning Next so the dev/start CLI picks it up
 * (Commander reads process.env.PORT; .env.local loads too late for port).
 *
 * Usage: node scripts/next-with-default-port.mjs dev [--turbo ...]
 *        node scripts/next-with-default-port.mjs start
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const command = process.argv[2]
const userArgs = process.argv.slice(3)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

if (command !== 'dev' && command !== 'start') {
  console.error('Usage: node scripts/next-with-default-port.mjs <dev|start> [next args...]')
  process.exit(1)
}

function hasPortInArgv(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '-p' || a === '--port') return true
    if (typeof a === 'string' && a.startsWith('--port=')) return true
  }
  return false
}

const DEFAULT_PORT = '3001'
if (!process.env.PORT?.trim() && !hasPortInArgv(userArgs)) {
  process.env.PORT = DEFAULT_PORT
}

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(process.execPath, [nextBin, command, ...userArgs], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
