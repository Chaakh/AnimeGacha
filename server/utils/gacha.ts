type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

export interface Character {
  id: string
  name: string
  rarity: Rarity
  attack: number
  defense: number
  title: string
  element: string
  imageUrl: string
}

interface JikanCharacter {
  mal_id: number
  name: string
  nicknames?: string[]
  favorites?: number
  about?: string | null
  images?: {
    jpg?: { image_url?: string }
    webp?: { image_url?: string }
  }
}

const CACHE_MS = 1000 * 60 * 30

let cachedPool: Character[] | null = null
let cachedAt = 0

const rarityMeta: Record<Rarity, { weight: number; bonus: number }> = {
  Common: { weight: 52, bonus: 0 },
  Rare: { weight: 27, bonus: 6 },
  Epic: { weight: 12, bonus: 14 },
  Legendary: { weight: 7, bonus: 22 },
  Mythic: { weight: 2, bonus: 30 }
}

const fallbackPool: Character[] = [
  {
    id: 'fallback-1',
    name: 'Akari Bladewind',
    rarity: 'Common',
    attack: 42,
    defense: 30,
    title: 'Rooftop Duelist',
    element: 'Wind',
    imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif'
  },
  {
    id: 'fallback-2',
    name: 'Sora Tideveil',
    rarity: 'Rare',
    attack: 57,
    defense: 41,
    title: 'Tidal Songblade',
    element: 'Water',
    imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif'
  },
  {
    id: 'fallback-3',
    name: 'Izumi Voidstep',
    rarity: 'Epic',
    attack: 70,
    defense: 58,
    title: 'Silent Riftblade',
    element: 'Void',
    imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif'
  },
  {
    id: 'fallback-4',
    name: 'Yukari Zenith',
    rarity: 'Legendary',
    attack: 89,
    defense: 73,
    title: 'Sky Citadel Saint',
    element: 'Aether',
    imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif'
  },
  {
    id: 'fallback-5',
    name: 'Shiro Nightfall',
    rarity: 'Mythic',
    attack: 96,
    defense: 78,
    title: 'Abyss Crown',
    element: 'Dark',
    imageUrl: 'https://cdn.myanimelist.net/images/questionmark_23.gif'
  }
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function pickRarityByPopularity(rank: number, total: number, favorites: number): Rarity {
  const safeTotal = Math.max(1, total)
  const percentile = rank / safeTotal

  if (favorites >= 165000 || percentile <= 0.03) {
    return 'Mythic'
  }
  if (favorites >= 140000 || percentile <= 0.08) {
    return 'Legendary'
  }
  if (favorites >= 80000 || percentile <= 0.25) {
    return 'Epic'
  }
  if (favorites >= 30000 || percentile <= 0.6) {
    return 'Rare'
  }
  return 'Common'
}

function normalizeElement(character: JikanCharacter) {
  const raw = (character.about || '').toLowerCase()
  if (raw.includes('fire')) return 'Fire'
  if (raw.includes('water')) return 'Water'
  if (raw.includes('wind')) return 'Wind'
  if (raw.includes('lightning')) return 'Storm'
  if (raw.includes('dark')) return 'Shadow'
  if (raw.includes('light')) return 'Light'
  if (raw.includes('magic')) return 'Arcane'
  return 'Arcane'
}

function isLikelyMainCharacter(character: JikanCharacter) {
  const text = `${character.about || ''} ${(character.nicknames || []).join(' ')}`.toLowerCase()
  return (
    text.includes('main protagonist') ||
    text.includes('main character') ||
    text.includes('protagonist') ||
    text.includes('deuteragonist') ||
    text.includes('main heroine') ||
    text.includes('main hero') ||
    text.includes('lead character') ||
    text.includes('central character')
  )
}

function mapTopCharacterToCard(character: JikanCharacter, rank: number, total: number): Character {
  const favorites = character.favorites ?? 500
  const baseRarity = pickRarityByPopularity(rank, total, favorites)
  const rarity: Rarity = baseRarity === 'Common' && isLikelyMainCharacter(character) ? 'Rare' : baseRarity
  const bonus = rarityMeta[rarity].bonus
  const seed = character.mal_id
  const jitterA = seed % 9
  const jitterD = (seed * 3) % 11

  const normalizedFav = Math.log10(Math.max(1, favorites))
  const attack = clamp(Math.round(normalizedFav * 4.5 + 28 + bonus + jitterA), 25, 99)
  const defense = clamp(Math.round(normalizedFav * 4 + 22 + bonus * 0.8 + jitterD), 20, 95)
  const element = normalizeElement(character)
  const alias = character.nicknames?.[0] || 'Elite Fighter'
  const imageUrl =
    character.images?.webp?.image_url || character.images?.jpg?.image_url || 'https://cdn.myanimelist.net/images/questionmark_23.gif'

  return {
    id: `mal-char-${character.mal_id}`,
    name: character.name || `Character ${character.mal_id}`,
    rarity,
    attack,
    defense,
    title: alias,
    element,
    imageUrl
  }
}

async function fetchTopCharacters() {
  const pages = Array.from({ length: 8 }, (_, index) => index + 1)
  const chunks: Array<{ data: JikanCharacter[] }> = []

  for (const page of pages) {
    try {
      const chunk = await $fetch<{ data: JikanCharacter[] }>('https://api.jikan.moe/v4/top/characters', {
        query: { page, limit: 25 }
      })
      chunks.push(chunk)
    } catch {
      continue
    }
  }

  if (!chunks.length) {
    throw new Error('Failed to fetch character pages from Jikan')
  }

  const deduped = new Map<number, JikanCharacter>()
  for (const chunk of chunks) {
    for (const character of chunk.data || []) {
      if (!deduped.has(character.mal_id)) {
        deduped.set(character.mal_id, character)
      }
    }
  }

  return Array.from(deduped.values()).sort((left, right) => {
    return (right.favorites ?? 0) - (left.favorites ?? 0)
  })
}

export async function getCharacterPool() {
  const now = Date.now()
  if (cachedPool && now - cachedAt < CACHE_MS) {
    return cachedPool
  }

  try {
    const characterList = await fetchTopCharacters()
    const mapped = characterList.map((character, index) => mapTopCharacterToCard(character, index, characterList.length))
    cachedPool = mapped.length ? mapped : fallbackPool
    cachedAt = now
    return cachedPool
  } catch {
    if (cachedPool?.length) {
      return cachedPool
    }
    cachedPool = fallbackPool
    cachedAt = now
    return cachedPool
  }
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

export function summonFromPool(pool: Character[], count: number) {
  const safeCount = Math.max(1, Math.min(50, Math.floor(count)))
  const pulls: Character[] = []
  const recentIds: string[] = []
  let currentPackIds = new Set<string>()

  const PACK_SIZE = 5

  function pickFrom(candidates: Character[]) {
    const pick = candidates[randomInt(candidates.length)]
    return pick || null
  }

  for (let index = 0; index < safeCount; index += 1) {
    if (index % PACK_SIZE === 0) {
      currentPackIds = new Set<string>()
    }

    const rolledRarity = rollRarity()
    const rarityPool = pool.filter((entry) => entry.rarity === rolledRarity)
    const basePool = rarityPool.length ? rarityPool : pool

    const uniqueInPack = basePool.filter((entry) => !currentPackIds.has(entry.id))
    const uniqueAndFresh = uniqueInPack.filter((entry) => !recentIds.includes(entry.id))

    let pick = pickFrom(uniqueAndFresh)
    if (!pick) {
      pick = pickFrom(uniqueInPack)
    }
    if (!pick) {
      pick = pickFrom(basePool)
    }

    if (pick) {
      pulls.push(pick)
      currentPackIds.add(pick.id)
      recentIds.push(pick.id)
      if (recentIds.length > 8) {
        recentIds.shift()
      }
    }
  }

  return pulls
}
