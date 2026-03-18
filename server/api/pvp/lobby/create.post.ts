import { getRequestURL, readBody } from 'h3'
import { createLobby, sanitizePlayerName, toLobbyView } from '../../../utils/pvp'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string }>(event)
  const name = sanitizePlayerName(body?.name ?? '')

  const { lobby, token } = createLobby(name)
  const requestUrl = getRequestURL(event)
  const shareUrl = `${requestUrl.protocol}//${requestUrl.host}/pvp?lobby=${lobby.id}`

  return {
    token,
    shareUrl,
    lobby: toLobbyView(lobby, 'host')
  }
})
