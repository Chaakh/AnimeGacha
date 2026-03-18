import { randomBytes } from 'node:crypto'

export type PvpRole = 'host' | 'guest'
export type PvpPhase = 'waiting' | 'draft' | 'finished'
type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

export interface PvpCard {
  id: string
  name: string
  rarity: Rarity
  attack: number
  defense: number
  title: string
  element: string
  imageUrl: string
}

interface PvpLobbyPlayer {
  role: PvpRole
  name: string
  token: string
  locked: boolean
  cards: PvpCard[]
  joinedAt: number
}

export interface PvpBattleTurn {
  id: string
  actor: PvpRole
  actorName: string
  actorCardId: string
  targetCardId: string
  turnNumber: number
  power: number
  text: string
}

export interface PvpBattleResult {
  hostPower: number
  guestPower: number
  winner: PvpRole | 'draw'
  turns: PvpBattleTurn[]
}

interface PvpLobby {
  id: string
  createdAt: number
  updatedAt: number
  expiresAt: number
  phase: PvpPhase
  host: PvpLobbyPlayer
  guest: PvpLobbyPlayer | null
  result: PvpBattleResult | null
}

export interface PvpLobbyPlayerView {
  role: PvpRole
  name: string
  locked: boolean
  cards: PvpCard[]
}

export interface PvpLobbyView {
  id: string
  phase: PvpPhase
  youRole: PvpRole
  expiresAt: number
  bothLocked: boolean
  players: {
    host: PvpLobbyPlayerView
    guest: PvpLobbyPlayerView | null
  }
  result: PvpBattleResult | null
}

const LOBBY_TTL_MS = 1000 * 60 * 60 * 6

declare global {
  // eslint-disable-next-line no-var
  var __anigackaPvpLobbies: Map<string, PvpLobby> | undefined
}

const lobbies = globalThis.__anigackaPvpLobbies ?? new Map<string, PvpLobby>()
globalThis.__anigackaPvpLobbies = lobbies

function nowTs() {
  return Date.now()
}

function randomToken(size = 12) {
  return randomBytes(size).toString('hex')
}

function randomLobbyId() {
  return randomBytes(6).toString('hex')
}

export function sanitizePlayerName(raw: unknown) {
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Player name is required.' })
  }

  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 24) {
    throw createError({ statusCode: 400, statusMessage: 'Player name must be 2-24 characters.' })
  }

  return name
}

const raritySet = new Set<Rarity>(['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'])

function normalizeCard(raw: unknown): PvpCard | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const candidate = raw as Partial<PvpCard>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.rarity !== 'string' ||
    !raritySet.has(candidate.rarity as Rarity) ||
    typeof candidate.attack !== 'number' ||
    typeof candidate.defense !== 'number' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.element !== 'string' ||
    typeof candidate.imageUrl !== 'string'
  ) {
    return null
  }

  const attack = Math.max(0, Math.round(candidate.attack))
  const defense = Math.max(0, Math.round(candidate.defense))

  return {
    id: candidate.id,
    name: candidate.name,
    rarity: candidate.rarity as Rarity,
    attack,
    defense,
    title: candidate.title,
    element: candidate.element,
    imageUrl: candidate.imageUrl
  }
}

export function parseDraftCards(raw: unknown): PvpCard[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw createError({ statusCode: 400, statusMessage: 'You must lock exactly 3 cards.' })
  }

  const cards = raw.map(normalizeCard).filter((entry): entry is PvpCard => Boolean(entry))
  if (cards.length !== 3) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid card payload in draft.' })
  }

  const uniqueIds = new Set(cards.map((card) => card.id))
  if (uniqueIds.size !== cards.length) {
    throw createError({ statusCode: 400, statusMessage: 'Duplicate cards are not allowed.' })
  }

  return cards
}

function cleanupExpiredLobbies() {
  const now = nowTs()
  for (const [id, lobby] of lobbies.entries()) {
    if (lobby.expiresAt <= now) {
      lobbies.delete(id)
    }
  }
}

function touchLobby(lobby: PvpLobby) {
  lobby.updatedAt = nowTs()
  lobby.expiresAt = lobby.updatedAt + LOBBY_TTL_MS
}

function getLobbyById(lobbyId: string) {
  cleanupExpiredLobbies()
  const lobby = lobbies.get(lobbyId)
  if (!lobby) {
    throw createError({ statusCode: 404, statusMessage: 'Lobby not found or expired.' })
  }
  touchLobby(lobby)
  return lobby
}

function roleFromToken(lobby: PvpLobby, token: string): PvpRole | null {
  if (lobby.host.token === token) {
    return 'host'
  }
  if (lobby.guest?.token === token) {
    return 'guest'
  }
  return null
}

function ensureCardsReady(player: PvpLobbyPlayer, roleName: string) {
  if (player.cards.length !== 3) {
    throw createError({ statusCode: 400, statusMessage: `${roleName} does not have 3 locked cards.` })
  }
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max)
}

function cardPower(card: PvpCard) {
  const rarityBonus: Record<Rarity, number> = {
    Common: 0,
    Rare: 4,
    Epic: 8,
    Legendary: 12,
    Mythic: 16
  }
  return Math.round(card.attack * 1.3 + card.defense * 0.75 + rarityBonus[card.rarity] + randomInt(24))
}

function resolveBattle(host: PvpLobbyPlayer, guest: PvpLobbyPlayer): PvpBattleResult {
  ensureCardsReady(host, 'Host')
  ensureCardsReady(guest, 'Guest')

  const turns: PvpBattleTurn[] = []
  let hostPower = 0
  let guestPower = 0

  for (let index = 0; index < 3; index += 1) {
    const hostCard = host.cards[index]
    const guestCard = guest.cards[index]
    if (!hostCard || !guestCard) {
      continue
    }

    const hostStrike = cardPower(hostCard)
    hostPower += hostStrike
    turns.push({
      id: `${index + 1}-host`,
      actor: 'host',
      actorName: host.name,
      actorCardId: hostCard.id,
      targetCardId: guestCard.id,
      turnNumber: turns.length + 1,
      power: hostStrike,
      text: `${hostCard.name} strikes ${guestCard.name} for ${hostStrike} power!`
    })

    const guestStrike = cardPower(guestCard)
    guestPower += guestStrike
    turns.push({
      id: `${index + 1}-guest`,
      actor: 'guest',
      actorName: guest.name,
      actorCardId: guestCard.id,
      targetCardId: hostCard.id,
      turnNumber: turns.length + 1,
      power: guestStrike,
      text: `${guestCard.name} counters ${hostCard.name} for ${guestStrike} power!`
    })
  }

  const winner: PvpRole | 'draw' = hostPower === guestPower ? 'draw' : hostPower > guestPower ? 'host' : 'guest'

  return {
    hostPower,
    guestPower,
    winner,
    turns
  }
}

function maybeAdvancePhase(lobby: PvpLobby) {
  if (lobby.guest && lobby.phase === 'waiting') {
    lobby.phase = 'draft'
  }

  if (lobby.guest && lobby.host.locked && lobby.guest.locked) {
    lobby.result = resolveBattle(lobby.host, lobby.guest)
    lobby.phase = 'finished'
  }
}

export function createLobby(hostName: string) {
  cleanupExpiredLobbies()

  const id = randomLobbyId()
  const hostToken = randomToken()
  const createdAt = nowTs()

  const host: PvpLobbyPlayer = {
    role: 'host',
    name: hostName,
    token: hostToken,
    locked: false,
    cards: [],
    joinedAt: createdAt
  }

  const lobby: PvpLobby = {
    id,
    createdAt,
    updatedAt: createdAt,
    expiresAt: createdAt + LOBBY_TTL_MS,
    phase: 'waiting',
    host,
    guest: null,
    result: null
  }

  lobbies.set(id, lobby)
  return { lobby, token: hostToken }
}

export function joinLobby(lobbyId: string, guestName: string) {
  const lobby = getLobbyById(lobbyId)
  if (lobby.guest) {
    throw createError({ statusCode: 409, statusMessage: 'Lobby is already full.' })
  }
  if (lobby.phase === 'finished') {
    throw createError({ statusCode: 409, statusMessage: 'This lobby has already finished.' })
  }

  lobby.guest = {
    role: 'guest',
    name: guestName,
    token: randomToken(),
    locked: false,
    cards: [],
    joinedAt: nowTs()
  }
  maybeAdvancePhase(lobby)
  touchLobby(lobby)

  return { lobby, token: lobby.guest.token }
}

export function getLobbyForToken(lobbyId: string, token: string) {
  const lobby = getLobbyById(lobbyId)
  const role = roleFromToken(lobby, token)
  if (!role) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid lobby token for this room.' })
  }

  maybeAdvancePhase(lobby)
  touchLobby(lobby)
  return { lobby, role }
}

export function lockLobbyTeam(params: {
  lobbyId: string
  token: string
  cards: PvpCard[]
  playerName?: string
}) {
  const { lobbyId, token, cards, playerName } = params
  const { lobby, role } = getLobbyForToken(lobbyId, token)

  if (!lobby.guest) {
    throw createError({ statusCode: 400, statusMessage: 'Waiting for opponent to join before locking cards.' })
  }
  if (lobby.phase === 'finished') {
    throw createError({ statusCode: 409, statusMessage: 'This lobby battle is already finished.' })
  }

  const player = role === 'host' ? lobby.host : lobby.guest
  if (!player) {
    throw createError({ statusCode: 400, statusMessage: 'Player slot is unavailable.' })
  }

  if (playerName) {
    player.name = sanitizePlayerName(playerName)
  }
  player.cards = cards
  player.locked = true

  maybeAdvancePhase(lobby)
  touchLobby(lobby)

  return { lobby, role }
}

export function toLobbyView(lobby: PvpLobby, viewerRole: PvpRole): PvpLobbyView {
  const hostCardsVisible = viewerRole === 'host' || lobby.host.locked || lobby.phase === 'finished'
  const guestCardsVisible = viewerRole === 'guest' || Boolean(lobby.guest?.locked) || lobby.phase === 'finished'
  const hostCards = hostCardsVisible ? lobby.host.cards : []
  const guestCards = lobby.guest ? (guestCardsVisible ? lobby.guest.cards : []) : []
  const bothLocked = lobby.host.locked && Boolean(lobby.guest?.locked)

  return {
    id: lobby.id,
    phase: lobby.phase,
    youRole: viewerRole,
    expiresAt: lobby.expiresAt,
    bothLocked,
    players: {
      host: {
        role: 'host',
        name: lobby.host.name,
        locked: lobby.host.locked,
        cards: hostCards
      },
      guest: lobby.guest
        ? {
            role: 'guest',
            name: lobby.guest.name,
            locked: lobby.guest.locked,
            cards: guestCards
          }
        : null
    },
    result: lobby.phase === 'finished' ? lobby.result : null
  }
}
