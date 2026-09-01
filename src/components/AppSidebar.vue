<script setup lang="ts">
import {
  Activity,
  LayoutDashboard,
  Server,
  TriangleAlert,
  ScrollText,
  Settings,
} from "lucide-vue-next";
</script>

<template>
  <aside class="sidebar" aria-label="中央監控導覽">
    <!-- =========================
         Brand
         ========================= -->
    <div class="brand">
      <div class="brand-icon" aria-hidden="true">
        <Activity :size="21" :stroke-width="2.1" />
      </div>

      <div class="brand-content">
        <h2 class="logo">
          中央監控
        </h2>

        <span class="brand-subtitle">
          MONITORING SYSTEM
        </span>
      </div>
    </div>

    <!-- =========================
         Navigation
         ========================= -->
    <nav class="nav-menu" aria-label="主要功能">
      <RouterLink to="/" class="nav-item" exact-active-class="nav-item-active">
        <LayoutDashboard class="nav-icon" :size="19" :stroke-width="1.9" aria-hidden="true" />

        <span class="nav-label">
          儀表板
        </span>
      </RouterLink>

      <RouterLink to="/hosts" class="nav-item" active-class="nav-item-active">
        <Server class="nav-icon" :size="19" :stroke-width="1.9" aria-hidden="true" />

        <span class="nav-label">
          主機列表
        </span>
      </RouterLink>

      <RouterLink to="/alerts" class="nav-item" active-class="nav-item-active">
        <TriangleAlert class="nav-icon" :size="19" :stroke-width="1.9" aria-hidden="true" />

        <span class="nav-label">
          警示中心
        </span>
      </RouterLink>

      <RouterLink to="/logs" class="nav-item" active-class="nav-item-active">
        <ScrollText class="nav-icon" :size="19" :stroke-width="1.9" aria-hidden="true" />

        <span class="nav-label">
          系統日誌
        </span>
      </RouterLink>

      <RouterLink to="/settings" class="nav-item" active-class="nav-item-active">
        <Settings class="nav-icon" :size="19" :stroke-width="1.9" aria-hidden="true" />

        <span class="nav-label">
          系統設定
        </span>
      </RouterLink>
    </nav>

    <!-- =========================
         Footer Status
         ========================= -->
    <div class="sidebar-footer">
      <div class="system-status">
        <span class="status-indicator" aria-hidden="true">
          <span class="status-dot"></span>
        </span>

        <div class="status-content">
          <span class="status-title">
            系統監控中
          </span>

          <span class="status-description">
            Central Monitor
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* =========================
   Sidebar
   ========================= */

.sidebar {
  width: 240px;
  min-height: 100vh;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;

  padding: 20px 15px 18px;

  color: #f8fafc;

  background:
    linear-gradient(180deg,
      #0f172a 0%,
      #0c1424 48%,
      #0a1120 100%);

  border-right: 1px solid rgba(148, 163, 184, 0.08);

  box-shadow:
    1px 0 0 rgba(15, 23, 42, 0.35);
}


/* =========================
   Brand
   ========================= */

.brand {
  display: flex;
  align-items: center;

  min-height: 54px;

  gap: 12px;

  margin-bottom: 27px;
  padding: 0 8px;
}

.brand-icon {
  position: relative;

  width: 38px;
  height: 38px;

  flex: 0 0 38px;

  display: flex;
  align-items: center;
  justify-content: center;

  box-sizing: border-box;

  color: #60a5fa;

  background:
    linear-gradient(145deg,
      rgba(59, 130, 246, 0.18),
      rgba(37, 99, 235, 0.07));

  border: 1px solid rgba(96, 165, 250, 0.16);
  border-radius: 10px;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 5px 16px rgba(0, 0, 0, 0.14);
}

.brand-icon::after {
  content: "";

  position: absolute;
  inset: 5px;

  pointer-events: none;

  border: 1px solid rgba(96, 165, 250, 0.05);
  border-radius: 6px;
}

.brand-content {
  min-width: 0;

  display: flex;
  flex-direction: column;
  justify-content: center;
}

.logo {
  margin: 0;

  color: #f8fafc;

  font-size: 18px;
  font-weight: 720;
  line-height: 1.25;

  letter-spacing: -0.015em;
}

.brand-subtitle {
  margin-top: 4px;

  color: #64748b;

  font-size: 9px;
  font-weight: 700;
  line-height: 1;

  letter-spacing: 0.13em;

  white-space: nowrap;
}


/* =========================
   Navigation
   ========================= */

.nav-menu {
  display: flex;
  flex-direction: column;

  gap: 5px;
}

.nav-item {
  position: relative;

  display: flex;
  align-items: center;

  min-height: 44px;

  box-sizing: border-box;

  gap: 12px;

  padding: 0 13px;

  overflow: hidden;

  color: #94a3b8;

  background: transparent;

  border: 1px solid transparent;
  border-radius: 9px;

  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;

  text-decoration: none;

  transition:
    color 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.nav-icon {
  position: relative;
  z-index: 1;

  flex-shrink: 0;

  color: #64748b;

  transition: color 160ms ease;
}

.nav-label {
  position: relative;
  z-index: 1;

  min-width: 0;
}


/* =========================
   Navigation Hover
   ========================= */

.nav-item:hover {
  color: #e2e8f0;

  background: rgba(148, 163, 184, 0.065);

  border-color: rgba(148, 163, 184, 0.055);
}

.nav-item:hover .nav-icon {
  color: #94a3b8;
}


/* =========================
   Active Navigation
   ========================= */

.nav-item-active {
  color: #f8fafc;

  background:
    linear-gradient(90deg,
      rgba(37, 99, 235, 0.18) 0%,
      rgba(37, 99, 235, 0.09) 58%,
      rgba(37, 99, 235, 0.045) 100%);

  border-color: rgba(59, 130, 246, 0.13);

  box-shadow:
    inset 3px 0 0 #3b82f6,
    inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.nav-item-active::after {
  content: "";

  position: absolute;

  top: 9px;
  right: 10px;
  bottom: 9px;

  width: 1px;

  background:
    linear-gradient(180deg,
      transparent,
      rgba(96, 165, 250, 0.18),
      transparent);
}

.nav-item-active .nav-icon {
  color: #60a5fa;
}

.nav-item-active:hover {
  color: #ffffff;

  background:
    linear-gradient(90deg,
      rgba(37, 99, 235, 0.21) 0%,
      rgba(37, 99, 235, 0.105) 58%,
      rgba(37, 99, 235, 0.05) 100%);

  border-color: rgba(59, 130, 246, 0.16);
}

.nav-item-active:hover .nav-icon {
  color: #60a5fa;
}


/* =========================
   Sidebar Footer
   ========================= */

.sidebar-footer {
  margin-top: auto;

  padding-top: 17px;

  border-top: 1px solid rgba(148, 163, 184, 0.075);
}

.system-status {
  display: flex;
  align-items: center;

  gap: 10px;

  min-height: 42px;

  box-sizing: border-box;

  padding: 7px 9px;

  border: 1px solid transparent;
  border-radius: 8px;
}

.status-indicator {
  width: 18px;
  height: 18px;

  flex: 0 0 18px;

  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  width: 7px;
  height: 7px;

  display: block;

  border-radius: 50%;

  background: #22c55e;

  box-shadow:
    0 0 0 3px rgba(34, 197, 94, 0.085),
    0 0 8px rgba(34, 197, 94, 0.16);
}

.status-content {
  min-width: 0;

  display: flex;
  flex-direction: column;
}

.status-title {
  color: #cbd5e1;

  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.status-description {
  margin-top: 2px;

  color: #475569;

  font-size: 10px;
  font-weight: 500;
  line-height: 1.3;

  letter-spacing: 0.01em;
}


/* =========================
   Accessibility
   ========================= */

.nav-item:focus-visible {
  outline: none;

  color: #f8fafc;

  border-color: rgba(96, 165, 250, 0.38);

  box-shadow:
    inset 3px 0 0 #3b82f6,
    0 0 0 3px rgba(59, 130, 246, 0.16);
}


/* =========================
   Reduced Motion
   ========================= */

@media (prefers-reduced-motion: reduce) {

  .nav-item,
  .nav-icon {
    transition: none;
  }
}
</style>
