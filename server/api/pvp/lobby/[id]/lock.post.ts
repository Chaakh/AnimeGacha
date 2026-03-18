import { getRouterParam, readBody } from 'h3'
import { lockLobbyTeam, parseDraftCards, toLobbyView } from '../../../../utils/pvp'

export default defineEventHandler(async (event) => {
  const lobbyId = getRouterParam(event, 'id')
  if (!lobbyId) {
    throw createError({ statusCode: 400, statusMessage: 'Lobby id is required.' })
  }

  const body = await readBody<{ token?: string; name?: string; cards?: unknown }>(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Lobby token is required.' })
  }

  const cards = parseDraftCards(body?.cards)
  const { lobby, role } = lockLobbyTeam({
    lobbyId,
    token,
    cards,
    playerName: body?.name
  })

  return {
    lobby: toLobbyView(lobby, role)
  }
})
