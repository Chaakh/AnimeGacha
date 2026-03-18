<template>
  <header class="nav-wrap">
    <div class="nav-inner">
      <nav class="links" aria-label="Primary navigation">
        <NuxtLink class="link" to="/">Summon</NuxtLink>
        <NuxtLink class="link" to="/collection">Collection</NuxtLink>
        <NuxtLink class="link" to="/battle">Battle</NuxtLink>
        <NuxtLink class="link" to="/pvp">PvP</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav-wrap {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid rgb(255 207 102 / 16%);
  backdrop-filter: blur(10px);
  background: rgb(10 10 12 / 76%);
}

.nav-inner {
  width: min(1160px, 92vw);
  margin: 0 auto;
  min-height: 64px;
  padding: 0.55rem 0.4rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.links {
  display: flex;
  gap: 0.55rem;
}

.link {
  text-decoration: none;
  color: #8b8f98;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(1.04rem, 2vw, 1.25rem);
  font-weight: 700;
  padding: 0.28rem 0.35rem;
  border-bottom: 2px solid transparent;
}

.link:hover {
  color: #d5d7de;
}

.router-link-active {
  color: #f8cf6f;
  border-color: #f8cf6f;
}

@media (max-width: 680px) {
  .nav-inner {
    width: 94vw;
    min-height: 56px;
  }
}
</style>
