<script setup lang="ts">
const props = defineProps<{
  character: {
    id: string
    name: string
    title: string
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'
    attack: number
    defense: number
    element: string
    imageUrl: string
  }
  count?: number
  selected?: boolean
}>()

const rarityClass = computed(() => `rarity-${props.character.rarity.toLowerCase()}`)
const brokenImage = ref(false)
</script>

<template>
  <article class="card" :class="[rarityClass, { selected }]">
    <div class="portrait" :aria-label="character.name">
      <img v-if="!brokenImage" :src="character.imageUrl" :alt="character.name" loading="lazy" @error="brokenImage = true" />
      <span v-else class="fallback-mark">?</span>

      <span class="rarity-tag">{{ character.rarity }}</span>
      <span v-if="count" class="copies">x{{ count }}</span>

      <div class="fan-meta">
        <h3>{{ character.name }}</h3>
        <p class="subtitle">{{ character.title }}</p>
        <div class="fan-stats">
          <span class="atk">ATK {{ character.attack }}</span>
          <span class="def">DEF {{ character.defense }}</span>
          <span class="elm">{{ character.element }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  border: 2px solid rgb(255 216 127 / 40%);
  overflow: hidden;
  background: rgb(14 16 22 / 88%);
  box-shadow: 0 16px 28px rgb(0 0 0 / 30%), 0 0 0 2px rgb(255 255 255 / 8%);
}

.rarity-tag,
.copies {
  position: absolute;
  top: 8px;
  z-index: 2;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.18rem 0.5rem;
  font-size: 0.73rem;
  letter-spacing: 0.06em;
}

.rarity-tag {
  left: 8px;
  color: #e4ecff;
  border: 1px solid rgb(149 170 214 / 40%);
  background: rgb(15 18 27 / 88%);
}

.copies {
  right: 8px;
  border: 1px solid rgb(65 173 236 / 58%);
  color: #9ce5ff;
  background: rgb(10 14 22 / 86%);
}

.portrait {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.fallback-mark {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: 'Rajdhani', sans-serif;
  font-size: 2.9rem;
  font-weight: 700;
  color: rgb(239 245 255 / 90%);
  text-shadow: 0 5px 20px rgb(71 167 255 / 45%);
}

.fan-meta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.55rem;
  background: linear-gradient(180deg, transparent 0%, rgb(10 12 18 / 96%) 68%);
}

h3 {
  margin: 0;
  font-size: 0.98rem;
  text-shadow: 0 1px 6px rgb(0 0 0 / 55%);
}

.subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.76rem;
  color: var(--ink-soft);
}

.fan-stats {
  margin-top: 0.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.fan-stats span {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.77rem;
  padding: 0.2rem 0.4rem;
  border-radius: 8px;
  border: 1px solid rgb(255 255 255 / 20%);
  background: rgb(10 12 18 / 88%);
}

.fan-stats .atk {
  color: #ff8d8d;
  border-color: rgb(255 132 132 / 40%);
}

.fan-stats .def {
  color: #8ad5ff;
  border-color: rgb(122 204 252 / 40%);
}

.fan-stats .elm {
  color: #ffe08e;
  border-color: rgb(255 224 142 / 40%);
}

.selected {
  border-color: rgb(255 202 96 / 74%);
  box-shadow: 0 10px 30px rgb(255 191 70 / 22%);
}

.rarity-rare .rarity-tag {
  border-color: rgb(90 193 253 / 66%);
  color: #95e3ff;
}

.rarity-rare {
  border-color: rgb(90 193 253);
  border-width: 3px;
  box-shadow:
    0 10px 28px rgb(35 116 161 / 24%),
    0 0 0 3px rgb(90 193 253 / 58%),
    0 0 24px rgb(90 193 253 / 62%),
    inset 0 0 16px rgb(90 193 253 / 24%);
}

.rarity-epic .rarity-tag {
  border-color: rgb(219 111 255 / 70%);
  color: #efb1ff;
}

.rarity-epic {
  border-color: rgb(219 111 255);
  border-width: 3px;
  box-shadow:
    0 10px 28px rgb(133 54 156 / 26%),
    0 0 0 3px rgb(219 111 255 / 62%),
    0 0 26px rgb(219 111 255 / 68%),
    inset 0 0 16px rgb(219 111 255 / 26%);
}

.rarity-legendary .rarity-tag {
  border-color: rgb(247 201 72 / 76%);
  color: #ffe29f;
}

.rarity-mythic .rarity-tag {
  border-color: rgb(255 79 216 / 82%);
  color: #ffb7f2;
}

.rarity-legendary {
  border-color: rgb(247 201 72);
  border-width: 3px;
  box-shadow:
    0 10px 28px rgb(171 129 24 / 30%),
    0 0 0 3px rgb(247 201 72 / 72%),
    0 0 28px rgb(247 201 72 / 78%),
    inset 0 0 18px rgb(247 201 72 / 30%);
}

.rarity-mythic {
  border-color: rgb(255 79 216);
  border-width: 3px;
  box-shadow:
    0 10px 28px rgb(160 44 135 / 34%),
    0 0 0 3px rgb(255 79 216 / 78%),
    0 0 30px rgb(255 79 216 / 85%),
    inset 0 0 20px rgb(255 79 216 / 35%);
}
</style>
