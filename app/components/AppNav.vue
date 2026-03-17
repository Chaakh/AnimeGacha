<template>
  <header class="nav-wrap">
    <div class="nav-inner">
      <span class="left-icon" aria-hidden="true">JP</span>

      <nav class="links" aria-label="Primary navigation">
        <NuxtLink class="link" to="/">Summon</NuxtLink>
        <NuxtLink class="link" to="/collection">Collection</NuxtLink>
        <NuxtLink class="link" to="/battle">Battle</NuxtLink>
      </nav>

      <div class="actions" aria-hidden="true">
        <span class="icon">🏆</span>
        <span class="icon alt">?</span>
      </div>
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
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.left-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgb(255 207 102 / 26%);
  color: #ffcd5a;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
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

.actions {
  display: flex;
  gap: 0.4rem;
}

.icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 14%);
  background: rgb(255 255 255 / 2%);
}

.icon.alt {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}

@media (max-width: 680px) {
  .nav-inner {
    width: 94vw;
    min-height: 56px;
  }
}
</style>
