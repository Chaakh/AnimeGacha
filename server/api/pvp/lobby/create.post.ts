import { readBody } from 'h3'
import { createLobby, sanitizePlayerName, toLobbyView } from '../../../utils/pvp'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string }>(event)
  const name = sanitizePlayerName(body?.name ?? '')

  const { lobby, token } = createLobby(name)

  return {
    token,
    shareUrl: null,
    lobby: toLobbyView(lobby, 'host')
  }
})
