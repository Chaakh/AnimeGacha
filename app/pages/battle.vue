<script setup lang="ts">
const { collectionEntries, battle, getDailyBoss, save } = useGacha()

const selectedIds = ref<string[]>([])
const outcome = ref<ReturnType<typeof battle> | null>(null)
const isBattling = ref(false)
const battleProgress = ref(0)
const battleRunToken = ref(0)
const activeTurnIndex = ref(-1)
const isFlashing = ref(false)
const flashSide = ref<'hero' | 'boss' | null>(null)
const playerPowerSoFar = ref(0)
const bossPowerSoFar = ref(0)

interface BattleTurn {
  id: string
  actor: 'hero' | 'boss'
  actorName: string
  actorImageUrl: string
  actorId: string | null
  targetId: string | null
  text: string
  turnNumber: number
  power: number
}

const battleTurns = ref<BattleTurn[]>([])
const revealedTurns = ref<BattleTurn[]>([])

type CollectionEntry = (typeof collectionEntries.value)[number]

const dailyBoss = computed(() => getDailyBoss())
const dailyBattleDone = computed(() => save.value.dailyBattleDone)
const dailyBattleWon = computed(() => save.value.dailyBattleWon)

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

const FALLBACK_IMAGE = 'https://cdn.myanimelist.net/images/questionmark_23.gif'

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

function extractPower(text: string): number {
  const match = text.match(/(\d+)\s*power/i)
  return match ? parseInt(match[1], 10) : 0
}

function resolveImage(url: string) {
  return url || FALLBACK_IMAGE
}

function onCardImageError(event: Event) {
  const target = event.target as HTMLImageElement | null
  if (!target) {
    return
  }

  if (target.src !== FALLBACK_IMAGE) {
    target.src = FALLBACK_IMAGE
  }
}

function toBattleTurns(result: NonNullable<ReturnType<typeof battle>>): BattleTurn[] {
  const boss = result.enemyTeam[0]
  const bossName = boss?.name ?? 'Raid Boss'
  const bossImage = boss?.imageUrl ?? ''
  let bossTargetCursor = 0

  return result.rounds.map((line, index) => {
    const lowered = line.toLowerCase()
    const isBossTurn = lowered.includes('raid boss') || lowered.includes('boss')
    const matchedHero = result.playerTeam.find((hero) => line.startsWith(hero.name))
    const fallbackHero = result.playerTeam[index % Math.max(result.playerTeam.length, 1)]
    const actingHero = matchedHero ?? fallbackHero
    const targetHero = result.playerTeam.length ? result.playerTeam[bossTargetCursor % result.playerTeam.length] : null

    if (isBossTurn) {
      bossTargetCursor += 1
    }

    return {
      id: `${index}-${line}`,
      actor: isBossTurn ? 'boss' : 'hero',
      actorName: isBossTurn ? bossName : actingHero?.name ?? 'Hero Squad',
      actorImageUrl: isBossTurn ? bossImage : (actingHero?.imageUrl ?? ''),
      actorId: isBossTurn ? (boss?.id ?? 'raid-boss') : (actingHero?.id ?? null),
      targetId: isBossTurn ? targetHero?.id ?? null : (boss?.id ?? 'raid-boss'),
      text: line,
      turnNumber: index + 1,
      power: extractPower(line)
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

async function triggerFlash(side: 'hero' | 'boss') {
  flashSide.value = side
  isFlashing.value = true
  await wait(350)
  isFlashing.value = false
  flashSide.value = null
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
  battleProgress.value = 4
  playerPowerSoFar.value = 0
  bossPowerSoFar.value = 0

  const totalSteps = Math.max(turns.length + 1, 1)

  // Cinematic pre-battle delay
  await wait(1500)
  if (battleRunToken.value !== runToken) return

  for (let index = 0; index < turns.length; index += 1) {
    // Dramatic pause between turns
    await wait(1200)
    if (battleRunToken.value !== runToken) return

    const turn = turns[index]
    if (!turn) continue

    activeTurnIndex.value = index
    revealedTurns.value = [...revealedTurns.value, turn]
    battleProgress.value = Math.min(92, Math.round(((index + 1) / totalSteps) * 100))

    // Track running power totals
    if (turn.actor === 'hero') {
      playerPowerSoFar.value += turn.power
    } else {
      bossPowerSoFar.value += turn.power
    }

    // Flash effect on impact
    triggerFlash(turn.actor)
  }

  // Final dramatic pause before result
  await wait(1200)
  if (battleRunToken.value !== runToken) return

  battleProgress.value = 100
  activeTurnIndex.value = turns.length - 1
  revealedTurns.value = turns
  outcome.value = result
  isBattling.value = false
}
</script>

<template>
  <section v-if="isBattling || outcome" class="panel result" :class="{ shaking: isFlashing }">
    <div class="result-head">
      <h2 class="section-title">{{ isBattling ? 'Raid Battle' : 'Raid Report' }}</h2>
      <p v-if="isBattling" class="winner is-even">Battle in progress...</p>
      <p v-else-if="outcome" class="winner" :class="{ win: outcome.won, loss: !outcome.won }">
        {{ outcome.won ? '🏆 Victory!' : '💀 Defeat.' }} Score {{ outcome.playerScore }} - {{ outcome.enemyScore }}
      </p>
    </div>
    <!-- Card Battle Stage -->
    <div class="board-stage" :class="{ 'flash-hero': flashSide === 'hero', 'flash-boss': flashSide === 'boss' }">
      <div class="board-row boss-row">
        <article
          class="battle-card boss-card"
          :class="{
            attacking: currentTurn?.actor === 'boss' && currentTurn?.power > 0,
            targeted: currentTurn?.targetId === activeBoss?.id && currentTurn?.power > 0
          }"
        >
          <img
            class="battle-card-image"
            :src="resolveImage(activeBoss?.imageUrl ?? '')"
            :alt="activeBoss?.name ?? 'Raid Boss'"
            loading="lazy"
            @error="onCardImageError"
          />
          <div class="battle-card-overlay">
            <strong>{{ activeBoss?.name ?? 'Raid Boss' }}</strong>
            <span>{{ activeBoss?.rarity ?? 'Boss' }} Threat</span>
            <div class="battle-mini-stats">
              <span>ATK {{ activeBoss?.attack ?? 0 }}</span>
              <span>DEF {{ activeBoss?.defense ?? 0 }}</span>
            </div>
          </div>
        </article>
      </div>

      <div class="board-impact">
        <div class="impact-line" />
        <p class="impact-text">
          <span v-if="currentTurn">
            Turn {{ currentTurn.turnNumber }}/{{ battleTurns.length }}:
            {{ currentTurn.actorName }} attacks
            <strong v-if="currentTurn.power > 0">{{ ` ${currentTurn.power} PWR` }}</strong>
          </span>
          <span v-else>Units are entering the board...</span>
        </p>
      </div>

      <div class="board-row hero-row">
        <article
          v-for="hero in activeTeam"
          :key="hero.id"
          class="battle-card hero-card"
          :class="{
            attacking: currentTurn?.actor === 'hero' && currentTurn?.actorId === hero.id && currentTurn?.power > 0,
            targeted: currentTurn?.actor === 'boss' && currentTurn?.targetId === hero.id && currentTurn?.power > 0,
            standby: currentTurn?.actor === 'hero' && currentTurn?.actorId !== hero.id
          }"
        >
          <img
            class="battle-card-image"
            :src="resolveImage(hero.imageUrl)"
            :alt="hero.name"
            loading="lazy"
            @error="onCardImageError"
          />
          <div class="battle-card-overlay">
            <strong>{{ hero.name }}</strong>
            <span>{{ hero.rarity }} Hero</span>
            <div class="battle-mini-stats">
              <span>ATK {{ hero.attack }}</span>
              <span>DEF {{ hero.defense }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Live Power Bar -->
    <div v-if="isBattling" class="power-comparison">
      <div class="power-side hero-power">
        <span>Heroes</span>
        <strong>{{ playerPowerSoFar }}</strong>
      </div>
      <div class="power-bar-track">
        <div
          class="power-bar-hero"
          :style="{ width: `${playerPowerSoFar + bossPowerSoFar > 0 ? Math.round((playerPowerSoFar / (playerPowerSoFar + bossPowerSoFar)) * 100) : 50}%` }"
        />
      </div>
      <div class="power-side boss-power">
        <span>Boss</span>
        <strong>{{ bossPowerSoFar }}</strong>
      </div>
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

    <h3 v-if="visibleTurns.length || isBattling">Combat Log</h3>
    <ul class="turn-feed">
      <li v-if="isBattling && !visibleTurns.length" class="turn-card muted">Fighters are sizing each other up...</li>
      <li
        v-for="turn in visibleTurns"
        :key="turn.id"
        class="turn-card slide-in"
        :class="[turn.actor, { current: currentTurn?.id === turn.id }]"
      >
        <div class="turn-card-inner">
          <img v-if="turn.actorImageUrl" :src="turn.actorImageUrl" :alt="turn.actorName" class="turn-thumb" />
          <div class="turn-card-body">
            <div class="turn-card-head">
              <span>Turn {{ turn.turnNumber }}</span>
              <span class="turn-badge" :class="turn.actor">{{ turn.actor === 'boss' ? '👹 Boss' : '⚔️ Hero' }}</span>
            </div>
            <p>{{ turn.text }}</p>
            <div v-if="turn.power" class="turn-power-chip">
              {{ turn.power }} PWR
            </div>
          </div>
        </div>
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

    <div v-if="outcome?.won" class="reward-banner">
      <span class="reward-icon">🎁</span>
      <div>
        <strong>Raid Reward Claimed!</strong>
        <p>+2 bonus packs have been added to your daily packs.</p>
      </div>
    </div>

    <div v-if="outcome && !outcome.won" class="defeat-banner">
      <span class="reward-icon">💀</span>
      <div>
        <strong>Defeat</strong>
        <p>Your team wasn't strong enough. Try again with a better lineup.</p>
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
          <button
            class="button button-main"
            :disabled="selectedIds.length === 0 || !dailyBoss || isBattling || dailyBattleWon"
            @click="launchBattle"
          >
            {{ dailyBattleWon ? 'Raid Won ✓' : (dailyBattleDone && !isBattling) ? 'Retry Battle' : isBattling ? 'Battling...' : 'Start Battle' }}
          </button>
        </div>
        <p v-if="dailyBattleWon && !outcome" class="muted raid-done-note">
          You defeated today's boss! +2 bonus packs awarded.
        </p>
        <p v-else-if="dailyBattleDone && !isBattling && !outcome" class="muted raid-done-note" style="color: var(--danger)">
          Boss defeated you earlier today. Adjust your lineup and try again!
        </p>
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
/* Board Stage */
.board-stage {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.55rem;
  padding: 0.75rem;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 14px;
  background:
    radial-gradient(circle at 50% -8%, rgb(245 196 80 / 16%) 0%, transparent 46%),
    radial-gradient(circle at 8% 90%, rgb(73 152 255 / 14%) 0%, transparent 42%),
    linear-gradient(180deg, rgb(18 19 27 / 94%) 0%, rgb(9 10 16 / 96%) 100%);
  position: relative;
  overflow: hidden;
}

.board-stage.flash-hero::after,
.board-stage.flash-boss::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: flashFade 0.35s ease-out forwards;
}

.board-stage.flash-hero::after {
  background: rgb(102 217 255 / 14%);
}

.board-stage.flash-boss::after {
  background: rgb(255 109 109 / 14%);
}

.board-row {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 0.55rem;
}

.boss-row .battle-card {
  width: min(230px, 62vw);
}

.hero-row {
  flex-wrap: wrap;
}

.hero-row .battle-card {
  width: min(165px, 31vw);
}

.battle-card {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgb(255 255 255 / 22%);
  background: rgb(11 13 20 / 88%);
  transform: translate3d(0, 0, 0) scale(1);
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1), filter 280ms ease, box-shadow 280ms ease;
  box-shadow: 0 15px 24px rgb(0 0 0 / 34%);
}

.boss-card {
  border-color: rgb(255 109 109 / 52%);
  box-shadow: 0 18px 30px rgb(0 0 0 / 36%), 0 0 24px rgb(255 109 109 / 20%);
}

.hero-card {
  border-color: rgb(102 217 255 / 44%);
}

.hero-card.standby {
  opacity: 0.6;
  filter: saturate(0.68) brightness(0.7);
}

.battle-card.attacking {
  z-index: 3;
}

.hero-card.attacking {
  animation: heroLunge 0.48s cubic-bezier(0.33, 1, 0.68, 1);
  box-shadow: 0 24px 34px rgb(15 89 120 / 48%), 0 0 30px rgb(102 217 255 / 44%);
}

.boss-card.attacking {
  animation: bossLunge 0.48s cubic-bezier(0.33, 1, 0.68, 1);
  box-shadow: 0 24px 34px rgb(128 35 35 / 48%), 0 0 30px rgb(255 109 109 / 44%);
}

.battle-card.targeted::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid rgb(247 201 72 / 86%);
  border-radius: inherit;
  box-shadow: inset 0 0 24px rgb(247 201 72 / 34%);
  animation: targetPulse 0.5s ease-out;
  pointer-events: none;
}

.battle-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.battle-card-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.45rem;
  display: grid;
  gap: 0.25rem;
  background: linear-gradient(180deg, transparent 0%, rgb(8 10 16 / 94%) 70%);
}

.battle-card-overlay strong {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.84rem;
  line-height: 1.05;
}

.battle-card-overlay > span {
  font-size: 0.7rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.battle-mini-stats {
  display: flex;
  gap: 0.28rem;
  flex-wrap: wrap;
}

.battle-mini-stats span {
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 999px;
  padding: 0.08rem 0.38rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.7rem;
  background: rgb(8 10 14 / 76%);
}

.board-impact {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
}

.impact-line {
  width: min(530px, 92%);
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgb(102 217 255 / 0%) 0%, rgb(247 201 72 / 85%) 48%, rgb(255 109 109 / 0%) 100%);
}

.impact-text {
  margin: 0;
  text-align: center;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.03em;
}

.impact-text strong {
  color: var(--gold-soft);
}

/* ─── Power Comparison ─── */
.power-comparison {
  margin-top: 0.65rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
}

.power-side {
  text-align: center;
  font-family: 'Rajdhani', sans-serif;
}

.power-side span {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.power-side strong {
  font-size: 1.1rem;
}

.hero-power strong {
  color: #66d9ff;
}

.boss-power strong {
  color: #ff6d6d;
}

.power-bar-track {
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgb(255 109 109 / 30%);
  position: relative;
}

.power-bar-hero {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3ca9d9 0%, #66d9ff 100%);
  transition: width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* ─── Shake Effect ─── */
.result.shaking {
  animation: screenShake 0.35s ease-out;
}

/* ─── Turn Feed ─── */
.turn-feed {
  list-style: none;
  padding: 0;
  margin: 0.62rem 0 0;
  display: grid;
  gap: 0.5rem;
}

.turn-card {
  margin: 0;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  background: rgb(11 13 18 / 72%);
}

.turn-card.slide-in {
  animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.turn-card-inner {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
}

.turn-thumb {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgb(255 255 255 / 16%);
}

.turn-card-body {
  flex: 1;
  min-width: 0;
}

.turn-card.hero {
  border-color: rgb(102 217 255 / 30%);
  background: linear-gradient(135deg, rgb(14 20 28 / 76%) 0%, rgb(10 13 20 / 74%) 100%);
}

.turn-card.hero .turn-thumb {
  border-color: rgb(102 217 255 / 40%);
}

.turn-card.boss {
  border-color: rgb(255 109 109 / 30%);
  background: linear-gradient(135deg, rgb(30 15 20 / 70%) 0%, rgb(14 12 16 / 72%) 100%);
}

.turn-card.boss .turn-thumb {
  border-color: rgb(255 109 109 / 40%);
}

.turn-card.current {
  border-color: rgb(247 201 72 / 80%);
  box-shadow: 0 0 20px rgb(247 201 72 / 18%);
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
}

.turn-badge.hero {
  color: #66d9ff;
  background: none;
  border: none;
}

.turn-badge.boss {
  color: #ff6d6d;
  background: none;
  border: none;
}

.turn-card p {
  margin: 0.2rem 0 0;
  font-size: 0.92rem;
}

.turn-power-chip {
  margin-top: 0.35rem;
  display: inline-block;
  border: 1px solid rgb(247 201 72 / 40%);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  color: #ffe3a5;
  background: rgb(25 18 7 / 55%);
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

.reward-banner,
.defeat-banner {
  margin-top: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
}

.reward-banner {
  border: 1px solid rgb(102 217 139 / 50%);
  background: linear-gradient(135deg, rgb(14 32 20 / 80%) 0%, rgb(10 24 14 / 85%) 100%);
}

.defeat-banner {
  border: 1px solid rgb(255 109 109 / 40%);
  background: linear-gradient(135deg, rgb(32 14 18 / 75%) 0%, rgb(20 10 14 / 80%) 100%);
}

.reward-banner strong {
  color: var(--emerald);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.05rem;
}

.defeat-banner strong {
  color: var(--danger);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.05rem;
}

.reward-banner p,
.defeat-banner p {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  color: var(--ink-soft);
}

.reward-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.raid-done-note {
  margin: 0.4rem 0 0;
  font-size: 0.84rem;
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

@keyframes screenShake {
  0% { transform: translate(0, 0); }
  15% { transform: translate(-3px, 1px); }
  30% { transform: translate(3px, -1px); }
  45% { transform: translate(-2px, 2px); }
  60% { transform: translate(2px, -1px); }
  75% { transform: translate(-1px, 1px); }
  100% { transform: translate(0, 0); }
}

@keyframes flashFade {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes heroLunge {
  0% {
    transform: translateY(0) scale(1);
  }
  45% {
    transform: translateY(-30px) scale(1.04);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes bossLunge {
  0% {
    transform: translateY(0) scale(1);
  }
  45% {
    transform: translateY(28px) scale(1.04);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes targetPulse {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes slideInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
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
  .board-stage {
    padding: 0.6rem;
    gap: 0.4rem;
  }

  .boss-row .battle-card {
    width: min(210px, 70vw);
  }

  .hero-row .battle-card {
    width: min(145px, 44vw);
  }

  .battle-card-overlay strong {
    font-size: 0.8rem;
  }

  .impact-text {
    font-size: 0.8rem;
  }

  .power-comparison {
    grid-template-columns: auto 1fr auto;
    gap: 0.35rem;
  }

  .turn-thumb {
    width: 38px;
    height: 38px;
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


