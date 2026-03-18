<script setup lang="ts">
const { collectionEntries } = useGacha()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const apiBase = runtimeConfig.public.apiBase?.trim()

type PvpRole = 'host' | 'guest'
type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

interface PvpCard {
  id: string
  name: string
  rarity: Rarity
  attack: number
  defense: number
  title: string
  element: string
  imageUrl: string
}

interface PvpTurn {
  id: string
  actor: PvpRole
  actorName: string
  actorCardId: string
  targetCardId: string
  turnNumber: number
  power: number
  text: string
}

interface LobbyPlayerView {
  role: PvpRole
  name: string
  locked: boolean
  cards: PvpCard[]
}

interface LobbyView {
  id: string
  phase: 'waiting' | 'draft' | 'finished'
  youRole: PvpRole
  expiresAt: number
  bothLocked: boolean
  players: {
    host: LobbyPlayerView
    guest: LobbyPlayerView | null
  }
  result: {
    hostPower: number
    guestPower: number
    winner: PvpRole | 'draw'
    turns: PvpTurn[]
  } | null
}

const lobbyId = ref<string | null>(null)
const lobbyToken = ref<string | null>(null)
const lobby = ref<LobbyView | null>(null)
const playerName = ref('')
const shareUrl = ref('')
const selectedCardIds = ref<string[]>([])
const statusMessage = ref('Create a lobby or join one from a link to start a 1v1 draft.')
const errorMessage = ref('')
const isCreating = ref(false)
const isJoining = ref(false)
const isLocking = ref(false)
const copied = ref(false)

let pollHandle: ReturnType<typeof setInterval> | null = null
let copiedResetHandle: ReturnType<typeof setTimeout> | null = null

const routeLobbyId = computed(() => {
  return typeof route.query.lobby === 'string' ? route.query.lobby.trim() : ''
})

type CollectionEntry = (typeof collectionEntries.value)[number]

const selectedEntries = computed<CollectionEntry[]>(() => {
  return selectedCardIds.value
    .map((id) => collectionEntries.value.find((entry) => entry.character.id === id))
    .filter((entry): entry is CollectionEntry => Boolean(entry))
})

const mePlayer = computed(() => {
  if (!lobby.value) {
    return null
  }
  return lobby.value.youRole === 'host' ? lobby.value.players.host : lobby.value.players.guest
})

const opponentPlayer = computed(() => {
  if (!lobby.value) {
    return null
  }
  return lobby.value.youRole === 'host' ? lobby.value.players.guest : lobby.value.players.host
})

const isInLobby = computed(() => Boolean(lobbyId.value && lobbyToken.value))
const canJoinLinkLobby = computed(() => Boolean(routeLobbyId.value) && !isInLobby.value)
const canEditDraft = computed(() => {
  if (!lobby.value || !mePlayer.value) {
    return false
  }
  return lobby.value.phase !== 'finished' && !mePlayer.value.locked
})
const canLockTeam = computed(() => {
  return canEditDraft.value && selectedEntries.value.length === 3 && !isLocking.value
})

const winnerLabel = computed(() => {
  if (!lobby.value?.result) {
    return ''
  }

  if (lobby.value.result.winner === 'draw') {
    return 'Draw - both teams matched power.'
  }

  const winnerName = lobby.value.result.winner === 'host' ? lobby.value.players.host.name : (lobby.value.players.guest?.name ?? 'Guest')
  return `${winnerName} wins the duel.`
})

function toStorageKey(id: string) {
  return `anigacka-pvp-token-${id}`
}

function readStoredToken(id: string) {
  if (!import.meta.client) {
    return null
  }
  return localStorage.getItem(toStorageKey(id))
}

function writeStoredToken(id: string, token: string) {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem(toStorageKey(id), token)
}

function buildShareUrl(id: string) {
  if (!import.meta.client) {
    return `/pvp?lobby=${id}`
  }
  return `${window.location.origin}/pvp?lobby=${id}`
}

function stopPolling() {
  if (!pollHandle) {
    return
  }
  clearInterval(pollHandle)
  pollHandle = null
}

function syncSelectedCardsFromLobby() {
  const cards = mePlayer.value?.cards ?? []
  if (cards.length === 3) {
    selectedCardIds.value = cards.map((card) => card.id)
  }
}

function clearErrors() {
  errorMessage.value = ''
}

function errorText(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') {
    return fallback
  }
  const candidate = error as { data?: { statusMessage?: string }; message?: string }
  return candidate.data?.statusMessage || candidate.message || fallback
}

async function fetchLobbyState(showErrors = false) {
  if (!lobbyId.value || !lobbyToken.value) {
    return
  }

  try {
    const response = await $fetch<{ lobby: LobbyView }>(`/api/pvp/lobby/${lobbyId.value}/state`, {
      baseURL: apiBase || undefined,
      query: {
        token: lobbyToken.value
      }
    })
    lobby.value = response.lobby
    shareUrl.value = buildShareUrl(response.lobby.id)
    syncSelectedCardsFromLobby()

    if (response.lobby.phase === 'waiting') {
      statusMessage.value = 'Waiting for an opponent to join your lobby.'
    } else if (response.lobby.phase === 'draft') {
      statusMessage.value = response.lobby.bothLocked ? 'Battle is resolving...' : 'Both players should lock 3 cards.'
    } else if (response.lobby.phase === 'finished') {
      statusMessage.value = 'Battle complete.'
    }
  } catch (error) {
    if (showErrors) {
      errorMessage.value = errorText(error, 'Unable to fetch lobby state.')
    }
    stopPolling()
  }
}

function startPolling() {
  stopPolling()
  void fetchLobbyState()
  pollHandle = setInterval(() => {
    void fetchLobbyState()
  }, 2000)
}

function cardsForLock() {
  return selectedEntries.value.map((entry) => ({
    id: entry.character.id,
    name: entry.character.name,
    rarity: entry.character.rarity,
    attack: entry.character.attack,
    defense: entry.character.defense,
    title: entry.character.title,
    element: entry.character.element,
    imageUrl: entry.character.imageUrl
  }))
}

function toggleCard(id: string) {
  if (!canEditDraft.value) {
    return
  }

  if (selectedCardIds.value.includes(id)) {
    selectedCardIds.value = selectedCardIds.value.filter((item) => item !== id)
    return
  }

  if (selectedCardIds.value.length >= 3) {
    return
  }

  selectedCardIds.value = [...selectedCardIds.value, id]
}

async function createLobbyAction() {
  clearErrors()
  if (isCreating.value) {
    return
  }
  if (playerName.value.trim().length < 2) {
    errorMessage.value = 'Enter a player name before creating a lobby.'
    return
  }

  isCreating.value = true
  try {
    const response = await $fetch<{ token: string; shareUrl: string; lobby: LobbyView }>('/api/pvp/lobby/create', {
      baseURL: apiBase || undefined,
      method: 'POST',
      body: {
        name: playerName.value
      }
    })

    lobbyId.value = response.lobby.id
    lobbyToken.value = response.token
    lobby.value = response.lobby
    shareUrl.value = response.shareUrl
    selectedCardIds.value = []
    writeStoredToken(response.lobby.id, response.token)
    await router.replace({ path: '/pvp', query: { lobby: response.lobby.id } })
    startPolling()
    statusMessage.value = 'Lobby created. Share the link so another player can join.'
  } catch (error) {
    errorMessage.value = errorText(error, 'Failed to create lobby.')
  } finally {
    isCreating.value = false
  }
}

async function joinLobbyAction() {
  clearErrors()
  if (isJoining.value) {
    return
  }
  if (!routeLobbyId.value) {
    errorMessage.value = 'Open a lobby link first, then join.'
    return
  }
  if (playerName.value.trim().length < 2) {
    errorMessage.value = 'Enter a player name before joining.'
    return
  }

  isJoining.value = true
  try {
    const response = await $fetch<{ token: string; lobby: LobbyView }>('/api/pvp/lobby/join', {
      baseURL: apiBase || undefined,
      method: 'POST',
      body: {
        lobbyId: routeLobbyId.value,
        name: playerName.value
      }
    })

    lobbyId.value = response.lobby.id
    lobbyToken.value = response.token
    lobby.value = response.lobby
    shareUrl.value = buildShareUrl(response.lobby.id)
    selectedCardIds.value = []
    writeStoredToken(response.lobby.id, response.token)
    startPolling()
    statusMessage.value = 'Joined lobby. Draft 3 cards and lock your team.'
  } catch (error) {
    errorMessage.value = errorText(error, 'Failed to join lobby.')
  } finally {
    isJoining.value = false
  }
}

async function lockTeamAction() {
  clearErrors()
  if (!lobbyId.value || !lobbyToken.value) {
    errorMessage.value = 'Join a lobby before locking a team.'
    return
  }
  if (!canLockTeam.value) {
    errorMessage.value = 'Select exactly 3 cards before locking.'
    return
  }

  isLocking.value = true
  try {
    const response = await $fetch<{ lobby: LobbyView }>(`/api/pvp/lobby/${lobbyId.value}/lock`, {
      baseURL: apiBase || undefined,
      method: 'POST',
      body: {
        token: lobbyToken.value,
        name: playerName.value,
        cards: cardsForLock()
      }
    })

    lobby.value = response.lobby
    syncSelectedCardsFromLobby()
    statusMessage.value = response.lobby.phase === 'finished' ? 'Battle complete.' : 'Team locked. Waiting for opponent lock.'
  } catch (error) {
    errorMessage.value = errorText(error, 'Failed to lock team.')
  } finally {
    isLocking.value = false
  }
}

async function copyShareLink() {
  if (!import.meta.client || !shareUrl.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    if (copiedResetHandle) {
      clearTimeout(copiedResetHandle)
    }
    copiedResetHandle = setTimeout(() => {
      copied.value = false
      copiedResetHandle = null
    }, 1400)
  } catch {
    errorMessage.value = 'Could not copy link. Copy it manually.'
  }
}

watch(
  routeLobbyId,
  (nextLobbyId) => {
    if (!nextLobbyId) {
      lobbyId.value = null
      lobbyToken.value = null
      lobby.value = null
      shareUrl.value = ''
      stopPolling()
      return
    }

    if (lobbyId.value === nextLobbyId && lobbyToken.value) {
      return
    }

    const existingToken = readStoredToken(nextLobbyId)
    lobbyId.value = nextLobbyId
    shareUrl.value = buildShareUrl(nextLobbyId)

    if (existingToken) {
      lobbyToken.value = existingToken
      statusMessage.value = 'Reconnected to your lobby session.'
      startPolling()
      return
    }

    lobbyToken.value = null
    lobby.value = null
    selectedCardIds.value = []
    stopPolling()
    statusMessage.value = 'Lobby link detected. Enter your name and join.'
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopPolling()
  if (copiedResetHandle) {
    clearTimeout(copiedResetHandle)
  }
})
</script>

<template>
  <section class="panel head">
    <div>
      <h1 class="section-title">PvP 1v1 Lobby</h1>
      <p class="muted">Create a lobby, share the link, and duel with 3 cards each.</p>
    </div>

    <div class="head-actions">
      <input v-model="playerName" class="name-input" placeholder="Player Name" maxlength="24" />
      <button class="button button-main" :disabled="isCreating" @click="createLobbyAction">
        {{ isCreating ? 'Creating...' : 'Create Lobby' }}
      </button>
      <button v-if="canJoinLinkLobby" class="button" :disabled="isJoining" @click="joinLobbyAction">
        {{ isJoining ? 'Joining...' : 'Join Lobby Link' }}
      </button>
    </div>
    <p class="status muted">{{ statusMessage }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </section>

  <section v-if="lobbyId" class="panel lobby-panel">
    <div class="lobby-head">
      <h2 class="section-title">Lobby {{ lobbyId }}</h2>
      <p class="muted">Expires {{ new Date(lobby?.expiresAt || Date.now()).toLocaleString() }}</p>
    </div>

    <div class="share-row">
      <input class="share-input" :value="shareUrl" readonly />
      <button class="button" @click="copyShareLink">{{ copied ? 'Copied' : 'Copy Link' }}</button>
    </div>

    <div class="player-grid">
      <article class="player-card" :class="{ ready: lobby?.players.host.locked }">
        <p class="player-role">Host</p>
        <strong>{{ lobby?.players.host.name || '-' }}</strong>
        <span>{{ lobby?.players.host.locked ? 'Locked 3 cards' : 'Drafting' }}</span>
      </article>

      <article class="player-card" :class="{ ready: lobby?.players.guest?.locked }">
        <p class="player-role">Guest</p>
        <strong>{{ lobby?.players.guest?.name || 'Waiting for player...' }}</strong>
        <span>{{ lobby?.players.guest ? (lobby.players.guest.locked ? 'Locked 3 cards' : 'Drafting') : 'Not joined' }}</span>
      </article>
    </div>
  </section>

  <section v-if="lobby" class="panel draft-panel">
    <div class="draft-head">
      <div>
        <h2 class="section-title">Draft 3 Cards</h2>
        <p class="muted">Only locked teams can enter battle.</p>
      </div>
      <button class="button button-main" :disabled="!canLockTeam" @click="lockTeamAction">
        {{ isLocking ? 'Locking...' : mePlayer?.locked ? 'Team Locked' : `Lock Team (${selectedEntries.length}/3)` }}
      </button>
    </div>

    <p v-if="!collectionEntries.length" class="muted empty-note">
      Your roster is empty. Open packs in <NuxtLink to="/">Summon</NuxtLink> first.
    </p>

    <div v-else class="roster-grid">
      <button
        v-for="entry in collectionEntries"
        :key="entry.character.id"
        class="pick"
        :class="{
          selected: selectedCardIds.includes(entry.character.id),
          disabled: !canEditDraft && !selectedCardIds.includes(entry.character.id)
        }"
        :disabled="!canEditDraft && !selectedCardIds.includes(entry.character.id)"
        @click="toggleCard(entry.character.id)"
      >
        <CharacterCard
          :character="entry.character"
          :count="entry.count"
          :selected="selectedCardIds.includes(entry.character.id)"
        />
      </button>
    </div>
  </section>

  <section v-if="lobby?.phase === 'finished' && lobby.result" class="panel result-panel">
    <div class="result-head">
      <h2 class="section-title">Duel Result</h2>
      <p class="winner">{{ winnerLabel }}</p>
      <p class="score">Power {{ lobby.result.hostPower }} - {{ lobby.result.guestPower }}</p>
    </div>

    <div class="duel-board">
      <div class="lane">
        <h3>Host Team</h3>
        <div class="mini-grid">
          <article v-for="card in lobby.players.host.cards" :key="card.id" class="mini-card host">
            <img :src="card.imageUrl" :alt="card.name" />
            <div>
              <strong>{{ card.name }}</strong>
              <span>ATK {{ card.attack }} | DEF {{ card.defense }}</span>
            </div>
          </article>
        </div>
      </div>

      <div class="lane">
        <h3>Guest Team</h3>
        <div class="mini-grid">
          <article v-for="card in lobby.players.guest?.cards || []" :key="card.id" class="mini-card guest">
            <img :src="card.imageUrl" :alt="card.name" />
            <div>
              <strong>{{ card.name }}</strong>
              <span>ATK {{ card.attack }} | DEF {{ card.defense }}</span>
            </div>
          </article>
        </div>
      </div>
    </div>

    <ul class="turn-log">
      <li v-for="turn in lobby.result.turns" :key="turn.id">
        <span>Turn {{ turn.turnNumber }}</span>
        <p>{{ turn.text }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
}

.head-actions {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  align-items: center;
}

.name-input {
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 10px;
  background: rgb(16 18 24 / 86%);
  color: var(--ink);
  padding: 0.66rem 0.8rem;
  min-width: min(300px, 85vw);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: 1rem;
}

.name-input:focus,
.share-input:focus {
  outline: 1px solid rgb(247 201 72 / 70%);
}

.status {
  margin: 0;
}

.error {
  margin: 0;
  color: var(--danger);
}

.lobby-panel {
  margin-top: 0.9rem;
  padding: 1rem;
}

.lobby-head p {
  margin: 0.35rem 0 0;
}

.share-row {
  margin-top: 0.7rem;
  display: flex;
  gap: 0.55rem;
  align-items: center;
}

.share-input {
  flex: 1;
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 10px;
  background: rgb(16 18 24 / 86%);
  color: var(--ink);
  padding: 0.66rem 0.8rem;
  font-family: 'Rajdhani', sans-serif;
}

.player-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.player-card {
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 12px;
  background: rgb(16 18 24 / 70%);
  padding: 0.75rem;
  display: grid;
  gap: 0.25rem;
}

.player-card.ready {
  border-color: rgb(76 228 171 / 55%);
  box-shadow: inset 0 0 14px rgb(76 228 171 / 16%);
}

.player-card strong {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.2rem;
}

.player-card span {
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.player-role {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--gold-soft);
  font-size: 0.74rem;
}

.draft-panel {
  margin-top: 0.9rem;
  padding: 1rem;
}

.draft-head {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
  flex-wrap: wrap;
}

.draft-head p {
  margin: 0.35rem 0 0;
}

.empty-note {
  margin-top: 0.7rem;
}

.roster-grid {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.pick {
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: transform 130ms ease;
}

.pick:hover {
  transform: translateY(-2px);
}

.pick.selected {
  filter: brightness(1.08);
}

.pick.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-panel {
  margin-top: 0.9rem;
  padding: 1rem;
}

.result-head p {
  margin: 0.35rem 0 0;
}

.winner {
  color: var(--emerald);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
}

.score {
  color: var(--gold-soft);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 700;
}

.duel-board {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.lane h3 {
  margin: 0 0 0.5rem;
  font-family: 'Rajdhani', sans-serif;
}

.mini-grid {
  display: grid;
  gap: 0.5rem;
}

.mini-card {
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 10px;
  background: rgb(13 15 21 / 78%);
  padding: 0.5rem;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 0.5rem;
  align-items: center;
}

.mini-card.host {
  border-color: rgb(102 217 255 / 40%);
}

.mini-card.guest {
  border-color: rgb(255 122 168 / 40%);
}

.mini-card img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  object-position: center top;
}

.mini-card strong {
  display: block;
  font-size: 0.86rem;
}

.mini-card span {
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.turn-log {
  margin: 0.85rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.5rem;
}

.turn-log li {
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 10px;
  background: rgb(14 16 22 / 76%);
  padding: 0.45rem 0.55rem;
}

.turn-log span {
  font-size: 0.74rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.turn-log p {
  margin: 0.2rem 0 0;
}

@media (max-width: 820px) {
  .share-row,
  .player-grid,
  .duel-board {
    grid-template-columns: 1fr;
    display: grid;
  }

  .head-actions {
    align-items: stretch;
  }

  .head-actions .button,
  .share-row .button {
    width: 100%;
  }
}
</style>
