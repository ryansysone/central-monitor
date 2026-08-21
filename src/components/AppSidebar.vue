<script setup lang="ts">
</script>
<template>
  <aside class="sidebar">
    <h2 class="logo">
      中央監控
    </h2>

    <nav class="nav-menu">
      <RouterLink to="/" class="nav-item" exact-active-class="nav-item-active">
        儀表板
      </RouterLink>

      <RouterLink to="/hosts" class="nav-item" active-class="nav-item-active">
        主機列表
      </RouterLink>

      <RouterLink to="/alerts" class="nav-item" active-class="nav-item-active">
        警示中心
      </RouterLink>

      <RouterLink to="/logs" class="nav-item" active-class="nav-item-active">
        系統日誌
      </RouterLink>

      <RouterLink to="/settings" class="nav-item" active-class="nav-item-active">
        系統設定
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px;
  background: #0f172a;
  color: #ffffff;
}

/* =========================
   Logo
   ========================= */

.logo {
  margin: 0 0 24px;
  color: #ffffff;
  font-size: 24px;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

/* =========================
   Navigation
   ========================= */

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 14px;
  border-radius: 9px;
  color: #cbd5e1;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  text-decoration: none;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.nav-item:hover {
  background: #1e293b;
  color: #ffffff;
}

.nav-item-active {
  background: #2563eb;
  color: #ffffff;
}

/* =========================
   Accessibility
   ========================= */

.nav-item:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(59, 130, 246, 0.35);
}

@media (prefers-reduced-motion: reduce) {
  .nav-item {
    transition: none;
  }
}
</style>
