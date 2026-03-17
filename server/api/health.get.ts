export default defineEventHandler(() => {
  return {
    ok: true,
    service: 'animegacha-api',
    now: new Date().toISOString()
  }
})
