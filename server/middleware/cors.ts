import { defineEventHandler, getRequestHeader, setHeader } from 'h3'

function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS || ''
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export default defineEventHandler((event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) {
    return
  }

  const origin = getRequestHeader(event, 'origin')
  const allowedOrigins = getAllowedOrigins()

  if (origin && allowedOrigins.includes(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Vary', 'Origin')
    setHeader(event, 'Access-Control-Allow-Credentials', 'true')
  }

  setHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')
  setHeader(event, 'Access-Control-Max-Age', '86400')

  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
  }
})
