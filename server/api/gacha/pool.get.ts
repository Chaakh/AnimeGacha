import { getCharacterPool } from '../../utils/gacha'

export default defineEventHandler(async () => {
  const characters = await getCharacterPool()

  return {
    characters,
    source: 'jikan-v4'
  }
})
