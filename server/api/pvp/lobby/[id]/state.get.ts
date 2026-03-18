import { getQuery, getRouterParam } from 'h3'
import { getLobbyForToken, toLobbyView } from '../../../../utils/pvp'

export default defineEventHandler((event) => {
  const lobbyId = getRouterParam(event, 'id')
  if (!lobbyId) {
    throw createError({ statusCode: 400, statusMessage: 'Lobby id is required.' })
  }

  const query = getQuery(event)
  const token = typeof query.token === 'string' ? query.token.trim() : ''
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Lobby token is required.' })
  }

  const { lobby, role } = getLobbyForToken(lobbyId, token)
  return {
    lobby: toLobbyView(lobby, role)
  }
})
