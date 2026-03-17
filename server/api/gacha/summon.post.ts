import { getCharacterPool, summonFromPool } from '../../utils/gacha'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ count?: number }>(event)
  const count = body?.count ?? 1

  const pool = await getCharacterPool()
  const pulls = summonFromPool(pool, count)

  return {
    pulls,
    source: 'jikan-v4'
  }
})
