type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'

interface Character {
  id: string
  name: string
  rarity: Rarity
  attack: number
  defense: number
  title: string
  element: string
}

interface SaveState {
  lastResetDate: string
  packsRemaining: number
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

const rarityMeta: Record<Rarity, { weight: number; color: string }> = {
  Common: { weight: 56, color: '#9eb6d1' },
  Rare: { weight: 28, color: '#4abfff' },
  Epic: { weight: 12, color: '#db6fff' },
  Legendary: { weight: 4, color: '#ffc752' }
}

const characterPool: Character[] = [
  { id: 'akari', name: 'Akari Bladewind', rarity: 'Common', attack: 42, defense: 30, title: 'Rooftop Duelist', element: 'Wind' },
  { id: 'ren', name: 'Ren Obsidian', rarity: 'Common', attack: 39, defense: 35, title: 'Street Guardian', element: 'Shadow' },
  { id: 'hina', name: 'Hina Solflare', rarity: 'Common', attack: 45, defense: 27, title: 'Festival Spear', element: 'Fire' },
  { id: 'kaito', name: 'Kaito Drift', rarity: 'Common', attack: 41, defense: 32, title: 'Sky Courier', element: 'Storm' },
  { id: 'sora', name: 'Sora Tideveil', rarity: 'Rare', attack: 57, defense: 41, title: 'Tidal Songblade', element: 'Water' },
  { id: 'naomi', name: 'Naomi Gearheart', rarity: 'Rare', attack: 53, defense: 49, title: 'Clockwork Ranger', element: 'Steel' },
  { id: 'ryuji', name: 'Ryuji Emberfang', rarity: 'Rare', attack: 61, defense: 37, title: 'Inferno Hunter', element: 'Fire' },
  { id: 'mei', name: 'Mei Lumen', rarity: 'Rare', attack: 55, defense: 46, title: 'Moon Shrine Ward', element: 'Light' },
  { id: 'izumi', name: 'Izumi Voidstep', rarity: 'Epic', attack: 70, defense: 58, title: 'Silent Riftblade', element: 'Void' },
  { id: 'kaede', name: 'Kaede Bloom', rarity: 'Epic', attack: 66, defense: 63, title: 'Verdant Empress', element: 'Nature' },
  { id: 'orion', name: 'Orion Hex', rarity: 'Epic', attack: 75, defense: 54, title: 'Celestial Tactician', element: 'Arcane' },
  { id: 'yukari', name: 'Yukari Zenith', rarity: 'Legendary', attack: 89, defense: 73, title: 'Sky Citadel Saint', element: 'Aether' },
  { id: 'shiro', name: 'Shiro Nightfall', rarity: 'Legendary', attack: 94, defense: 69, title: 'Abyss Crown', element: 'Dark' }
]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max)
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

function normalizeSave(raw: unknown): SaveState {
  const fallback: SaveState = {
    lastResetDate: getTodayKey(),
    packsRemaining: DAILY_PACKS,
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
    collection: candidate.collection && typeof candidate.collection === 'object' ? candidate.collection : {},
    pullLog: Array.isArray(candidate.pullLog) ? candidate.pullLog.filter((id) => typeof id === 'string').slice(0, 20) : []
  }
}

export function useGacha() {
  const save = useState<SaveState>('gacha-save', () => ({
    lastResetDate: getTodayKey(),
    packsRemaining: DAILY_PACKS,
    collection: {},
    pullLog: []
  }))
  const initialized = useState<boolean>('gacha-init', () => false)

  const allCharacters = characterPool

  function applyDailyReset() {
    const today = getTodayKey()
    if (save.value.lastResetDate !== today) {
      save.value.lastResetDate = today
      save.value.packsRemaining = DAILY_PACKS
    }
  }

  function ensureInitialized() {
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

    watch(
      save,
      (next) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      },
      { deep: true }
    )

    initialized.value = true
  }

  function pullPack() {
    applyDailyReset()
    if (save.value.packsRemaining <= 0) {
      return null
    }

    const rolledRarity = rollRarity()
    const rarityOptions = allCharacters.filter((item) => item.rarity === rolledRarity)
    const fallback = allCharacters.filter((item) => item.rarity === 'Common')
    const pool = rarityOptions.length ? rarityOptions : fallback
    const pulled = pool[randomInt(pool.length)]

    save.value.packsRemaining -= 1
    save.value.collection[pulled.id] = (save.value.collection[pulled.id] ?? 0) + 1
    save.value.pullLog = [pulled.id, ...save.value.pullLog].slice(0, 20)

    return pulled
  }

  function pullMany(count: number) {
    const results: Character[] = []
    const safeCount = Math.max(0, Math.min(count, save.value.packsRemaining))

    for (let index = 0; index < safeCount; index += 1) {
      const pulled = pullPack()
      if (pulled) {
        results.push(pulled)
      }
    }

    return results
  }

  function getCharacter(id: string) {
    return allCharacters.find((item) => item.id === id) ?? null
  }

  function battle(teamIds: string[]): BattleOutcome | null {
    const uniqueIds = Array.from(new Set(teamIds)).slice(0, 3)
    const playerTeam = uniqueIds.map((id) => getCharacter(id)).filter((item): item is Character => Boolean(item))
    if (!playerTeam.length) {
      return null
    }

    const enemyTeam = Array.from({ length: playerTeam.length }, () => allCharacters[randomInt(allCharacters.length)])

    const rounds: string[] = []
    let playerScore = 0
    let enemyScore = 0

    playerTeam.forEach((hero, index) => {
      const enemy = enemyTeam[index]
      const copies = save.value.collection[hero.id] ?? 1
      const bonus = Math.min(copies - 1, 8)

      const heroPower = hero.attack * 1.25 + hero.defense + bonus * 4 + randomInt(14)
      const enemyPower = enemy.attack * 1.25 + enemy.defense + randomInt(14)

      playerScore += heroPower
      enemyScore += enemyPower

      const line =
        heroPower >= enemyPower
          ? `${hero.name} outplays ${enemy.name}.`
          : `${enemy.name} overwhelms ${hero.name}.`
      rounds.push(line)
    })

    const won = playerScore >= enemyScore

    return {
      playerTeam,
      enemyTeam,
      playerScore: Math.round(playerScore),
      enemyScore: Math.round(enemyScore),
      won,
      rounds
    }
  }

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
        const rarityRank = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 }
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
      Legendary: 0
    }

    for (const item of collectionEntries.value) {
      base[item.character.rarity] += item.count
    }

    return base
  })

  return {
    allCharacters,
    rarityMeta,
    save,
    ensureInitialized,
    pullPack,
    pullMany,
    collectionEntries,
    recentPulls,
    rarityBreakdown,
    battle
  }
}
