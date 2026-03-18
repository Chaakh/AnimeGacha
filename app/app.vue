<template>
  <div class="site-shell">
    <NuxtRouteAnnouncer />
    <AppNav />
    <main class="site-main">
      <NuxtPage />
    </main>
    <footer class="site-footer">
      animegacha v{{ appVersion }}
    </footer>
  </div>
</template>

<script setup lang="ts">
const { ensureInitialized } = useGacha()
const runtimeConfig = useRuntimeConfig()
const appVersion = computed(() => runtimeConfig.public.appVersion || 'dev')

onMounted(() => {
  void ensureInitialized()
})
</script>
