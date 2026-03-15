<script setup lang="ts">
const { collectionEntries, rarityBreakdown } = useGacha()

const rarityFilter = ref<'All' | 'Common' | 'Rare' | 'Epic' | 'Legendary'>('All')

const filteredEntries = computed(() => {
  if (rarityFilter.value === 'All') {
    return collectionEntries.value
  }

  return collectionEntries.value.filter((entry) => entry.character.rarity === rarityFilter.value)
})

const totalOwned = computed(() => collectionEntries.value.reduce((sum, entry) => sum + entry.count, 0))
</script>

<template>
  <section class="panel top">
    <div>
      <h1 class="section-title">Collection</h1>
      <p class="muted">Track every character you have pulled so far.</p>
    </div>
    <div class="totals">
      <div>
        <small>Total Copies</small>
        <strong>{{ totalOwned }}</strong>
      </div>
      <div>
        <small>Unique Heroes</small>
        <strong>{{ collectionEntries.length }}</strong>
      </div>
    </div>
  </section>

  <section class="panel filters">
    <button
      v-for="option in ['All', 'Common', 'Rare', 'Epic', 'Legendary']"
      :key="option"
      class="button"
      :class="{ active: rarityFilter === option }"
      @click="rarityFilter = option"
    >
      {{ option }}
    </button>
  </section>

  <section class="breakdown">
    <article class="panel split" v-for="(count, rarity) in rarityBreakdown" :key="rarity">
      <p>{{ rarity }}</p>
      <strong>{{ count }}</strong>
    </article>
  </section>

  <section class="panel cards">
    <p v-if="!filteredEntries.length" class="muted">No characters in this rarity yet. Keep summoning.</p>
    <div v-else class="cards-grid">
      <CharacterCard
        v-for="entry in filteredEntries"
        :key="entry.character.id"
        :character="entry.character"
        :count="entry.count"
      />
    </div>
  </section>
</template>

<style scoped>
.top {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.top p {
  margin: 0.35rem 0 0;
}

.totals {
  display: flex;
  gap: 0.6rem;
}

.totals div {
  border: 1px solid rgb(66 92 137 / 50%);
  border-radius: 10px;
  padding: 0.45rem 0.7rem;
  min-width: 118px;
  text-align: center;
  background: rgb(16 26 48 / 76%);
}

.totals small {
  display: block;
  color: var(--ink-soft);
}

.totals strong {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.3rem;
}

.filters {
  margin-top: 0.85rem;
  padding: 0.7rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.active {
  border-color: rgb(247 201 72 / 70%);
  color: #ffe3a5;
}

.breakdown {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.7rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.split {
  padding: 0.7rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.split p,
.split strong {
  margin: 0;
}

.split strong {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.2rem;
}

.cards {
  margin-top: 0.85rem;
  padding: 1rem;
}

.cards-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(188px, 1fr));
}

@media (max-width: 780px) {
  .breakdown {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
