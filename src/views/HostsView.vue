<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from "vue";
import { useRouter } from "vue-router";

import { useDashboardStore } from "../stores/dashboard";

const dashboardStore = useDashboardStore();
const router = useRouter();

const searchKeyword = ref("");

const filteredHosts = computed(() => {
  const keyword = searchKeyword.value
    .trim()
    .toLowerCase();

  if (!keyword) {
    return dashboardStore.agents;
  }

  return dashboardStore.agents.filter((host) => {
    const agentCode =
      host.agentCode?.toLowerCase() ?? "";

    const hostName =
      host.hostName?.toLowerCase() ?? "";

    const status =
      host.status?.toLowerCase() ?? "";

    return (
      agentCode.includes(keyword) ||
      hostName.includes(keyword) ||
      status.includes(keyword)
    );
  });
});

const onlineHostCount = computed(() => {
  return dashboardStore.agents.filter(
    (host) => host.status === "ONLINE"
  ).length;
});

const offlineHostCount = computed(() => {
  return dashboardStore.agents.filter(
    (host) => host.status === "OFFLINE"
  ).length;
});

const unknownHostCount = computed(() => {
  return dashboardStore.agents.filter(
    (host) =>
      !host.status ||
      host.status === "UNKNOWN"
  ).length;
});

onMounted(() => {
  void dashboardStore.loadDashboard();
});

function openHost(agentCode: string): void {
  router.push(`/host/${agentCode}`);
}

function clearSearch(): void {
  searchKeyword.value = "";
}

function getHostStatusLabel(
  status: string | null | undefined
): string {
  switch (status) {
    case "ONLINE":
      return "正常";

    case "OFFLINE":
      return "異常";

    default:
      return "未知";
  }
}

function getHostStatusClass(
  status: string | null | undefined
): string {
  switch (status) {
    case "ONLINE":
      return "online";

    case "OFFLINE":
      return "offline";

    default:
      return "unknown";
  }
}

function formatPercent(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${value.toFixed(1)}%`;
}

function normalizePercent(
  value: number | null | undefined
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numberValue = Number(value);

  return Math.min(
    100,
    Math.max(0, numberValue)
  );
}

function getUsageLevel(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return "unknown";
  }

  const numberValue = Number(value);

  if (numberValue >= 90) {
    return "critical";
  }

  if (numberValue >= 75) {
    return "warning";
  }

  return "normal";
}
</script>

<template>
  <div class="hosts-page">
    <header class="page-header">
      <div class="header-main">
        <div class="header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none">
            <path
              d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-13C4.67 16 4 15.33 4 14.5v-9Z"
              stroke="currentColor" stroke-width="1.7" />

            <path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </div>

        <div>
          <div class="title-row">
            <h1>主機列表</h1>

            <span class="host-count-badge">
              {{ dashboardStore.agents.length }}
              台主機
            </span>
          </div>

          <p class="page-description">
            檢視所有 Agent 主機狀態與即時資源使用率
          </p>

          <div class="status-summary">
            <span class="summary-status online">
              <span class="summary-dot"></span>

              正常 {{ onlineHostCount }}
            </span>

            <span class="summary-divider">
              ·
            </span>

            <span class="summary-status offline">
              <span class="summary-dot"></span>

              異常 {{ offlineHostCount }}
            </span>

            <template v-if="unknownHostCount > 0">
              <span class="summary-divider">
                ·
              </span>

              <span class="summary-status unknown">
                <span class="summary-dot"></span>

                未知 {{ unknownHostCount }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </header>

    <section class="search-panel">
      <div class="search-field">
        <span class="search-icon" aria-hidden="true">
          ⌕
        </span>

        <input id="hosts-page-search" v-model="searchKeyword" name="hostsPageSearch" class="search-input" type="search"
          autocomplete="off" placeholder="搜尋 Agent Code、主機名稱或狀態..." />
      </div>

      <span class="search-result-count">
        {{ filteredHosts.length }} /
        {{ dashboardStore.agents.length }}
        台主機
      </span>

      <button v-if="searchKeyword.trim()" class="clear-search-button" type="button" @click="clearSearch">
        清除搜尋
      </button>
    </section>

    <div v-if="dashboardStore.loading" class="hosts-skeleton" aria-label="正在載入主機資料">
      <div v-for="index in 6" :key="`host-skeleton-${index}`" class="skeleton-card">
        <div class="skeleton-header">
          <div>
            <div class="skeleton skeleton-title"></div>

            <div class="skeleton skeleton-subtitle"></div>
          </div>

          <div class="skeleton skeleton-badge"></div>
        </div>

        <div v-for="usageIndex in 3" :key="`usage-${usageIndex}`" class="skeleton-usage">
          <div class="skeleton skeleton-label"></div>

          <div class="skeleton skeleton-bar"></div>
        </div>
      </div>
    </div>

    <div v-else-if="dashboardStore.error" class="error-state" role="alert">
      <span class="error-icon">
        !
      </span>

      <div>
        <strong>
          主機資料載入失敗
        </strong>

        <p>
          {{ dashboardStore.error }}
        </p>
      </div>
    </div>

    <div v-else-if="
      filteredHosts.length === 0 &&
      searchKeyword.trim()
    " class="empty-state">
      <div class="empty-icon">
        ⌕
      </div>

      <strong>
        找不到符合搜尋條件的主機
      </strong>

      <p>
        請嘗試其他 Agent Code、主機名稱或主機狀態。
      </p>

      <button type="button" @click="clearSearch">
        清除搜尋條件
      </button>
    </div>

    <div v-else-if="filteredHosts.length === 0" class="empty-state">
      <div class="empty-icon">
        ▣
      </div>

      <strong>
        目前沒有主機資料
      </strong>

      <p>
        尚未接收到任何 Agent 主機資訊。
      </p>
    </div>

    <section v-else class="host-list" aria-label="主機列表">
      <article v-for="host in filteredHosts" :key="host.agentCode" class="host-card"
        :class="getHostStatusClass(host.status)" role="button" tabindex="0" @click="openHost(host.agentCode)"
        @keydown.enter.prevent="
          openHost(host.agentCode)
          " @keydown.space.prevent="
            openHost(host.agentCode)
            ">
        <div class="host-card-header">
          <div class="host-identity">
            <div class="host-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path
                  d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-13C4.67 16 4 15.33 4 14.5v-9Z"
                  stroke="currentColor" stroke-width="1.7" />

                <path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </div>

            <div class="host-copy">
              <div class="host-code">
                {{ host.agentCode }}
              </div>

              <div class="host-name">
                {{
                  host.hostName ||
                  "未提供主機名稱"
                }}
              </div>
            </div>
          </div>

          <span :class="[
            'status-badge',
            getHostStatusClass(host.status),
          ]">
            <span class="status-dot"></span>

            {{
              getHostStatusLabel(host.status)
            }}
          </span>
        </div>

        <div class="usage-section">
          <div class="usage-item">
            <div class="usage-heading">
              <span>
                CPU 使用率
              </span>

              <strong :class="getUsageLevel(host.cpuUsage)
                ">
                {{
                  formatPercent(host.cpuUsage)
                }}
              </strong>
            </div>

            <div class="usage-track">
              <div class="usage-fill" :class="getUsageLevel(host.cpuUsage)
                " :style="{
                  width: `${normalizePercent(
                    host.cpuUsage
                  )}%`,
                }"></div>
            </div>
          </div>

          <div class="usage-item">
            <div class="usage-heading">
              <span>
                Memory 使用率
              </span>

              <strong :class="getUsageLevel(
                host.memoryUsage
              )
                ">
                {{
                  formatPercent(
                    host.memoryUsage
                  )
                }}
              </strong>
            </div>

            <div class="usage-track">
              <div class="usage-fill" :class="getUsageLevel(
                host.memoryUsage
              )
                " :style="{
                  width: `${normalizePercent(
                    host.memoryUsage
                  )}%`,
                }"></div>
            </div>
          </div>

          <div class="usage-item">
            <div class="usage-heading">
              <span>
                Disk 使用率
              </span>

              <strong :class="getUsageLevel(host.diskUsage)
                ">
                {{
                  formatPercent(host.diskUsage)
                }}
              </strong>
            </div>

            <div class="usage-track">
              <div class="usage-fill" :class="getUsageLevel(host.diskUsage)
                " :style="{
                  width: `${normalizePercent(
                    host.diskUsage
                  )}%`,
                }"></div>
            </div>
          </div>
        </div>

        <footer class="host-card-footer">
          <span>
            查看主機詳細資訊
          </span>

          <span class="card-arrow" aria-hidden="true">
            →
          </span>
        </footer>
      </article>
    </section>
  </div>
</template>

<style scoped>
.hosts-page {
  width: 100%;
  box-sizing: border-box;
  color: var(--text-main);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

/* =========================
   Page Header
   ========================= */

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding: 22px 24px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 10px 30px rgba(15, 23, 42, 0.05);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 16px;
  background:
    linear-gradient(145deg,
      rgba(59, 130, 246, 0.14),
      rgba(59, 130, 246, 0.05));
  color: var(--primary-color);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 8px 20px rgba(37, 99, 235, 0.08);
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.title-row h1 {
  margin: 0;
  color: var(--text-main);
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.host-count-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.page-description {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.5;
}

/* =========================
   Status Summary
   ========================= */

.status-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 11px;
  font-size: 14px;
}

.summary-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 650;
}

.summary-status.online {
  color: #15803d;
}

.summary-status.offline {
  color: #b91c1c;
}

.summary-status.unknown {
  color: #64748b;
}

.summary-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}

.summary-status.online .summary-dot {
  background: #22c55e;
}

.summary-status.offline .summary-dot {
  background: #ef4444;
}

.summary-status.unknown .summary-dot {
  background: #94a3b8;
}

.summary-divider {
  color: var(--border-color);
}

/* =========================
   Search Panel
   ========================= */

.search-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  padding: 13px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03);
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 13px;
  z-index: 1;
  color: var(--text-muted);
  font-size: 19px;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 14px 0 41px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  outline: none;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-result-count {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.clear-search-button {
  min-height: 40px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease;
}

.clear-search-button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* =========================
   Host List
   ========================= */

.host-list {
  display: grid;
  grid-template-columns:
    repeat(auto-fill,
      minmax(320px, 1fr));
  gap: 18px;
}

/* =========================
   Host Card
   ========================= */

.host-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: var(--panel-bg);
  cursor: pointer;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 22px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.host-card::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: #94a3b8;
}

.host-card.online::before {
  background: #22c55e;
}

.host-card.offline::before {
  background: #ef4444;
}

.host-card.unknown::before {
  background: #94a3b8;
}

.host-card:hover,
.host-card:focus-visible {
  outline: none;
  transform: translateY(-3px);
  border-color: rgba(59, 130, 246, 0.24);
  box-shadow:
    0 2px 6px rgba(15, 23, 42, 0.05),
    0 14px 30px rgba(15, 23, 42, 0.07);
}

.host-card:focus-visible {
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.12),
    0 14px 30px rgba(15, 23, 42, 0.07);
}

/* =========================
   Host Card Header
   ========================= */

.host-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 24px;
}

.host-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.host-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--primary-color);
}

.host-copy {
  min-width: 0;
}

.host-code {
  overflow: hidden;
  color: var(--text-main);
  font-size: 17px;
  font-weight: 750;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-name {
  margin-top: 4px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* =========================
   Status Badge
   ========================= */

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}

.status-badge.online {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.status-badge.online .status-dot {
  background: #22c55e;
}

.status-badge.offline {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.status-badge.offline .status-dot {
  background: #ef4444;
}

.status-badge.unknown {
  border: 1px solid var(--border-color);
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
}

.status-badge.unknown .status-dot {
  background: #94a3b8;
}

/* =========================
   Usage
   ========================= */

.usage-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.usage-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.4;
}

.usage-heading strong {
  color: var(--text-main);
  font-size: 15px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.usage-heading strong.normal {
  color: var(--text-main);
}

.usage-heading strong.warning {
  color: #d97706;
}

.usage-heading strong.critical {
  color: #dc2626;
}

.usage-heading strong.unknown {
  color: var(--text-muted);
}

.usage-track {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
}

.usage-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.usage-fill.normal {
  background: var(--primary-color);
}

.usage-fill.warning {
  background: #f59e0b;
}

.usage-fill.critical {
  background: #ef4444;
}

.usage-fill.unknown {
  background: #94a3b8;
}

/* =========================
   Card Footer
   ========================= */

.host-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
}

.card-arrow {
  color: var(--primary-color);
  font-size: 18px;
  transition: transform 0.18s ease;
}

.host-card:hover .card-arrow {
  transform: translateX(3px);
}

/* =========================
   Error State
   ========================= */

.error-state {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fef2f2;
  color: #b91c1c;
}

.error-state strong {
  font-size: 15px;
}

.error-state p {
  margin: 5px 0 0;
  font-size: 14px;
  line-height: 1.5;
}

.error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #dc2626;
  color: #ffffff;
  font-weight: 800;
}

/* =========================
   Empty State
   ========================= */

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 280px;
  box-sizing: border-box;
  padding: 30px;
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
  color: var(--text-muted);
  text-align: center;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  margin-bottom: 14px;
  border-radius: 15px;
  background: rgba(148, 163, 184, 0.1);
  font-size: 24px;
}

.empty-state strong {
  color: var(--text-main);
  font-size: 16px;
}

.empty-state p {
  margin: 8px 0 17px;
  font-size: 14px;
  line-height: 1.6;
}

.empty-state button {
  min-height: 38px;
  box-sizing: border-box;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--panel-bg);
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
}

/* =========================
   Loading Skeleton
   ========================= */

.hosts-skeleton {
  display: grid;
  grid-template-columns:
    repeat(auto-fill,
      minmax(320px, 1fr));
  gap: 18px;
}

.skeleton-card {
  min-height: 300px;
  box-sizing: border-box;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
}

.skeleton-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}

.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 7px;
  background: rgba(148, 163, 184, 0.15);
}

.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background:
    linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.32),
      transparent);
  animation: skeleton-loading 1.35s infinite;
}

.skeleton-title {
  width: 120px;
  height: 17px;
}

.skeleton-subtitle {
  width: 170px;
  height: 13px;
  margin-top: 9px;
}

.skeleton-badge {
  width: 62px;
  height: 30px;
  border-radius: 999px;
}

.skeleton-usage {
  margin-top: 18px;
}

.skeleton-label {
  width: 90px;
  height: 12px;
}

.skeleton-bar {
  width: 100%;
  height: 8px;
  margin-top: 9px;
  border-radius: 999px;
}

@keyframes skeleton-loading {
  100% {
    transform: translateX(100%);
  }
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 720px) {
  .page-header {
    padding: 18px;
    border-radius: 14px;
  }

  .header-main {
    align-items: flex-start;
  }

  .header-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
  }

  .title-row h1 {
    font-size: 22px;
  }

  .page-description {
    font-size: 14px;
  }

  .status-summary {
    font-size: 13px;
  }

  .search-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .search-result-count {
    padding-left: 2px;
  }

  .clear-search-button {
    width: 100%;
  }

  .host-list,
  .hosts-skeleton {
    grid-template-columns: 1fr;
  }
}

/* =========================
   Reduced Motion
   ========================= */

@media (prefers-reduced-motion: reduce) {

  .host-card,
  .usage-fill,
  .card-arrow,
  .search-input,
  .clear-search-button {
    transition: none;
  }

  .skeleton::after {
    animation: none;
  }
}
</style>
