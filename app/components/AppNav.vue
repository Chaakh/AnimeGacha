<template>
  <header class="nav-wrap">
    <div class="nav-inner panel">
      <NuxtLink class="brand" to="/">
        <span class="brand-mark">AG</span>
        <span class="brand-text">
          <strong>AniGacka</strong>
          <small>Daily anime pulls</small>
        </span>
      </NuxtLink>

      <nav class="links">
        <NuxtLink class="link" to="/">Summon</NuxtLink>
        <NuxtLink class="link" to="/collection">Collection</NuxtLink>
        <NuxtLink class="link" to="/battle">Battle</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav-wrap {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(8px);
  background: linear-gradient(to bottom, rgb(8 13 24 / 70%) 0%, transparent 100%);
}

.nav-inner {
  width: min(1160px, 92vw);
  margin: 0.75rem auto;
  padding: 0.65rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.brand {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: inherit;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgb(255 203 83 / 50%);
  background: linear-gradient(150deg, #f7ca57 0%, #a46b10 100%);
  color: #221400;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}

.brand-text {
  display: grid;
}

.brand-text strong {
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.06em;
  font-size: 1.1rem;
}

.brand-text small {
  color: var(--ink-soft);
}

.links {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.link {
  text-decoration: none;
  color: var(--ink-soft);
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid transparent;
}

.link:hover {
  color: var(--ink);
  border-color: rgb(96 150 245 / 38%);
  background: rgb(22 33 58 / 52%);
}

.router-link-active {
  color: var(--ink);
  border-color: rgb(96 150 245 / 54%);
  background: rgb(18 29 54 / 88%);
}

@media (max-width: 680px) {
  .nav-inner {
    width: 94vw;
    padding: 0.55rem 0.7rem;
  }

  .brand-text small {
    display: none;
  }
}
</style>
