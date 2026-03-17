<template>
  <div class="site-shell">
    <NuxtRouteAnnouncer />
    <AppNav />
    <main class="site-main">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
const { ensureInitialized } = useGacha()

onMounted(() => {
  void ensureInitialized()
})
</script>
