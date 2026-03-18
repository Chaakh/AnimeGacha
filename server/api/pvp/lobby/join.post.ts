import { readBody } from 'h3'
import { joinLobby, sanitizePlayerName, toLobbyView } from '../../../utils/pvp'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ lobbyId?: string; name?: string }>(event)
  const lobbyId = typeof body?.lobbyId === 'string' ? body.lobbyId.trim() : ''
  if (!lobbyId) {
    throw createError({ statusCode: 400, statusMessage: 'Lobby id is required.' })
  }

  const name = sanitizePlayerName(body?.name ?? '')
  const { lobby, token } = joinLobby(lobbyId, name)

  return {
    token,
    lobby: toLobbyView(lobby, 'guest')
  }
})
