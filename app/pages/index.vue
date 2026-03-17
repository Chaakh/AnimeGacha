<script setup lang="ts">
const { save, pullPack, pullMany, recentPulls, rarityMeta, missionProgress, isLoadingPool, poolSource, addDevPacks } = useGacha()

const reveal = ref<Awaited<ReturnType<typeof pullPack>> | null>(null)
const isSummoning = ref(false)
const isOpeningPack = ref(false)
const showReveal = ref(false)
const isDev = import.meta.dev
const activeCardIndex = ref(0)
const missionEntries = computed(() => Object.values(missionProgress.value))
const goldCounter = computed(() => Math.max(10 - save.value.dailyPulls, 0))
const FALLBACK_IMAGE = 'https://cdn.myanimelist.net/images/questionmark_23.gif'

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

function toCardTransform(index: number) {
  const distance = index - activeCardIndex.value
  const offsetX = distance * 26
  const offsetY = Math.abs(distance) * 9
  const rotate = distance * 3.6
  const scale = Math.max(0.68, 1 - Math.abs(distance) * 0.07)
  const zIndex = 100 - Math.abs(distance)

  return {
    transform: `translateX(${offsetX}px) translateY(${offsetY}px) rotate(${rotate}deg) scale(${scale})`,
    zIndex,
    opacity: Math.abs(distance) > 4 ? 0 : 1
  }
}

function moveCard(step: number) {
  if (!reveal.value?.length) {
    return
  }

  const lastIndex = reveal.value.length - 1
  activeCardIndex.value = Math.max(0, Math.min(lastIndex, activeCardIndex.value + step))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function closeReveal() {
  showReveal.value = false
  reveal.value = null
}

async function summonOne() {
  if (isSummoning.value) {
    return
  }

  isSummoning.value = true
  isOpeningPack.value = true
  const [result] = await Promise.all([pullPack(), sleep(900)])
  reveal.value = result
  activeCardIndex.value = 0
  showReveal.value = Boolean(result?.length)
  isOpeningPack.value = false
  isSummoning.value = false
}

async function summonAll() {
  if (isSummoning.value) {
    return
  }

  isSummoning.value = true
  isOpeningPack.value = true
  const [results] = await Promise.all([pullMany(save.value.packsRemaining), sleep(900)])
  reveal.value = results[0] ?? null
  activeCardIndex.value = 0
  showReveal.value = Boolean(reveal.value?.length)
  isOpeningPack.value = false
  isSummoning.value = false
}
</script>

<template>
  <section class="summon-stage">
    <div class="pack-head">
      <span class="packs-chip">
        <span class="chip-icon">🎴</span>
        TODAY PACKS: <strong>{{ save.packsRemaining }}</strong> / 10
      </span>
      <p class="status muted">{{ save.packsRemaining === 10 ? 'All packs ready!' : `${save.packsRemaining} pack${save.packsRemaining !== 1 ? 's' : ''} remaining` }}</p>
      <p class="gold-next">
        <span class="gold-icon">✦</span>
        {{ goldCounter === 0 ? 'GOLD PACK READY' : `Gold pack in ${goldCounter}` }}
      </p>
    </div>

    <div class="pack-slot">
      <button
        v-if="!showReveal"
        class="pack-button"
        :disabled="save.packsRemaining <= 0 || isSummoning || isLoadingPool"
        @click="summonOne"
      >
        <div
          class="foil-pack"
          :class="{ opening: isOpeningPack, idle: !isOpeningPack }"
          aria-hidden="true"
        >
          <!-- Wrapper layers -->
          <span class="foil-base" />
          <span class="foil-holo" />
          <span class="foil-grain" />
          <span class="foil-prism" />

          <!-- Crimp edges -->
          <span class="crimp crimp-top" />
          <span class="crimp crimp-bottom" />

          <!-- Tear line -->
          <span class="tear-line" />
          <span class="tear-arrow" />

          <!-- Content -->
          <span class="foil-seal">BOOSTER PACK</span>
          <span class="foil-logo">
            <span class="logo-text">AG</span>
            <span class="logo-sub">ANIGACKA</span>
          </span>
          <span class="foil-stars">
            <span class="star s1">✦</span>
            <span class="star s2">✦</span>
            <span class="star s3">✧</span>
            <span class="star s4">✦</span>
            <span class="star s5">✧</span>
          </span>
          <span class="foil-edition">1ST EDITION</span>
          <span class="foil-count">5 CARDS</span>

          <!-- Shine sweep -->
          <span class="shine-sweep" />
        </div>
        <span class="tap-text">
          <span class="tap-icon">👆</span>
          {{ isSummoning ? 'Ripping open...' : 'TAP TO RIP OPEN' }}
        </span>
      </button>

      <div v-else-if="reveal?.length" class="fan-wrap">
        <div class="fan-stage">
          <article
            v-for="(character, index) in reveal"
            :key="`${character.id}-${index}`"
            class="fan-card"
            :class="[`card-${character.rarity.toLowerCase()}`, { active: index === activeCardIndex }]"
            :style="toCardTransform(index)"
          >
            <img :src="resolveImage(character.imageUrl)" :alt="character.name" loading="lazy" @error="onCardImageError" />
            <span class="rarity-tag" :class="`rarity-${character.rarity.toLowerCase()}`">{{ character.rarity }}</span>
            <div class="fan-meta">
              <h3>{{ character.name }}</h3>
              <p class="sub">{{ character.title }}</p>
              <div class="fan-stats">
                <span class="atk">ATK {{ character.attack }}</span>
                <span class="def">DEF {{ character.defense }}</span>
                <span class="elm">{{ character.element }}</span>
              </div>
            </div>
          </article>
        </div>

        <div class="fan-controls">
          <button class="button" :disabled="activeCardIndex <= 0" @click="moveCard(-1)">◀ Prev</button>
          <span>{{ activeCardIndex + 1 }} / {{ reveal.length }}</span>
          <button class="button" :disabled="activeCardIndex >= reveal.length - 1" @click="moveCard(1)">Next ▶</button>
        </div>

        <button class="button button-main close-reveal" @click="closeReveal">Done</button>
      </div>
    </div>

    <div class="actions">
      <button class="button button-main" :disabled="save.packsRemaining <= 0 || isSummoning || isLoadingPool" @click="summonOne">Open 1 Pack</button>
      <button class="button" :disabled="save.packsRemaining <= 0 || isSummoning || isLoadingPool" @click="summonAll">Open All ({{ save.packsRemaining }})</button>
      <button v-if="isDev" class="button dev-button" :disabled="isSummoning || isLoadingPool" @click="addDevPacks(10)">+10 Packs (Dev)</button>
    </div>
    <p class="muted source">Data source: {{ poolSource }}</p>
  </section>

  <section class="panel missions">
    <h2 class="section-title">Daily Missions</h2>
    <ul>
      <li v-for="mission in missionEntries" :key="mission.label" :class="{ done: mission.done }">
        <span>{{ mission.label }}</span>
        <strong>{{ mission.current }}/{{ mission.target }}</strong>
      </li>
    </ul>
    <p class="muted reward">Reward: +2 packs per mission (future update).</p>
  </section>

  <section class="panel odds">
    <h2 class="section-title">Drop Rates</h2>
    <ul>
      <li v-for="(meta, rarity) in rarityMeta" :key="rarity">
        <span>{{ rarity }}</span>
        <strong>{{ meta.weight }}%</strong>
      </li>
    </ul>
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
/* ─── Stage ─── */
.summon-stage {
  min-height: 580px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1.1rem;
}

/* ─── Pack Header ─── */
.pack-head {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
}

.packs-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgb(247 201 72 / 50%);
  border-radius: 999px;
  background: rgb(14 14 18 / 82%);
  box-shadow: 0 0 20px rgb(247 201 72 / 18%), inset 0 0 12px rgb(247 201 72 / 6%);
  padding: 0.5rem 1rem;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.14em;
  font-size: 0.88rem;
  color: var(--gold-soft);
}

.chip-icon {
  font-size: 1.1rem;
}

.packs-chip strong {
  color: var(--ink);
  font-size: 1.08rem;
}

.status,
.gold-next {
  margin: 0;
  font-size: 0.88rem;
}

.gold-next {
  color: #f1c35c;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.gold-icon {
  animation: starPulse 1.4s ease-in-out infinite;
  font-size: 0.85rem;
}

/* ─── Pack Button ─── */
.pack-button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: transform 180ms ease;
}

.pack-button:hover .foil-pack {
  transform: translateY(-4px) scale(1.015);
}

.pack-button:active .foil-pack {
  transform: translateY(0) scale(0.98);
}

.pack-slot {
  min-height: 440px;
  width: min(760px, 94vw);
  display: grid;
  place-items: center;
}

.pack-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pack-button:disabled .foil-pack {
  filter: saturate(0.35) brightness(0.7);
}

/* ─── Foil Pack ─── */
.foil-pack {
  width: min(72vw, 240px);
  aspect-ratio: 11 / 17;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 260ms ease;
  box-shadow:
    0 28px 50px rgb(0 0 0 / 50%),
    0 0 0 1px rgb(255 255 255 / 8%),
    0 0 40px rgb(180 140 60 / 14%);
}

.foil-pack.idle {
  animation: packFloat 3.2s ease-in-out infinite;
}

/* ─── Foil Wrapper Layers ─── */
.foil-base {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(168deg,
      #2a2230 0%,
      #1a1428 18%,
      #0e0c18 40%,
      #14101e 62%,
      #1c1630 82%,
      #221a34 100%
    );
  z-index: 0;
}

.foil-holo {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    conic-gradient(
      from 140deg at 50% 45%,
      rgb(255 100 200 / 28%) 0deg,
      rgb(100 180 255 / 32%) 60deg,
      rgb(120 255 180 / 26%) 120deg,
      rgb(255 220 80 / 30%) 180deg,
      rgb(255 100 200 / 28%) 240deg,
      rgb(100 180 255 / 32%) 300deg,
      rgb(255 100 200 / 28%) 360deg
    );
  mix-blend-mode: screen;
  animation: holoShift 6s ease-in-out infinite alternate;
}

.foil-grain {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  opacity: 0.6;
  pointer-events: none;
}

.foil-prism {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    linear-gradient(135deg,
      rgb(255 255 255 / 0%) 0%,
      rgb(255 255 255 / 6%) 25%,
      rgb(255 255 255 / 0%) 50%,
      rgb(255 255 255 / 4%) 75%,
      rgb(255 255 255 / 0%) 100%
    );
  animation: prismDrift 4s ease-in-out infinite alternate;
}

/* ─── Crimp Edges ─── */
.crimp {
  position: absolute;
  left: 0;
  width: 100%;
  height: 16px;
  z-index: 5;
  background:
    repeating-linear-gradient(
      90deg,
      rgb(200 170 100 / 35%) 0,
      rgb(200 170 100 / 35%) 6px,
      rgb(40 30 18 / 70%) 6px,
      rgb(40 30 18 / 70%) 12px
    );
}

.crimp::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg,
    rgb(255 210 120 / 30%),
    rgb(255 210 120 / 60%),
    rgb(255 210 120 / 30%)
  );
}

.crimp-top {
  top: 0;
  border-radius: 6px 6px 0 0;
}

.crimp-top::after {
  bottom: 0;
}

.crimp-bottom {
  bottom: 0;
  border-radius: 0 0 6px 6px;
}

.crimp-bottom::after {
  top: 0;
}

/* ─── Tear Line ─── */
.tear-line {
  position: absolute;
  top: 18px;
  left: 8%;
  width: 84%;
  height: 0;
  z-index: 6;
  border-top: 2px dashed rgb(255 220 140 / 40%);
}

.tear-arrow {
  position: absolute;
  top: 11px;
  right: 6%;
  z-index: 7;
  font-size: 0;
  width: 0;
  height: 0;
  border-left: 5px solid rgb(255 220 140 / 50%);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  animation: arrowPulse 1.6s ease-in-out infinite;
}

/* ─── Foil Content ─── */
.foil-seal {
  position: absolute;
  top: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 8;
  border: 1px solid rgb(255 200 100 / 50%);
  border-radius: 3px;
  padding: 0.12rem 0.55rem;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgb(255 220 140 / 80%);
  background: rgb(20 16 28 / 70%);
  text-transform: uppercase;
  white-space: nowrap;
}

.foil-logo {
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  margin-top: -8px;
}

.logo-text {
  font-family: 'Rajdhani', sans-serif;
  font-size: 3.2rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #ffe5a0, #f0b830, #c88a18);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 2px 8px rgb(200 140 30 / 40%));
  line-height: 1;
}

.logo-sub {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.32em;
  color: rgb(255 220 160 / 55%);
}

.foil-stars {
  position: absolute;
  z-index: 8;
  display: flex;
  gap: 0.6rem;
  bottom: 62px;
  left: 50%;
  transform: translateX(-50%);
}

.star {
  font-size: 0.7rem;
  color: rgb(255 210 100 / 60%);
  animation: starTwinkle 2s ease-in-out infinite;
}

.s1 { animation-delay: 0s; }
.s2 { animation-delay: 0.3s; }
.s3 { animation-delay: 0.6s; }
.s4 { animation-delay: 0.9s; }
.s5 { animation-delay: 1.2s; }

.foil-edition {
  position: absolute;
  bottom: 44px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 8;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: rgb(255 210 140 / 42%);
  white-space: nowrap;
}

.foil-count {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 8;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: rgb(255 220 160 / 36%);
  border: 1px solid rgb(255 200 100 / 22%);
  border-radius: 3px;
  padding: 0.08rem 0.4rem;
  background: rgb(20 16 28 / 40%);
  white-space: nowrap;
}

/* ─── Shine Sweep ─── */
.shine-sweep {
  position: absolute;
  inset: 0;
  z-index: 9;
  background: linear-gradient(
    105deg,
    transparent 32%,
    rgb(255 255 255 / 18%) 46%,
    rgb(255 255 255 / 26%) 50%,
    rgb(255 255 255 / 18%) 54%,
    transparent 68%
  );
  animation: shineSweep 3.4s ease-in-out infinite;
  pointer-events: none;
}

/* ─── Tap Text ─── */
.tap-text {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.1em;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--gold-soft);
  text-transform: uppercase;
  animation: pulse 1.4s ease-in-out infinite;
}

.tap-icon {
  font-size: 1rem;
  animation: tapBounce 1.4s ease-in-out infinite;
}

/* ─── Opening Animations ─── */
.foil-pack.opening {
  animation: packRip 900ms cubic-bezier(0.23, 1, 0.32, 1);
}

.foil-pack.opening .crimp-top {
  animation: crimpRip 700ms ease forwards;
}

.foil-pack.opening .tear-line {
  animation: tearFlash 600ms ease;
}

.foil-pack.opening .shine-sweep {
  animation: burstFlash 500ms ease forwards;
}

/* ─── Actions ─── */
.actions {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.dev-button {
  border-color: rgb(76 198 152 / 48%);
  color: #8df0ca;
}

.source {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ─── Fan Reveal ─── */
.fan-wrap {
  width: min(720px, 92vw);
  border: 1px solid rgb(255 216 128 / 20%);
  border-radius: 14px;
  background: linear-gradient(180deg, rgb(22 24 34 / 84%) 0%, rgb(9 11 17 / 88%) 100%);
  padding: 0.8rem;
}

.fan-stage {
  min-height: 310px;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.fan-card {
  position: absolute;
  width: min(70vw, 210px);
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  border: 2px solid rgb(255 216 127 / 40%);
  overflow: hidden;
  background: rgb(14 16 22 / 88%);
  box-shadow: 0 22px 30px rgb(0 0 0 / 30%), 0 0 0 2px rgb(255 255 255 / 8%);
  transition: transform 180ms ease, opacity 180ms ease;
}

.fan-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: none;
  transition: background 180ms ease;
}

.fan-card:not(.active)::after {
  background: linear-gradient(180deg, rgb(6 8 12 / 20%) 0%, rgb(5 6 10 / 58%) 100%);
}

.fan-card:not(.active) img {
  filter: brightness(0.46) saturate(0.5) blur(1.3px);
}

.fan-card:not(.active) .fan-meta,
.fan-card:not(.active) .rarity-tag {
  opacity: 0.2;
}

.card-rare {
  border-color: rgb(90 193 253);
  border-width: 3px;
  box-shadow:
    0 22px 30px rgb(0 0 0 / 30%),
    0 0 0 3px rgb(90 193 253 / 65%),
    0 0 30px rgb(90 193 253 / 75%),
    0 0 50px rgb(90 193 253 / 45%),
    inset 0 0 26px rgb(90 193 253 / 32%);
  animation: rarityGlowRare 1.5s ease-in-out infinite;
}

.card-epic {
  border-color: rgb(219 111 255);
  border-width: 3px;
  box-shadow:
    0 22px 30px rgb(0 0 0 / 30%),
    0 0 0 3px rgb(219 111 255 / 70%),
    0 0 32px rgb(219 111 255 / 80%),
    0 0 52px rgb(219 111 255 / 52%),
    inset 0 0 26px rgb(219 111 255 / 35%);
  animation: rarityGlowEpic 1.4s ease-in-out infinite;
}

.card-legendary {
  border-color: rgb(247 201 72);
  border-width: 3px;
  box-shadow:
    0 22px 30px rgb(0 0 0 / 30%),
    0 0 0 3px rgb(247 201 72 / 78%),
    0 0 36px rgb(247 201 72 / 90%),
    0 0 58px rgb(247 201 72 / 60%),
    inset 0 0 30px rgb(247 201 72 / 40%);
  animation: rarityGlowLegendary 1.25s ease-in-out infinite;
}

.card-mythic {
  border-color: rgb(255 79 216);
  border-width: 3px;
  box-shadow:
    0 22px 30px rgb(0 0 0 / 30%),
    0 0 0 3px rgb(255 79 216 / 82%),
    0 0 40px rgb(255 79 216 / 95%),
    0 0 64px rgb(255 79 216 / 66%),
    inset 0 0 30px rgb(255 79 216 / 44%);
  animation: rarityGlowMythic 1.1s ease-in-out infinite;
}

.fan-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.fan-card.active {
  transform-origin: center;
  box-shadow: 0 24px 34px rgb(0 0 0 / 36%), 0 0 0 2px rgb(255 255 255 / 10%);
}

.fan-meta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.55rem;
  background: linear-gradient(180deg, transparent 0%, rgb(10 12 18 / 96%) 68%);
}

.fan-meta h3,
.fan-meta p {
  margin: 0;
}

.fan-meta h3 {
  font-size: 0.98rem;
  text-shadow: 0 1px 6px rgb(0 0 0 / 55%);
}

.fan-meta .sub {
  margin-top: 0.22rem;
  font-size: 0.76rem;
  color: var(--ink-soft);
}

.fan-stats {
  margin-top: 0.42rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.fan-stats span {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.77rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  border-radius: 8px;
  padding: 0.2rem 0.4rem;
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

.rarity-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  border-radius: 999px;
  padding: 0.18rem 0.5rem;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #e4ecff;
  border: 1px solid rgb(149 170 214 / 40%);
  background: rgb(15 18 27 / 88%);
}

.rarity-rare {
  color: #95e3ff;
  border-color: rgb(90 193 253 / 66%);
}

.rarity-epic {
  color: #efb1ff;
  border-color: rgb(219 111 255 / 70%);
}

.rarity-legendary {
  color: #ffe29f;
  border-color: rgb(247 201 72 / 76%);
}

.rarity-mythic {
  color: #ffb7f2;
  border-color: rgb(255 79 216 / 82%);
}

.fan-controls {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
}

.close-reveal {
  margin-top: 0.65rem;
  width: 100%;
}

.fan-controls span {
  text-align: center;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}

/* ─── Panels ─── */
.missions,
.history {
  padding: 1rem;
}

.missions {
  margin-top: 1rem;
}

.missions ul,
.odds ul {
  list-style: none;
  margin: 0.8rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.missions li,
.odds li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgb(64 68 78 / 72%);
  border-radius: 10px;
  padding: 0.42rem 0.6rem;
}

.done {
  border-color: rgb(247 201 72 / 56%);
}

.reward {
  margin: 0.65rem 0 0;
  font-size: 0.84rem;
}

.odds {
  margin-top: 1rem;
  padding: 1rem;
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

/* ═══════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════ */

@keyframes packFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-8px) rotate(0.4deg);
  }
}

@keyframes holoShift {
  0% {
    opacity: 0.55;
    filter: hue-rotate(0deg);
  }
  100% {
    opacity: 0.75;
    filter: hue-rotate(30deg);
  }
}

@keyframes prismDrift {
  0% {
    background-position: 0% 0%;
    opacity: 0.5;
  }
  100% {
    background-position: 100% 100%;
    opacity: 0.8;
  }
}

@keyframes shineSweep {
  0%, 100% {
    transform: translateX(-140%);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  40% {
    transform: translateX(140%);
    opacity: 0;
  }
  41%, 100% {
    opacity: 0;
    transform: translateX(-140%);
  }
}

@keyframes starTwinkle {
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes starPulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 8px rgb(241 195 92 / 60%);
  }
}

@keyframes arrowPulse {
  0%, 100% {
    opacity: 0.3;
    transform: translateX(0);
  }
  50% {
    opacity: 0.8;
    transform: translateX(3px);
  }
}

@keyframes tapBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

@keyframes packRip {
  0% {
    transform: scale(1) rotate(0);
  }
  20% {
    transform: scale(1.04) rotate(-0.5deg);
  }
  40% {
    transform: scale(1.06) rotate(0.8deg);
  }
  60% {
    transform: scale(1.02) rotate(-0.3deg);
    filter: brightness(1.3);
  }
  100% {
    transform: scale(1) rotate(0);
    filter: brightness(1);
  }
}

@keyframes crimpRip {
  0% {
    transform: translateX(0) translateY(0) rotate(0deg);
    opacity: 1;
  }
  35% {
    transform: translateX(-10px) translateY(-8px) rotate(-5deg);
    opacity: 1;
  }
  70% {
    transform: translateX(-22px) translateY(-14px) rotate(-9deg);
    opacity: 0.8;
  }
  100% {
    transform: translateX(-36px) translateY(-20px) rotate(-13deg);
    opacity: 0;
  }
}

@keyframes tearFlash {
  0%, 100% {
    border-color: rgb(255 220 140 / 40%);
  }
  30%, 70% {
    border-color: rgb(255 240 180 / 90%);
    box-shadow: 0 0 12px rgb(255 220 140 / 50%);
  }
}

@keyframes burstFlash {
  0% {
    transform: translateX(-140%);
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    transform: translateX(140%);
    opacity: 0.6;
  }
}

@keyframes rarityGlowRare {
  0%, 100% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(90 193 253 / 60%),
      0 0 25px rgb(90 193 253 / 62%),
      0 0 45px rgb(90 193 253 / 40%),
      inset 0 0 22px rgb(90 193 253 / 26%);
  }
  50% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(90 193 253 / 85%),
      0 0 36px rgb(90 193 253 / 88%),
      0 0 62px rgb(90 193 253 / 56%),
      inset 0 0 30px rgb(90 193 253 / 40%);
  }
}

@keyframes rarityGlowEpic {
  0%, 100% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(219 111 255 / 66%),
      0 0 28px rgb(219 111 255 / 70%),
      0 0 48px rgb(219 111 255 / 44%),
      inset 0 0 24px rgb(219 111 255 / 28%);
  }
  50% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(219 111 255 / 92%),
      0 0 40px rgb(219 111 255 / 95%),
      0 0 66px rgb(219 111 255 / 62%),
      inset 0 0 32px rgb(219 111 255 / 46%);
  }
}

@keyframes rarityGlowLegendary {
  0%, 100% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(247 201 72 / 74%),
      0 0 32px rgb(247 201 72 / 80%),
      0 0 55px rgb(247 201 72 / 52%),
      inset 0 0 28px rgb(247 201 72 / 34%);
  }
  50% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(247 201 72 / 98%),
      0 0 48px rgb(247 201 72),
      0 0 74px rgb(247 201 72 / 72%),
      inset 0 0 40px rgb(247 201 72 / 54%);
  }
}

@keyframes rarityGlowMythic {
  0%, 100% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(255 79 216 / 82%),
      0 0 36px rgb(255 79 216 / 88%),
      0 0 62px rgb(255 79 216 / 62%),
      inset 0 0 28px rgb(255 79 216 / 42%);
  }
  50% {
    box-shadow:
      0 22px 30px rgb(0 0 0 / 30%),
      0 0 0 3px rgb(255 79 216),
      0 0 52px rgb(255 79 216),
      0 0 80px rgb(255 79 216 / 78%),
      inset 0 0 38px rgb(255 79 216 / 58%);
  }
}
</style>
