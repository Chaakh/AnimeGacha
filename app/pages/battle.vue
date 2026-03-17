<script setup lang="ts">
const { collectionEntries, battle, getDailyBoss } = useGacha()

const selectedIds = ref<string[]>([])
const outcome = ref<ReturnType<typeof battle> | null>(null)
const isBattling = ref(false)
const battleProgress = ref(0)
const revealedRounds = ref<string[]>([])
const battleRunToken = ref(0)

type CollectionEntry = (typeof collectionEntries.value)[number]

const dailyBoss = computed(() => getDailyBoss())

const selectedEntries = computed<CollectionEntry[]>(() => {
  return selectedIds.value
    .map((id) => collectionEntries.value.find((entry) => entry.character.id === id))
    .filter((entry): entry is CollectionEntry => Boolean(entry))
})

const projectedPlayerScore = computed(() => {
  return Math.round(
    selectedEntries.value.reduce((total, entry) => {
      const copies = Math.max(entry.count, 1)
      const bonus = Math.min(copies - 1, 8)
      return total + entry.character.attack * 1.5 + entry.character.defense + bonus * 7
    }, 0)
  )
})

const projectedBossScore = computed(() => {
  if (!dailyBoss.value) {
    return 0
  }
  return Math.round(dailyBoss.value.attack * 1.5 + dailyBoss.value.defense)
})

const matchupLabel = computed(() => {
  if (!dailyBoss.value) {
    return 'Boss data unavailable'
  }
  if (!selectedIds.value.length) {
    return 'Pick your first hero to preview raid odds'
  }

  const delta = projectedPlayerScore.value - projectedBossScore.value
  if (delta >= 100) {
    return 'Advantage: Team'
  }
  if (delta >= 20) {
    return 'Even Clash'
  }
  return 'Advantage: Boss'
})

const matchupClass = computed(() => {
  if (!selectedIds.value.length || !dailyBoss.value) {
    return 'is-idle'
  }

  const delta = projectedPlayerScore.value - projectedBossScore.value
  if (delta >= 100) {
    return 'is-favored'
  }
  if (delta >= 20) {
    return 'is-even'
  }
  return 'is-danger'
})

const activeRounds = computed(() => {
  if (isBattling.value) {
    return revealedRounds.value
  }

  return outcome.value?.rounds ?? []
})

const progressLabel = computed(() => {
  if (!isBattling.value) {
    if (!outcome.value) {
      return 'Ready for raid'
    }
    return outcome.value.won ? 'Raid complete: Victory' : 'Raid complete: Defeat'
  }

  if (battleProgress.value < 30) {
    return 'Opening engagement...'
  }
  if (battleProgress.value < 70) {
    return 'Heavy exchange...'
  }
  return 'Final strike...'
})

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toggleTeam(id: string) {
  if (isBattling.value) {
    return
  }

  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
    outcome.value = null
    return
  }

  if (selectedIds.value.length < 3) {
    selectedIds.value = [...selectedIds.value, id]
    outcome.value = null
  }
}

function clearTeam() {
  battleRunToken.value += 1
  isBattling.value = false
  battleProgress.value = 0
  revealedRounds.value = []
  selectedIds.value = []
  outcome.value = null
}

async function launchBattle() {
  if (isBattling.value) {
    return
  }

  const result = battle(selectedIds.value)
  if (!result) {
    return
  }

  const runToken = battleRunToken.value + 1
  battleRunToken.value = runToken
  isBattling.value = true
  outcome.value = null
  battleProgress.value = 6
  revealedRounds.value = []

  const totalSteps = Math.max(result.rounds.length + 1, 1)

  for (let index = 0; index < result.rounds.length; index += 1) {
    await wait(520)
    if (battleRunToken.value !== runToken) {
      return
    }

    const round = result.rounds[index]
    if (!round) {
      continue
    }

    revealedRounds.value = [...revealedRounds.value, round]
    battleProgress.value = Math.min(92, Math.round(((index + 1) / totalSteps) * 100))
  }

  await wait(420)
  if (battleRunToken.value !== runToken) {
    return
  }

  battleProgress.value = 100
  revealedRounds.value = result.rounds
  outcome.value = result
  isBattling.value = false
}
</script>

<template>
  <section class="panel raid-briefing">
    <div class="briefing-intro">
      <p class="eyebrow">Step 1</p>
      <h1 class="section-title">Raid Briefing: Daily Boss</h1>
      <p class="muted">Scout the target first, then draft a team built to counter its stats.</p>
    </div>

    <p v-if="!dailyBoss" class="muted empty-note">No boss data yet. Pull a pack to populate the raid roster.</p>

    <div v-else class="briefing-body">
      <div class="boss-card-wrap">
        <CharacterCard :character="dailyBoss" />
      </div>

      <div class="boss-dossier">
        <div class="dossier-top">
          <h2>{{ dailyBoss.name }}</h2>
          <span class="threat-chip" :class="`threat-${dailyBoss.rarity.toLowerCase()}`">{{ dailyBoss.rarity }} Threat</span>
        </div>
        <p class="muted">{{ dailyBoss.title }} | {{ dailyBoss.element }}</p>

        <div class="boss-metrics">
          <article>
            <small>ATK</small>
            <strong>{{ dailyBoss.attack }}</strong>
          </article>
          <article>
            <small>DEF</small>
            <strong>{{ dailyBoss.defense }}</strong>
          </article>
          <article>
            <small>Raid Power</small>
            <strong>{{ projectedBossScore }}</strong>
          </article>
        </div>

        <p class="boss-note">Boss stats are scaled for a 3v1 encounter. Duplicate hero copies add bonus score in battle.</p>
      </div>
    </div>
  </section>

  <section class="panel team-draft">
    <div class="draft-head">
      <div>
        <p class="eyebrow">Step 2</p>
        <h2 class="section-title">Assemble Your Team</h2>
        <p class="muted">Choose up to 3 heroes from your collection and launch the raid.</p>
      </div>

      <div class="draft-meta">
        <p class="slot-count"><strong>{{ selectedIds.length }}</strong> / 3 selected</p>
        <p class="matchup" :class="matchupClass">{{ matchupLabel }}</p>
        <p v-if="dailyBoss" class="muted projection">Projected power {{ projectedPlayerScore }} vs {{ projectedBossScore }}</p>
        <div class="head-buttons">
          <button class="button" :disabled="isBattling" @click="clearTeam">Clear</button>
          <button class="button button-main" :disabled="selectedIds.length === 0 || !dailyBoss || isBattling" @click="launchBattle">
            {{ isBattling ? 'Battling...' : 'Start Battle' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedEntries.length" class="selected-strip">
      <p class="muted strip-label">Current team</p>
      <div class="selected-chips">
        <span v-for="entry in selectedEntries" :key="entry.character.id" class="selected-chip">
          {{ entry.character.name }}
          <small>x{{ entry.count }}</small>
        </span>
      </div>
    </div>

    <p v-if="!collectionEntries.length" class="muted">
      Your roster is empty. Head to <NuxtLink to="/">Summon</NuxtLink> and open some packs first.
    </p>

    <div v-else class="roster-grid">
      <button
        v-for="entry in collectionEntries"
        :key="entry.character.id"
        class="pick"
        :class="{ disabled: isBattling || (selectedIds.length >= 3 && !selectedIds.includes(entry.character.id)) }"
        :disabled="isBattling || (selectedIds.length >= 3 && !selectedIds.includes(entry.character.id))"
        :aria-pressed="selectedIds.includes(entry.character.id)"
        @click="toggleTeam(entry.character.id)"
      >
        <CharacterCard
          :character="entry.character"
          :count="entry.count"
          :selected="selectedIds.includes(entry.character.id)"
        />
      </button>
    </div>
  </section>

  <section v-if="isBattling || outcome" class="panel result">
    <div class="result-head">
      <h2 class="section-title">{{ isBattling ? 'Raid In Progress' : 'Battle Report' }}</h2>
      <p v-if="isBattling" class="winner is-even">Simulating raid...</p>
      <p v-else-if="outcome" class="winner" :class="{ win: outcome.won, loss: !outcome.won }">
        {{ outcome.won ? 'Victory!' : 'Defeat.' }} Score {{ outcome.playerScore }} - {{ outcome.enemyScore }}
      </p>
    </div>

    <div class="progress-shell" :class="{ active: isBattling }">
      <div class="progress-meta">
        <span>{{ progressLabel }}</span>
        <strong>{{ battleProgress }}%</strong>
      </div>
      <div class="progress-track">
        <span :style="{ width: `${battleProgress}%` }" />
      </div>
    </div>

    <h3>{{ isBattling ? 'Live Round Log' : 'Round Log' }}</h3>
    <ul class="log-list">
      <li v-if="isBattling && !activeRounds.length" class="muted">Raid is starting...</li>
      <li v-for="(line, index) in activeRounds" :key="`${index}-${line}`">{{ line }}</li>
    </ul>

    <div v-if="outcome" class="report-grid">
      <div class="report-block">
        <h3>Your Team</h3>
        <ul>
          <li v-for="hero in outcome.playerTeam" :key="hero.id">{{ hero.name }} (ATK {{ hero.attack }} | DEF {{ hero.defense }})</li>
        </ul>
      </div>

      <div class="report-block boss-side">
        <h3>Enemy Boss</h3>
        <ul>
          <li v-for="(enemy, index) in outcome.enemyTeam" :key="`${enemy.id}-${index}`">
            <strong class="boss-name">{{ enemy.name }}</strong>
            <span class="boss-stats">ATK {{ enemy.attack }} | DEF {{ enemy.defense }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.eyebrow {
  margin: 0 0 0.3rem;
  font-size: 0.78rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--gold-soft);
}

.raid-briefing {
  position: relative;
  overflow: hidden;
  padding: 1rem;
  background:
    radial-gradient(circle at 84% 22%, rgb(255 98 98 / 15%) 0%, transparent 40%),
    radial-gradient(circle at 6% 82%, rgb(247 201 72 / 10%) 0%, transparent 36%),
    linear-gradient(180deg, rgb(29 19 22 / 92%) 0%, rgb(11 11 15 / 95%) 100%);
}

.briefing-intro p {
  margin-top: 0.35rem;
}

.empty-note {
  margin-top: 0.8rem;
}

.briefing-body {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: minmax(220px, 290px) 1fr;
  gap: 0.95rem;
}

.boss-card-wrap {
  max-width: 290px;
}

.boss-dossier {
  border: 1px solid rgb(255 120 120 / 24%);
  border-radius: 12px;
  padding: 0.9rem;
  background: linear-gradient(180deg, rgb(30 16 19 / 58%) 0%, rgb(11 11 14 / 75%) 100%);
}

.dossier-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.dossier-top h2 {
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(1.25rem, 2.5vw, 1.65rem);
}

.threat-chip {
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 16%);
  padding: 0.2rem 0.55rem;
  font-size: 0.76rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  background: rgb(16 18 28 / 72%);
}

.threat-common,
.threat-rare {
  color: #9ed8ff;
  border-color: rgb(90 193 253 / 55%);
}

.threat-epic {
  color: #efb1ff;
  border-color: rgb(219 111 255 / 65%);
}

.threat-legendary {
  color: #ffe39c;
  border-color: rgb(247 201 72 / 70%);
}

.threat-mythic {
  color: #ffb6f2;
  border-color: rgb(255 79 216 / 75%);
}

.boss-dossier p {
  margin: 0.45rem 0 0;
}

.boss-metrics {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.boss-metrics article {
  border: 1px solid rgb(255 130 130 / 24%);
  border-radius: 10px;
  padding: 0.45rem 0.5rem;
  background: rgb(12 12 18 / 72%);
}

.boss-metrics small {
  display: block;
  color: var(--ink-soft);
}

.boss-metrics strong {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.14rem;
}

.boss-note {
  margin-top: 0.8rem;
  font-size: 0.87rem;
  color: #efc7b4;
}

.team-draft {
  margin-top: 0.9rem;
  padding: 1rem;
}

.draft-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.draft-head p {
  margin-top: 0.35rem;
}

.draft-meta {
  text-align: right;
}

.slot-count {
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.05rem;
}

.matchup {
  margin: 0.25rem 0 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
}

.is-idle {
  color: var(--ink-soft);
}

.is-favored {
  color: var(--emerald);
}

.is-even {
  color: var(--gold-soft);
}

.is-danger {
  color: var(--danger);
}

.projection {
  margin: 0.18rem 0 0;
  font-size: 0.82rem;
}

.head-buttons {
  margin-top: 0.45rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.selected-strip {
  margin: 0.9rem 0 0.7rem;
}

.strip-label {
  margin: 0;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
}

.selected-chips {
  margin-top: 0.4rem;
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.selected-chip {
  border: 1px solid rgb(247 201 72 / 40%);
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  background: rgb(25 18 7 / 55%);
  color: #ffe3a5;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.selected-chip small {
  margin-left: 0.25rem;
  color: var(--ink-soft);
  font-weight: 600;
}

.roster-grid {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(205px, 1fr));
  gap: 0.75rem;
}

.pick {
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pick:disabled {
  cursor: not-allowed;
}

.pick.disabled {
  opacity: 0.55;
}

.result {
  margin-top: 0.9rem;
  padding: 1rem;
}

.result-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.winner {
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.08rem;
}

.progress-shell {
  margin-top: 0.8rem;
  border: 1px solid rgb(247 201 72 / 24%);
  border-radius: 12px;
  padding: 0.65rem;
  background: rgb(16 14 10 / 62%);
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}

.progress-meta span {
  color: #f6e5bc;
}

.progress-track {
  margin-top: 0.45rem;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgb(255 255 255 / 10%);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f7c948 0%, #ff8f5f 52%, #ff6b6b 100%);
  transition: width 240ms ease;
}

.progress-shell.active .progress-track span {
  animation: progressPulse 1s ease-in-out infinite;
}

.win {
  color: var(--emerald);
}

.loss {
  color: var(--danger);
}

.report-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.report-block {
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 12px;
  padding: 0.7rem;
  background: rgb(12 14 18 / 70%);
}

.boss-side {
  border-color: rgb(255 109 109 / 36%);
  background: linear-gradient(180deg, rgb(32 14 18 / 55%) 0%, rgb(12 12 16 / 75%) 100%);
}

h3 {
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
}

ul {
  margin: 0.55rem 0 0;
  padding-left: 1.05rem;
}

li {
  margin: 0.32rem 0;
}

.boss-name {
  color: #ff9494;
}

.boss-stats {
  margin-left: 0.38rem;
  color: #ccc;
  font-size: 0.86rem;
}

.log-list {
  margin-top: 0.55rem;
}

@keyframes progressPulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.15);
  }
}

@media (max-width: 920px) {
  .briefing-body {
    grid-template-columns: 1fr;
  }

  .boss-card-wrap {
    width: min(100%, 320px);
  }
}

@media (max-width: 780px) {
  .draft-meta {
    text-align: left;
    width: 100%;
  }

  .head-buttons {
    justify-content: flex-start;
  }

  .report-grid,
  .boss-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
