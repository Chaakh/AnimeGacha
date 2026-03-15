<script setup lang="ts">
const props = defineProps<{
  character: {
    id: string
    name: string
    title: string
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'
    attack: number
    defense: number
    element: string
  }
  count?: number
  selected?: boolean
}>()

const rarityClass = computed(() => `rarity-${props.character.rarity.toLowerCase()}`)
</script>

<template>
  <article class="card panel" :class="[rarityClass, { selected }]">
    <header class="card-head">
      <span class="rarity-pill">{{ character.rarity }}</span>
      <span v-if="count" class="copies">x{{ count }}</span>
    </header>

    <div class="portrait" :aria-label="character.name">
      <span>{{ character.name.slice(0, 1) }}</span>
    </div>

    <h3>{{ character.name }}</h3>
    <p class="muted subtitle">{{ character.title }}</p>

    <div class="stats">
      <span>ATK {{ character.attack }}</span>
      <span>DEF {{ character.defense }}</span>
      <span>{{ character.element }}</span>
    </div>
  </article>
</template>

<style scoped>
.card {
  padding: 0.9rem;
  display: grid;
  gap: 0.7rem;
  border-width: 1px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rarity-pill,
.copies {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.82rem;
}

.rarity-pill {
  border: 1px solid rgb(106 128 172 / 44%);
  background: rgb(40 54 84 / 62%);
}

.copies {
  border: 1px solid rgb(65 173 236 / 36%);
  color: #9ce5ff;
}

.portrait {
  height: 106px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(97 128 177 / 52%);
  background:
    radial-gradient(circle at 20% 20%, rgb(115 172 255 / 35%) 0%, transparent 45%),
    radial-gradient(circle at 80% 70%, rgb(188 97 255 / 34%) 0%, transparent 45%),
    linear-gradient(165deg, rgb(27 40 70 / 90%) 0%, rgb(13 21 39 / 94%) 100%);
}

.portrait span {
  font-family: 'Rajdhani', sans-serif;
  font-size: 2.9rem;
  font-weight: 700;
  color: rgb(239 245 255 / 90%);
  text-shadow: 0 5px 20px rgb(71 167 255 / 45%);
}

h3 {
  margin: 0;
  font-size: 1.1rem;
}

.subtitle {
  margin: 0;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.stats span {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  padding: 0.18rem 0.45rem;
  border-radius: 8px;
  border: 1px solid rgb(67 92 137 / 48%);
  background: rgb(20 30 53 / 80%);
}

.selected {
  border-color: rgb(255 202 96 / 74%);
  box-shadow: 0 10px 30px rgb(255 191 70 / 22%);
}

.rarity-rare .rarity-pill {
  border-color: rgb(90 193 253 / 66%);
  color: #95e3ff;
}

.rarity-epic .rarity-pill {
  border-color: rgb(219 111 255 / 70%);
  color: #efb1ff;
}

.rarity-legendary .rarity-pill {
  border-color: rgb(247 201 72 / 76%);
  color: #ffe29f;
}
</style>
