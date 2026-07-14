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
  background: #0f172a;
  color: white;
  padding: 24px;
  box-sizing: border-box;
}

.logo {
  margin: 0 0 24px;
  font-size: 24px;
  font-weight: 700;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: block;
  color: #cbd5e1;
  text-decoration: none;
  padding: 12px;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.nav-item:hover {
  background: #1e293b;
  color: white;
}

.nav-item-active {
  background: #2563eb;
  color: white;
}
</style>
