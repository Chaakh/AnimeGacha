<script setup lang="ts">
const { collectionEntries, battle, getDailyBoss } = useGacha()

const selectedIds = ref<string[]>([])
const outcome = ref<ReturnType<typeof battle> | null>(null)
const isBattling = ref(false)
const battleProgress = ref(0)
const battleRunToken = ref(0)
const activeTurnIndex = ref(-1)

interface BattleTurn {
  id: string
  actor: 'hero' | 'boss'
  actorName: string
  text: string
  turnNumber: number
}

const battleTurns = ref<BattleTurn[]>([])
const revealedTurns = ref<BattleTurn[]>([])

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

const activeBoss = computed(() => {
  return outcome.value?.enemyTeam[0] ?? dailyBoss.value ?? null
})

const activeTeam = computed(() => {
  if (outcome.value?.playerTeam.length) {
    return outcome.value.playerTeam
  }
  return selectedEntries.value.map((entry) => entry.character)
})

const visibleTurns = computed(() => {
  if (isBattling.value) {
    return revealedTurns.value
  }
  return battleTurns.value
})

const currentTurn = computed(() => {
  if (!battleTurns.value.length) {
    return null
  }

  if (isBattling.value && activeTurnIndex.value < 0) {
    return null
  }

  const fallbackIndex = battleTurns.value.length - 1
  const safeIndex = activeTurnIndex.value >= 0 ? Math.min(activeTurnIndex.value, fallbackIndex) : fallbackIndex
  return battleTurns.value[safeIndex] ?? null
})

const progressLabel = computed(() => {
  if (!isBattling.value) {
    if (!outcome.value) {
      return 'Ready for raid'
    }
    return outcome.value.won ? 'Raid complete: Victory' : 'Raid complete: Defeat'
  }

  if (!currentTurn.value) {
    return 'Drawing first turn...'
  }

  return `${currentTurn.value.actorName} is attacking`
})

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toBattleTurns(result: NonNullable<ReturnType<typeof battle>>): BattleTurn[] {
  const bossName = result.enemyTeam[0]?.name ?? 'Raid Boss'

  return result.rounds.map((line, index) => {
    const lowered = line.toLowerCase()
    const isBossTurn = lowered.includes('raid boss') || lowered.includes('boss')
    const matchedHero = result.playerTeam.find((hero) => line.startsWith(hero.name))

    return {
      id: `${index}-${line}`,
      actor: isBossTurn ? 'boss' : 'hero',
      actorName: isBossTurn ? bossName : matchedHero?.name ?? 'Hero Squad',
      text: line,
      turnNumber: index + 1
    }
  })
}

function resetBattlePresentation(clearSelection = false) {
  battleRunToken.value += 1
  isBattling.value = false
  battleProgress.value = 0
  activeTurnIndex.value = -1
  revealedTurns.value = []
  battleTurns.value = []
  outcome.value = null

  if (clearSelection) {
    selectedIds.value = []
  }
}

function toggleTeam(id: string) {
  if (isBattling.value) {
    return
  }

  if (selectedIds.value.includes(id)) {
    resetBattlePresentation()
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
    return
  }

  if (selectedIds.value.length < 3) {
    resetBattlePresentation()
    selectedIds.value = [...selectedIds.value, id]
  }
}

function clearTeam() {
  resetBattlePresentation(true)
}

async function launchBattle() {
  if (isBattling.value) {
    return
  }

  const result = battle(selectedIds.value)
  if (!result) {
    return
  }

  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const turns = toBattleTurns(result)
  if (!turns.length) {
    return
  }

  const runToken = battleRunToken.value + 1
  battleRunToken.value = runToken
  isBattling.value = true
  activeTurnIndex.value = -1
  battleTurns.value = turns
  revealedTurns.value = []
  outcome.value = null
  battleProgress.value = 6

  const totalSteps = Math.max(turns.length + 1, 1)

  for (let index = 0; index < turns.length; index += 1) {
    await wait(520)
    if (battleRunToken.value !== runToken) {
      return
    }

    const turn = turns[index]
    if (!turn) {
      continue
    }

    activeTurnIndex.value = index
    revealedTurns.value = [...revealedTurns.value, turn]
    battleProgress.value = Math.min(92, Math.round(((index + 1) / totalSteps) * 100))
  }

  await wait(420)
  if (battleRunToken.value !== runToken) {
    return
  }

  battleProgress.value = 100
  activeTurnIndex.value = turns.length - 1
  revealedTurns.value = turns
  outcome.value = result
  isBattling.value = false
}
</script>

<template>
  <section v-if="isBattling || outcome" class="panel result">
    <div class="result-head">
      <h2 class="section-title">{{ isBattling ? 'Raid Battle' : 'Raid Report' }}</h2>
      <p v-if="isBattling" class="winner is-even">Battle in progress...</p>
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

    <div class="turn-board">
      <article class="turn-side hero-turn-side" :class="{ active: currentTurn?.actor === 'hero' }">
        <small>Hero Turn</small>
        <p>{{ currentTurn?.actor === 'hero' ? `${currentTurn.actorName} is acting` : 'Waiting for hero action' }}</p>
      </article>

      <div class="turn-mid">
        <strong v-if="currentTurn">Turn {{ currentTurn.turnNumber }} / {{ battleTurns.length }}</strong>
        <strong v-else>Preparing turn order...</strong>
      </div>

      <article class="turn-side boss-turn-side" :class="{ active: currentTurn?.actor === 'boss' }">
        <small>Boss Turn</small>
        <p>{{ currentTurn?.actor === 'boss' ? `${currentTurn.actorName} is acting` : 'Boss is charging' }}</p>
      </article>
    </div>

    <div class="turn-lineups">
      <div class="lineup-row">
        <span class="lineup-label">Heroes</span>
        <div class="lineup-chips">
          <span
            v-for="hero in activeTeam"
            :key="hero.id"
            class="lineup-chip"
            :class="{ spotlight: currentTurn?.actor === 'hero' && currentTurn?.actorName === hero.name }"
          >
            {{ hero.name }}
          </span>
        </div>
      </div>

      <div class="lineup-row">
        <span class="lineup-label">Boss</span>
        <div class="lineup-chips">
          <span class="lineup-chip boss-chip" :class="{ spotlight: currentTurn?.actor === 'boss' }">
            {{ activeBoss?.name ?? 'Raid Boss' }}
          </span>
        </div>
      </div>
    </div>

    <h3>Turn Feed</h3>
    <ul class="turn-feed">
      <li v-if="isBattling && !visibleTurns.length" class="turn-card muted">Waiting for opening move...</li>
      <li
        v-for="turn in visibleTurns"
        :key="turn.id"
        class="turn-card"
        :class="[turn.actor, { current: currentTurn?.id === turn.id }]"
      >
        <div class="turn-card-head">
          <span>Turn {{ turn.turnNumber }}</span>
          <span class="turn-badge">{{ turn.actor === 'boss' ? 'Boss Attack' : 'Hero Attack' }}</span>
        </div>
        <p>{{ turn.text }}</p>
      </li>
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
  margin-bottom: 0.9rem;
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

.turn-board {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  align-items: stretch;
}

.turn-side,
.turn-mid {
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 10px;
  padding: 0.55rem 0.6rem;
  background: rgb(12 14 18 / 70%);
}

.turn-side small {
  display: block;
  color: var(--ink-soft);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

.turn-side p {
  margin: 0.22rem 0 0;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}

.turn-mid {
  display: grid;
  place-items: center;
  text-align: center;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.hero-turn-side.active {
  border-color: rgb(102 217 255 / 60%);
  box-shadow: inset 0 0 18px rgb(102 217 255 / 16%);
}

.boss-turn-side.active {
  border-color: rgb(255 109 109 / 62%);
  box-shadow: inset 0 0 18px rgb(255 109 109 / 16%);
}

.turn-lineups {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.5rem;
}

.lineup-row {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 0.55rem;
  align-items: start;
}

.lineup-label {
  font-size: 0.76rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-soft);
  padding-top: 0.26rem;
}

.lineup-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.lineup-chip {
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  background: rgb(12 14 20 / 72%);
  font-size: 0.84rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}

.boss-chip {
  border-color: rgb(255 109 109 / 35%);
  color: #ffd0d0;
}

.lineup-chip.spotlight {
  border-color: rgb(247 201 72 / 75%);
  box-shadow: 0 0 14px rgb(247 201 72 / 20%);
}

.turn-feed {
  list-style: none;
  padding: 0;
  margin: 0.62rem 0 0;
  display: grid;
  gap: 0.45rem;
}

.turn-card {
  margin: 0;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 10px;
  padding: 0.52rem 0.62rem;
  background: rgb(11 13 18 / 72%);
}

.turn-card.hero {
  border-color: rgb(102 217 255 / 30%);
  background: linear-gradient(180deg, rgb(14 20 28 / 76%) 0%, rgb(10 13 20 / 74%) 100%);
}

.turn-card.boss {
  border-color: rgb(255 109 109 / 30%);
  background: linear-gradient(180deg, rgb(30 15 20 / 70%) 0%, rgb(14 12 16 / 72%) 100%);
}

.turn-card.current {
  border-color: rgb(247 201 72 / 80%);
  box-shadow: 0 0 16px rgb(247 201 72 / 18%);
}

.turn-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.55rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}

.turn-badge {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.turn-card p {
  margin: 0.25rem 0 0;
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
  .turn-board {
    grid-template-columns: 1fr;
  }

  .lineup-row {
    grid-template-columns: 1fr;
    gap: 0.22rem;
  }

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
