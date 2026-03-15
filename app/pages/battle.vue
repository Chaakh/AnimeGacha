<script setup lang="ts">
const { collectionEntries, battle } = useGacha()

const selectedIds = ref<string[]>([])
const outcome = ref<ReturnType<typeof battle> | null>(null)

function toggleTeam(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
    return
  }

  if (selectedIds.value.length < 3) {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function clearTeam() {
  selectedIds.value = []
  outcome.value = null
}

function launchBattle() {
  outcome.value = battle(selectedIds.value)
}
</script>

<template>
  <section class="panel battle-head">
    <div>
      <h1 class="section-title">Battle Arena</h1>
      <p class="muted">Pick up to 3 heroes from your collection. Duplicate copies boost their battle power.</p>
    </div>

    <div class="team-stats">
      <p><strong>{{ selectedIds.length }}</strong> / 3 selected</p>
      <div class="head-buttons">
        <button class="button" @click="clearTeam">Clear</button>
        <button class="button button-main" :disabled="selectedIds.length === 0" @click="launchBattle">Start Battle</button>
      </div>
    </div>
  </section>

  <section class="panel roster">
    <p v-if="!collectionEntries.length" class="muted">
      Your roster is empty. Head to <NuxtLink to="/">Summon</NuxtLink> and open some packs first.
    </p>
    <div v-else class="roster-grid">
      <button
        v-for="entry in collectionEntries"
        :key="entry.character.id"
        class="pick"
        :class="{ disabled: selectedIds.length >= 3 && !selectedIds.includes(entry.character.id) }"
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

  <section v-if="outcome" class="panel result">
    <h2 class="section-title">Battle Result</h2>
    <p class="winner" :class="{ win: outcome.won, loss: !outcome.won }">
      {{ outcome.won ? 'Victory!' : 'Defeat.' }} Score {{ outcome.playerScore }} - {{ outcome.enemyScore }}
    </p>

    <div class="lineup-wrap">
      <div>
        <h3>Your Team</h3>
        <ul>
          <li v-for="hero in outcome.playerTeam" :key="hero.id">{{ hero.name }} (ATK {{ hero.attack }} | DEF {{ hero.defense }})</li>
        </ul>
      </div>
      <div>
        <h3>Enemy Team</h3>
        <ul>
          <li v-for="(enemy, index) in outcome.enemyTeam" :key="`${enemy.id}-${index}`">
            {{ enemy.name }} (ATK {{ enemy.attack }} | DEF {{ enemy.defense }})
          </li>
        </ul>
      </div>
    </div>

    <h3>Round Log</h3>
    <ul>
      <li v-for="(line, index) in outcome.rounds" :key="index">{{ line }}</li>
    </ul>
  </section>
</template>

<style scoped>
.battle-head {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.battle-head p {
  margin: 0.35rem 0 0;
}

.team-stats {
  text-align: right;
}

.team-stats p {
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.05rem;
}

.head-buttons {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  justify-content: end;
}

.roster {
  margin-top: 0.85rem;
  padding: 1rem;
}

.roster-grid {
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

.pick.disabled {
  opacity: 0.55;
}

.result {
  margin-top: 0.85rem;
  padding: 1rem;
}

.winner {
  margin: 0.7rem 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
}

.win {
  color: var(--emerald);
}

.loss {
  color: var(--danger);
}

.lineup-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

h3 {
  margin: 0.75rem 0 0.3rem;
  font-family: 'Rajdhani', sans-serif;
}

ul {
  margin: 0;
  padding-left: 1.1rem;
}

li {
  margin: 0.3rem 0;
}

@media (max-width: 780px) {
  .lineup-wrap {
    grid-template-columns: 1fr;
  }

  .team-stats {
    text-align: left;
  }

  .head-buttons {
    justify-content: start;
  }
}
</style>
