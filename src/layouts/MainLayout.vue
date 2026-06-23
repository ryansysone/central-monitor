<script setup lang="ts">
import AppSidebar from "../components/AppSidebar.vue";
</script>

<template>
  <div class="main-layout">
    <AppSidebar />

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
  background: var(--page-bg);
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: 24px;
  box-sizing: border-box;
}
</style>
