<script setup lang="ts">
const { save, pullPack, pullMany, recentPulls, rarityMeta } = useGacha()

const reveal = ref<ReturnType<typeof pullPack> | null>(null)

function summonOne() {
  reveal.value = pullPack()
}

function summonAll() {
  const results = pullMany(save.value.packsRemaining)
  reveal.value = results[0] ?? null
}
</script>

<template>
  <section class="hero panel">
    <div class="hero-copy">
      <p class="kicker">ANIME SUMMON HUB</p>
      <h1>Roll your daily packs, build your roster, dominate arena battles.</h1>
      <p class="muted">
        You get <strong>10 packs every day</strong>. Pull heroes with rarity tiers, then use your strongest lineup in battle.
      </p>

      <div class="actions">
        <button class="button button-main" :disabled="save.packsRemaining <= 0" @click="summonOne">
          Open 1 Pack
        </button>
        <button class="button" :disabled="save.packsRemaining <= 0" @click="summonAll">
          Open All ({{ save.packsRemaining }})
        </button>
      </div>
    </div>

    <aside class="counter panel">
      <p class="counter-label">Packs Left Today</p>
      <p class="counter-value">{{ save.packsRemaining }}</p>
      <p class="muted tiny">Resets at your local midnight.</p>
    </aside>
  </section>

  <section class="result-wrap grid2">
    <article class="panel result">
      <h2 class="section-title">Latest Pull</h2>
      <div v-if="reveal" class="reveal-card" :class="`tone-${reveal.rarity.toLowerCase()}`">
        <h3>{{ reveal.name }}</h3>
        <p>{{ reveal.title }}</p>
        <div class="stats">
          <span>{{ reveal.rarity }}</span>
          <span>ATK {{ reveal.attack }}</span>
          <span>DEF {{ reveal.defense }}</span>
        </div>
      </div>
      <p v-else class="muted">Open a pack to reveal a character.</p>
    </article>

    <article class="panel odds">
      <h2 class="section-title">Drop Rates</h2>
      <ul>
        <li v-for="(meta, rarity) in rarityMeta" :key="rarity">
          <span>{{ rarity }}</span>
          <strong>{{ meta.weight }}%</strong>
        </li>
      </ul>
    </article>
  </section>

  <section class="panel history">
    <h2 class="section-title">Recent Pulls</h2>
    <p v-if="!recentPulls.length" class="muted">No pulls yet. Your squad starts today.</p>
    <div v-else class="history-grid">
      <CharacterCard v-for="(character, index) in recentPulls.slice(0, 6)" :key="`${character.id}-${index}`" :character="character" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 1.25rem;
  display: grid;
  grid-template-columns: 1.6fr 0.8fr;
  gap: 1rem;
}

.hero-copy h1 {
  margin: 0.25rem 0 0.45rem;
  max-width: 22ch;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(1.9rem, 3.4vw, 3rem);
  line-height: 1.05;
}

.kicker {
  margin: 0;
  color: var(--cyan);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.counter {
  padding: 1rem;
  text-align: center;
  align-self: center;
}

.counter-label,
.tiny {
  margin: 0;
}

.counter-label {
  color: var(--ink-soft);
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.06em;
}

.counter-value {
  margin: 0.35rem 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(2.5rem, 5vw, 3.4rem);
  font-weight: 700;
  color: var(--gold);
}

.grid2 {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: 1.5fr 1fr;
}

.result,
.odds,
.history {
  padding: 1rem;
}

.reveal-card {
  margin-top: 0.8rem;
  border: 1px solid rgb(79 105 155 / 64%);
  border-radius: 12px;
  padding: 0.85rem;
  background: rgb(20 30 55 / 84%);
}

.reveal-card h3,
.reveal-card p {
  margin: 0;
}

.reveal-card p {
  margin-top: 0.3rem;
  color: var(--ink-soft);
}

.stats {
  margin-top: 0.65rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stats span {
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  background: rgb(31 46 80 / 92%);
  border: 1px solid rgb(88 119 176 / 56%);
}

.tone-rare {
  border-color: rgb(74 191 255 / 75%);
}

.tone-epic {
  border-color: rgb(219 111 255 / 74%);
}

.tone-legendary {
  border-color: rgb(247 201 72 / 82%);
  background: linear-gradient(170deg, rgb(57 38 8 / 70%) 0%, rgb(24 21 13 / 82%) 100%);
}

.odds ul {
  list-style: none;
  margin: 0.8rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.odds li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgb(64 89 134 / 48%);
  border-radius: 10px;
  padding: 0.42rem 0.6rem;
}

.history {
  margin-top: 1rem;
}

.history-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

@media (max-width: 860px) {
  .hero,
  .grid2 {
    grid-template-columns: 1fr;
  }
}
</style>
