type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

interface Character {
  id: string
  name: string
  rarity: Rarity
  attack: number
  defense: number
  title: string
  element: string
  imageUrl: string
}

interface SaveState {
  lastResetDate: string
  packsRemaining: number
  dailyPulls: number
  dailyHighRarityPulls: number
  dailyBattleDone: boolean
  dailyBattleWon: boolean
  collection: Record<string, number>
  pullLog: string[]
}

interface BattleOutcome {
  playerTeam: Character[]
  enemyTeam: Character[]
  playerScore: number
  enemyScore: number
  won: boolean
  rounds: string[]
}

const STORAGE_KEY = 'anigacka-save-v1'
const DAILY_PACKS = 10
const PACK_SIZE = 5

const rarityMeta: Record<Rarity, { weight: number; color: string }> = {
  Common: { weight: 70, color: '#9eb6d1' },
  Rare: { weight: 22, color: '#4abfff' },
  Epic: { weight: 6, color: '#db6fff' },
  Legendary: { weight: 1.8, color: '#ffc752' },
  Mythic: { weight: 0.2, color: '#ff4fd8' }
}

const fallbackCharacterPool: Character[] = [
  { id: 'akari', name: 'Akari Bladewind', rarity: 'Common', attack: 42, defense: 30, title: 'Rooftop Duelist', element: 'Wind', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'ren', name: 'Ren Obsidian', rarity: 'Common', attack: 39, defense: 35, title: 'Street Guardian', element: 'Shadow', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'hina', name: 'Hina Solflare', rarity: 'Common', attack: 45, defense: 27, title: 'Festival Spear', element: 'Fire', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'kaito', name: 'Kaito Drift', rarity: 'Common', attack: 41, defense: 32, title: 'Sky Courier', element: 'Storm', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'sora', name: 'Sora Tideveil', rarity: 'Rare', attack: 57, defense: 41, title: 'Tidal Songblade', element: 'Water', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'naomi', name: 'Naomi Gearheart', rarity: 'Rare', attack: 53, defense: 49, title: 'Clockwork Ranger', element: 'Steel', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'ryuji', name: 'Ryuji Emberfang', rarity: 'Rare', attack: 61, defense: 37, title: 'Inferno Hunter', element: 'Fire', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'mei', name: 'Mei Lumen', rarity: 'Rare', attack: 55, defense: 46, title: 'Moon Shrine Ward', element: 'Light', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'izumi', name: 'Izumi Voidstep', rarity: 'Epic', attack: 70, defense: 58, title: 'Silent Riftblade', element: 'Void', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'kaede', name: 'Kaede Bloom', rarity: 'Epic', attack: 66, defense: 63, title: 'Verdant Empress', element: 'Nature', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'orion', name: 'Orion Hex', rarity: 'Epic', attack: 75, defense: 54, title: 'Celestial Tactician', element: 'Arcane', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'yukari', name: 'Yukari Zenith', rarity: 'Legendary', attack: 89, defense: 73, title: 'Sky Citadel Saint', element: 'Aether', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' },
  { id: 'shiro', name: 'Shiro Nightfall', rarity: 'Mythic', attack: 96, defense: 78, title: 'Abyss Crown', element: 'Dark', imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif' }
]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max)
}

function randomCharacter(pool: Character[]): Character {
  const first = pool[0]
  if (!first) {
    throw new Error('Character pool is empty')
  }

  return pool[randomInt(pool.length)] ?? first
}

function rollRarity(): Rarity {
  const totalWeight = Object.values(rarityMeta).reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * totalWeight

  for (const [rarity, meta] of Object.entries(rarityMeta) as [Rarity, { weight: number }][]) {
    roll -= meta.weight
    if (roll <= 0) {
      return rarity
    }
  }

  return 'Common'
}

function normalizeCharacter(raw: unknown): Character | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const candidate = raw as Partial<Character>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    !candidate.rarity ||
    typeof candidate.attack !== 'number' ||
    typeof candidate.defense !== 'number' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.element !== 'string' ||
    typeof candidate.imageUrl !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    name: candidate.name,
    rarity: candidate.rarity,
    attack: candidate.attack,
    defense: candidate.defense,
    title: candidate.title,
    element: candidate.element,
    imageUrl: candidate.imageUrl
  }
}

function normalizeSave(raw: unknown): SaveState {
  const fallback: SaveState = {
    lastResetDate: getTodayKey(),
    packsRemaining: DAILY_PACKS,
    dailyPulls: 0,
    dailyHighRarityPulls: 0,
    dailyBattleDone: false,
    dailyBattleWon: false,
    collection: {},
    pullLog: []
  }

  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const candidate = raw as Partial<SaveState>
  return {
    lastResetDate: typeof candidate.lastResetDate === 'string' ? candidate.lastResetDate : fallback.lastResetDate,
    packsRemaining:
      typeof candidate.packsRemaining === 'number' && candidate.packsRemaining >= 0
        ? Math.min(candidate.packsRemaining, DAILY_PACKS)
        : fallback.packsRemaining,
    dailyPulls:
      typeof candidate.dailyPulls === 'number' && candidate.dailyPulls >= 0
        ? Math.min(candidate.dailyPulls, DAILY_PACKS)
        : fallback.dailyPulls,
    dailyHighRarityPulls:
      typeof candidate.dailyHighRarityPulls === 'number' && candidate.dailyHighRarityPulls >= 0
        ? candidate.dailyHighRarityPulls
        : fallback.dailyHighRarityPulls,
    dailyBattleDone: typeof candidate.dailyBattleDone === 'boolean' ? candidate.dailyBattleDone : false,
    dailyBattleWon: typeof candidate.dailyBattleWon === 'boolean' ? candidate.dailyBattleWon : false,
    collection: candidate.collection && typeof candidate.collection === 'object' ? candidate.collection : {},
    pullLog: Array.isArray(candidate.pullLog) ? candidate.pullLog.filter((id) => typeof id === 'string').slice(0, 20) : []
  }
}

export function useGacha() {
  const runtimeConfig = useRuntimeConfig()
  const apiBase = runtimeConfig.public.apiBase?.trim()

  const save = useState<SaveState>('gacha-save', () => ({
    lastResetDate: getTodayKey(),
    packsRemaining: DAILY_PACKS,
    dailyPulls: 0,
    dailyHighRarityPulls: 0,
    dailyBattleDone: false,
    dailyBattleWon: false,
    collection: {},
    pullLog: []
  }))
  const initialized = useState<boolean>('gacha-init', () => false)
  const remotePool = useState<Character[]>('gacha-remote-pool', () => [])
  const isLoadingPool = useState<boolean>('gacha-pool-loading', () => false)
  const poolSource = useState<string>('gacha-pool-source', () => 'fallback')

  function activePool() {
    return remotePool.value.length ? remotePool.value : fallbackCharacterPool
  }

  function applyDailyReset() {
    const today = getTodayKey()
    if (save.value.lastResetDate !== today) {
      save.value.lastResetDate = today
      save.value.packsRemaining = DAILY_PACKS
      save.value.dailyPulls = 0
      save.value.dailyHighRarityPulls = 0
      save.value.dailyBattleDone = false
      save.value.dailyBattleWon = false
    }
  }

  async function loadCharacterPool() {
    if (isLoadingPool.value) {
      return
    }

    isLoadingPool.value = true
    try {
      const response = await $fetch<{ characters?: unknown[]; source?: string }>('/api/gacha/pool', {
        baseURL: apiBase || undefined
      })
      const characters = (response.characters || []).map(normalizeCharacter).filter((entry): entry is Character => Boolean(entry))
      if (characters.length) {
        remotePool.value = characters
        poolSource.value = response.source || 'jikan-v4'
      }
    } catch {
      if (!remotePool.value.length) {
        remotePool.value = []
      }
    } finally {
      isLoadingPool.value = false
    }
  }

  async function ensureInitialized() {
    if (!import.meta.client || initialized.value) {
      return
    }

    const persisted = localStorage.getItem(STORAGE_KEY)
    if (persisted) {
      try {
        save.value = normalizeSave(JSON.parse(persisted))
      } catch {
        save.value = normalizeSave(null)
      }
    }

    applyDailyReset()
    await loadCharacterPool()

    watch(
      save,
      (next) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      },
      { deep: true }
    )

    initialized.value = true
  }

  function applyCardResult(pulled: Character) {
    if (pulled.rarity === 'Epic' || pulled.rarity === 'Legendary' || pulled.rarity === 'Mythic') {
      save.value.dailyHighRarityPulls += 1
    }
    save.value.collection[pulled.id] = (save.value.collection[pulled.id] ?? 0) + 1
    save.value.pullLog = [pulled.id, ...save.value.pullLog].slice(0, 20)
  }

  function addDevPacks(count = 10) {
    if (!import.meta.dev) {
      return
    }

    const safeCount = Math.max(0, Math.floor(count))
    save.value.packsRemaining += safeCount
  }

  function localSummonPick() {
    const pool = activePool()
    const rolledRarity = rollRarity()
    const rarityPool = pool.filter((entry) => entry.rarity === rolledRarity)
    const pickPool = rarityPool.length ? rarityPool : pool
    return randomCharacter(pickPool)
  }

  function localSummonUniquePack(size = PACK_SIZE, excludedIds?: Set<string>) {
    const cards: Character[] = []
    const seen = new Set<string>(excludedIds ? Array.from(excludedIds) : [])

    while (cards.length < size) {
      const pick = localSummonPick()
      if (!seen.has(pick.id)) {
        seen.add(pick.id)
        cards.push(pick)
        continue
      }

      const uniqueFallback = activePool().find((entry) => !seen.has(entry.id))
      if (!uniqueFallback) {
        cards.push(pick)
      } else {
        seen.add(uniqueFallback.id)
        cards.push(uniqueFallback)
      }
    }

    return cards
  }

  async function pullPack() {
    applyDailyReset()
    if (save.value.packsRemaining <= 0) {
      return null
    }

    let pulledCards: Character[] = []

    try {
      const response = await $fetch<{ pulls?: unknown[]; source?: string }>('/api/gacha/summon', {
        baseURL: apiBase || undefined,
        method: 'POST',
        body: { count: PACK_SIZE }
      })
      pulledCards = (response.pulls || []).map(normalizeCharacter).filter((entry): entry is Character => Boolean(entry))
      if (response.source) {
        poolSource.value = response.source
      }
    } catch {
      pulledCards = []
    }

    if (!pulledCards.length) {
      pulledCards = localSummonUniquePack(PACK_SIZE)
    }

    while (pulledCards.length < PACK_SIZE) {
      const existingIds = new Set(pulledCards.map((card) => card.id))
      const extra = localSummonUniquePack(PACK_SIZE - pulledCards.length, existingIds)
      pulledCards.push(...extra)
    }

    if (!pulledCards.length) {
      return null
    }

    save.value.packsRemaining -= 1
    save.value.dailyPulls += 1
    for (const card of pulledCards) {
      applyCardResult(card)
    }

    return pulledCards
  }

  async function pullMany(count: number) {
    applyDailyReset()
    const safePacks = Math.max(0, Math.min(count, save.value.packsRemaining))
    if (!safePacks) {
      return []
    }

    try {
      const response = await $fetch<{ pulls?: unknown[]; source?: string }>('/api/gacha/summon', {
        baseURL: apiBase || undefined,
        method: 'POST',
        body: { count: safePacks * PACK_SIZE }
      })
      const pulls = (response.pulls || []).map(normalizeCharacter).filter((entry): entry is Character => Boolean(entry))

      if (response.source) {
        poolSource.value = response.source
      }

      if (pulls.length) {
        const packs: Character[][] = []
        for (let index = 0; index < safePacks; index += 1) {
          const start = index * PACK_SIZE
          const chunk = pulls.slice(start, start + PACK_SIZE)
          if (!chunk.length) {
            break
          }
          const chunkIds = new Set(chunk.map((entry) => entry.id))
          while (chunk.length < PACK_SIZE) {
            const remainingPool = activePool().filter((entry) => !chunkIds.has(entry.id))
            const extra = remainingPool.length ? randomCharacter(remainingPool) : localSummonPick()
            chunk.push(extra)
            chunkIds.add(extra.id)
          }
          packs.push(chunk)
          save.value.packsRemaining -= 1
          save.value.dailyPulls += 1
          for (const card of chunk) {
            applyCardResult(card)
          }
        }
        return packs
      }
    } catch {
      // fallback below
    }

    const localResults: Character[][] = []
    for (let index = 0; index < safePacks; index += 1) {
      if (save.value.packsRemaining <= 0) {
        break
      }
      const cards = localSummonUniquePack(PACK_SIZE)
      save.value.packsRemaining -= 1
      save.value.dailyPulls += 1
      for (const card of cards) {
        applyCardResult(card)
      }
      localResults.push(cards)
    }

    return localResults
  }

  function getCharacter(id: string) {
    return activePool().find((item) => item.id === id) ?? null
  }

  function getDailyBoss(): Character | null {
    const pool = activePool()
    if (!pool.length) return null

    const today = getTodayKey()
    const seed = today.split('-').reduce((sum, str) => sum + parseInt(str, 10), 0)
    
    // Look for notorious villains in the fetched character pool by matching partial names/titles
    const villainNames = ['madara', 'dio ', 'aizen', 'frieza', 'meruem', 'johan ', 'muzan', 'doflamingo', 'gilgamesh', 'shigaraki', 'chrollo', 'sukuna', 'blackbeard', 'orochimaru', 'griffith', 'hisoka', 'cell', 'buu', 'kaido', 'big mom', 'pain']
    const villains = pool.filter(c => villainNames.some(v => c.name.toLowerCase().includes(v) || c.title.toLowerCase().includes(v)))
    
    // Fallback to Legendaries/Mythics if no named villain is present
    const bossPool = villains.length ? villains : pool.filter(c => c.rarity === 'Mythic' || c.rarity === 'Legendary')
    const finalPool = bossPool.length ? bossPool : pool
    
    const base = finalPool[seed % finalPool.length]
    if (!base) return null
    
    // Scale boss to be a 3v1 raid boss
    return {
      ...base,
      attack: Math.round(base.attack * 3 + 80),
      defense: Math.round(base.defense * 3 + 80),
      title: 'Daily Raid Boss'
    }
  }

  function battle(teamIds: string[]): BattleOutcome | null {
    applyDailyReset()
    if (save.value.dailyBattleWon) {
      return null
    }

    const uniqueIds = Array.from(new Set(teamIds)).slice(0, 3)
    const playerTeam = uniqueIds.map((id) => getCharacter(id)).filter((item): item is Character => Boolean(item))
    if (!playerTeam.length) {
      return null
    }

    const boss = getDailyBoss()
    if (!boss) return null

    const rounds: string[] = []
    let playerScore = 0
    // Boss score scales with a bit of RNG
    let enemyScore = boss.attack * 1.5 + boss.defense + randomInt(60)

    playerTeam.forEach((hero) => {
      const copies = save.value.collection[hero.id] ?? 1
      const bonus = Math.min(copies - 1, 8)

      const heroPower = hero.attack * 1.5 + hero.defense + bonus * 7 + randomInt(20)
      playerScore += heroPower

      rounds.push(`${hero.name} strikes for ${Math.round(heroPower)} power!`)
    })
    
    rounds.push(`The Raid Boss, ${boss.name}, unleashes an attack with ${Math.round(enemyScore)} power!`)

    const won = playerScore >= enemyScore

    // Mark daily battle as done
    save.value.dailyBattleDone = true
    save.value.dailyBattleWon = won

    // Grant 2 bonus packs on victory
    if (won) {
      save.value.packsRemaining += 2
      rounds.push('Victory! You earned 2 bonus packs as a raid reward!')
    } else {
      rounds.push('Defeat. Adjust your team and try again!')
    }

    return {
      playerTeam,
      enemyTeam: [boss],
      playerScore: Math.round(playerScore),
      enemyScore: Math.round(enemyScore),
      won,
      rounds
    }
  }

  const allCharacters = computed(() => activePool())

  const collectionEntries = computed(() => {
    return Object.entries(save.value.collection)
      .map(([id, count]) => {
        const character = getCharacter(id)
        if (!character) {
          return null
        }

        return {
          character,
          count
        }
      })
      .filter((entry): entry is { character: Character; count: number } => Boolean(entry))
      .sort((left, right) => {
        const rarityRank = { Mythic: 5, Legendary: 4, Epic: 3, Rare: 2, Common: 1 }
        const rarityDiff = rarityRank[right.character.rarity] - rarityRank[left.character.rarity]
        if (rarityDiff !== 0) {
          return rarityDiff
        }
        return right.character.attack + right.character.defense - (left.character.attack + left.character.defense)
      })
  })

  const recentPulls = computed(() => {
    return save.value.pullLog
      .map((id) => getCharacter(id))
      .filter((entry): entry is Character => Boolean(entry))
  })

  const rarityBreakdown = computed(() => {
    const base = {
      Common: 0,
      Rare: 0,
      Epic: 0,
      Legendary: 0,
      Mythic: 0
    }

    for (const item of collectionEntries.value) {
      base[item.character.rarity] += item.count
    }

    return base
  })

  const missionProgress = computed(() => {
    return {
      pullFive: {
        label: 'Open 5 packs',
        current: Math.min(save.value.dailyPulls, 5),
        target: 5,
        done: save.value.dailyPulls >= 5
      },
      pullEpic: {
        label: 'Pull Epic+ once',
        current: Math.min(save.value.dailyHighRarityPulls, 1),
        target: 1,
        done: save.value.dailyHighRarityPulls >= 1
      },
      shareResult: {
        label: 'Share one result',
        current: 0,
        target: 1,
        done: false
      },
      battleWin: {
        label: 'Win one battle',
        current: save.value.dailyBattleWon ? 1 : 0,
        target: 1,
        done: save.value.dailyBattleWon
      }
    }
  })

  return {
    allCharacters,
    rarityMeta,
    save,
    isLoadingPool,
    poolSource,
    ensureInitialized,
    loadCharacterPool,
    addDevPacks,
    pullPack,
    pullMany,
    collectionEntries,
    recentPulls,
    rarityBreakdown,
    missionProgress,
    getDailyBoss,
    battle
  }
}
