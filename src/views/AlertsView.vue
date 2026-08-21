<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from "vue";

import { useDashboardStore } from "../stores/dashboard";

const dashboardStore = useDashboardStore();

const selectedFilter = ref("ALL");
const searchKeyword = ref("");
const selectedAgentCode = ref<string | null>(null);
const refreshing = ref(false);
const initialized = ref(false);
const lastUpdatedAt = ref<Date | null>(null);

const autoRefreshSeconds = ref(
  Number(
    localStorage.getItem("autoRefreshSeconds") || 30
  )
);

let refreshTimer: number | undefined;

/*
 * Critical：
 *
 * 只要主機離線，或任一服務 DOWN，
 * 就視為嚴重警示。
 */
function isCritical(
  agent: (typeof dashboardStore.agents)[number]
): boolean {
  return (
    agent.status === "OFFLINE" ||
    agent.databaseStatus === "DOWN" ||
    agent.ftpStatus === "DOWN" ||
    agent.applicationStatus === "DOWN"
  );
}

/*
 * Warning：
 *
 * CPU / Memory / Disk 任一使用率 >= 80%
 * 就視為警告。
 */
function isWarning(
  agent: (typeof dashboardStore.agents)[number]
): boolean {
  return (
    (agent.cpuUsage ?? 0) >= 80 ||
    (agent.memoryUsage ?? 0) >= 80 ||
    (agent.diskUsage ?? 0) >= 80
  );
}

/*
 * 嚴重警示主機
 */
const criticalAlerts = computed(() => {
  return dashboardStore.agents.filter(
    (agent) => isCritical(agent)
  );
});

/*
 * 警告主機
 *
 * 已經屬於 Critical 的主機，
 * 不會重複出現在 Warning。
 */
const warningAlerts = computed(() => {
  return dashboardStore.agents.filter(
    (agent) =>
      !isCritical(agent) &&
      isWarning(agent)
  );
});

/*
 * 正常主機
 */
const healthyHosts = computed(() => {
  return dashboardStore.agents.filter(
    (agent) =>
      !isCritical(agent) &&
      !isWarning(agent)
  );
});

/*
 * 目前所有警示數量
 */
const totalAlertCount = computed(() => {
  return (
    criticalAlerts.value.length +
    warningAlerts.value.length
  );
});

/*
 * 根據警示種類與搜尋條件
 * 產生目前畫面要顯示的警示。
 */
const filteredAlerts = computed(() => {
  let alerts;

  if (selectedFilter.value === "CRITICAL") {
    alerts = criticalAlerts.value.map(
      (agent) => ({
        type: "CRITICAL",
        agent,
      })
    );
  } else if (
    selectedFilter.value === "WARNING"
  ) {
    alerts = warningAlerts.value.map(
      (agent) => ({
        type: "WARNING",
        agent,
      })
    );
  } else {
    alerts = [
      ...criticalAlerts.value.map(
        (agent) => ({
          type: "CRITICAL",
          agent,
        })
      ),

      ...warningAlerts.value.map(
        (agent) => ({
          type: "WARNING",
          agent,
        })
      ),
    ];
  }

  const keyword = searchKeyword.value
    .trim()
    .toLowerCase();

  if (!keyword) {
    return alerts;
  }

  return alerts.filter((item) => {
    const agentCode =
      item.agent.agentCode
        ?.toLowerCase() ?? "";

    const hostName =
      item.agent.hostName
        ?.toLowerCase() ?? "";

    return (
      agentCode.includes(keyword) ||
      hostName.includes(keyword)
    );
  });
});

/*
 * 使用者目前選取的警示主機。
 */
const selectedAlert = computed(() => {
  if (!selectedAgentCode.value) {
    return null;
  }

  return (
    dashboardStore.agents.find(
      (agent) =>
        agent.agentCode ===
        selectedAgentCode.value
    ) ?? null
  );
});

/*
 * 最後更新時間
 */
const lastUpdated = computed(() => {
  if (!lastUpdatedAt.value) {
    return "-";
  }

  return lastUpdatedAt.value.toLocaleString(
    "zh-TW"
  );
});

/*
 * 載入 Dashboard / Alert 資料。
 */
async function loadAlerts(): Promise<void> {
  if (refreshing.value) {
    return;
  }

  const isInitialLoad =
    !initialized.value;

  if (!isInitialLoad) {
    refreshing.value = true;
  }

  try {
    await dashboardStore.loadDashboard();

    /*
     * Pinia Store 本身如果有 error，
     * 就不把這次視為成功更新。
     */
    if (!dashboardStore.error) {
      initialized.value = true;
      lastUpdatedAt.value = new Date();
    }
  } finally {
    refreshing.value = false;
  }
}

/*
 * 選取警示。
 */
function selectAlert(
  agentCode: string
): void {
  selectedAgentCode.value =
    selectedAgentCode.value === agentCode
      ? null
      : agentCode;
}

/*
 * 清除搜尋。
 */
function clearSearch(): void {
  searchKeyword.value = "";
}

/*
 * Severity CSS Class
 */
function getSeverityClass(
  type: string
): string {
  if (type === "CRITICAL") {
    return "severity-critical";
  }

  if (type === "WARNING") {
    return "severity-warning";
  }

  return "severity-info";
}

/*
 * Severity 中文名稱
 */
function getSeverityLabel(
  type: string
): string {
  if (type === "CRITICAL") {
    return "嚴重";
  }

  if (type === "WARNING") {
    return "警告";
  }

  return "資訊";
}

/*
 * Host Status 中文名稱
 */
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

/*
 * Service Status 中文名稱
 */
function getServiceStatusLabel(
  status: string | null | undefined
): string {
  switch (status) {
    case "UP":
      return "正常";

    case "DOWN":
      return "異常";

    default:
      return "未知";
  }
}

/*
 * Service Status CSS Class
 */
function getServiceStatusClass(
  status: string | null | undefined
): string {
  switch (status) {
    case "UP":
      return "status-normal";

    case "DOWN":
      return "status-critical";

    default:
      return "status-unknown";
  }
}

/*
 * Usage Level
 */
function getUsageLevel(
  value: number | null | undefined
): string {
  const numberValue =
    Number(value ?? 0);

  if (numberValue >= 90) {
    return "critical";
  }

  if (numberValue >= 80) {
    return "warning";
  }

  return "normal";
}

/*
 * Percentage Format
 */
function formatPercent(
  value: number | null | undefined
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "0.0";
  }

  return value.toFixed(1);
}

onMounted(() => {
  autoRefreshSeconds.value = Number(
    localStorage.getItem(
      "autoRefreshSeconds"
    ) || 30
  );

  loadAlerts();

  refreshTimer = window.setInterval(
    () => {
      loadAlerts();
    },
    autoRefreshSeconds.value * 1000
  );
});

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="alerts-page">
    <!-- =========================
         Header
         ========================= -->

    <header class="page-header">
      <div class="header-main">
        <div class="header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round" />

            <path d="M10 21h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </div>

        <div class="header-copy">
          <div class="title-row">
            <h1>警示中心</h1>

            <span class="alert-count-badge">
              {{ totalAlertCount }}
              筆警示
            </span>
          </div>

          <p class="page-description">
            即時檢視主機、服務與系統資源異常狀態
          </p>

          <div class="refresh-summary">
            <span class="live-indicator">
              <span class="live-dot"></span>

              自動更新
              {{ autoRefreshSeconds }}
              秒
            </span>

            <span class="summary-divider">
              ·
            </span>

            <span v-if="refreshing" class="refreshing-text">
              背景更新中...
            </span>

            <span v-else>
              最後更新：
              {{ lastUpdated }}
            </span>
          </div>
        </div>
      </div>

      <button type="button" class="refresh-button" :disabled="dashboardStore.loading ||
        refreshing
        " @click="loadAlerts">
        <span class="refresh-icon" :class="{
          spinning: refreshing,
        }" aria-hidden="true">
          ↻
        </span>

        {{
          refreshing
            ? "更新中..."
            : "重新整理"
        }}
      </button>
    </header>

    <!-- =========================
         Initial Loading
         ========================= -->

    <div v-if="
      dashboardStore.loading &&
      !initialized
    " class="loading-skeleton" aria-label="正在載入警示資料">
      <div class="skeleton-summary-grid">
        <div v-for="index in 3" :key="`summary-${index}`" class="skeleton-summary-card">
          <div class="skeleton skeleton-label"></div>

          <div class="skeleton skeleton-value"></div>
        </div>
      </div>

      <div class="skeleton-panel">
        <div class="skeleton-panel-header">
          <div class="skeleton skeleton-title"></div>

          <div class="skeleton skeleton-small"></div>
        </div>

        <div class="skeleton skeleton-search"></div>

        <div v-for="index in 4" :key="`alert-${index}`" class="skeleton-alert-row">
          <div class="skeleton skeleton-badge"></div>

          <div class="skeleton-row-copy">
            <div class="skeleton skeleton-row-title"></div>

            <div class="skeleton skeleton-row-text"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- =========================
           Error
           ========================= -->

      <div v-if="dashboardStore.error" class="error-state" role="alert">
        <span class="error-icon">
          !
        </span>

        <div class="error-content">
          <strong>
            警示資料更新失敗
          </strong>

          <p>
            {{ dashboardStore.error }}
          </p>

          <button type="button" :disabled="refreshing" @click="loadAlerts">
            重新載入
          </button>
        </div>
      </div>

      <!-- =========================
           Summary Cards
           ========================= -->

      <section class="alert-grid" aria-label="警示摘要">
        <article class="alert-card critical">
          <div class="alert-card-header">
            <div>
              <div class="alert-title">
                嚴重警示
              </div>

              <div class="alert-description">
                主機離線或服務異常
              </div>
            </div>

            <span class="summary-icon critical" aria-hidden="true">
              !
            </span>
          </div>

          <div class="alert-value">
            {{ criticalAlerts.length }}
          </div>
        </article>

        <article class="alert-card warning">
          <div class="alert-card-header">
            <div>
              <div class="alert-title">
                警告
              </div>

              <div class="alert-description">
                系統資源使用率過高
              </div>
            </div>

            <span class="summary-icon warning" aria-hidden="true">
              !
            </span>
          </div>

          <div class="alert-value">
            {{ warningAlerts.length }}
          </div>
        </article>

        <article class="alert-card healthy">
          <div class="alert-card-header">
            <div>
              <div class="alert-title">
                正常主機
              </div>

              <div class="alert-description">
                目前沒有偵測到異常
              </div>
            </div>

            <span class="summary-icon healthy" aria-hidden="true">
              ✓
            </span>
          </div>

          <div class="alert-value">
            {{ healthyHosts.length }}
          </div>
        </article>
      </section>

      <!-- =========================
           Alert Panel
           ========================= -->

      <section class="alert-panel">
        <div class="panel-header">
          <div>
            <h2>
              目前警示
            </h2>

            <p>
              共
              {{ totalAlertCount }}
              筆目前需要注意的主機警示
            </p>
          </div>

          <span class="record-count">
            {{ filteredAlerts.length }}
            筆
          </span>
        </div>

        <!-- Filters -->

        <div class="filter-toolbar">
          <div class="filter-bar">
            <button type="button" :class="[
              'filter-btn',
              {
                active:
                  selectedFilter ===
                  'ALL',
              },
            ]" @click="
              selectedFilter = 'ALL'
              ">
              全部

              <span class="filter-count">
                {{ totalAlertCount }}
              </span>
            </button>

            <button type="button" :class="[
              'filter-btn',
              'critical-filter',
              {
                active:
                  selectedFilter ===
                  'CRITICAL',
              },
            ]" @click="
              selectedFilter =
              'CRITICAL'
              ">
              嚴重

              <span class="filter-count">
                {{ criticalAlerts.length }}
              </span>
            </button>

            <button type="button" :class="[
              'filter-btn',
              'warning-filter',
              {
                active:
                  selectedFilter ===
                  'WARNING',
              },
            ]" @click="
              selectedFilter =
              'WARNING'
              ">
              警告

              <span class="filter-count">
                {{ warningAlerts.length }}
              </span>
            </button>
          </div>

          <div class="search-field">
            <span class="search-icon" aria-hidden="true">
              ⌕
            </span>

            <input v-model="searchKeyword" type="search" class="search-input" autocomplete="off"
              placeholder="搜尋 Agent Code 或主機名稱..." />

            <button v-if="searchKeyword.trim()" type="button" class="clear-search" aria-label="清除搜尋"
              @click="clearSearch">
              ×
            </button>
          </div>
        </div>

        <!-- Empty State -->

        <div v-if="
          filteredAlerts.length === 0
        " class="empty-alert">
          <div class="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>

          <template v-if="
            searchKeyword.trim() ||
            selectedFilter !== 'ALL'
          ">
            <strong>
              找不到符合條件的警示
            </strong>

            <p>
              請調整警示類型或搜尋條件。
            </p>
          </template>

          <template v-else>
            <strong>
              目前沒有警示
            </strong>

            <p>
              所有主機與服務目前皆在正常狀態。
            </p>
          </template>
        </div>

        <!-- Alert List -->

        <div v-else class="alert-list">
          <article v-for="item in filteredAlerts" :key="`${item.type}-${item.agent.agentCode}`
            " :class="[
              'alert-row',
              item.type === 'CRITICAL'
                ? 'critical-row'
                : 'warning-row',
              {
                selected:
                  selectedAgentCode ===
                  item.agent.agentCode,
              },
            ]" role="button" tabindex="0" @click="
              selectAlert(
                item.agent.agentCode
              )
              " @keydown.enter.prevent="
                selectAlert(
                  item.agent.agentCode
                )
                " @keydown.space.prevent="
                  selectAlert(
                    item.agent.agentCode
                  )
                  ">
            <div class="alert-row-main">
              <span :class="[
                'severity-icon',
                getSeverityClass(
                  item.type
                ),
              ]" aria-hidden="true">
                !
              </span>

              <div class="alert-content">
                <div class="alert-row-header">
                  <span :class="[
                    'severity-badge',
                    getSeverityClass(
                      item.type
                    ),
                  ]">
                    {{
                      getSeverityLabel(
                        item.type
                      )
                    }}
                  </span>

                  <strong class="agent-code">
                    {{
                      item.agent.agentCode
                    }}
                  </strong>

                  <span v-if="
                    item.agent.hostName
                  " class="host-name">
                    {{
                      item.agent.hostName
                    }}
                  </span>
                </div>

                <!-- Critical Reason -->

                <div v-if="
                  item.type ===
                  'CRITICAL'
                " class="alert-reason">
                  <span v-if="
                    item.agent.status ===
                    'OFFLINE'
                  " class="reason-item critical">
                    主機離線
                  </span>

                  <span v-if="
                    item.agent
                      .databaseStatus ===
                    'DOWN'
                  " class="reason-item critical">
                    Database 異常
                  </span>

                  <span v-if="
                    item.agent
                      .ftpStatus ===
                    'DOWN'
                  " class="reason-item critical">
                    FTP 異常
                  </span>

                  <span v-if="
                    item.agent
                      .applicationStatus ===
                    'DOWN'
                  " class="reason-item critical">
                    應用程式異常
                  </span>
                </div>

                <!-- Warning Reason -->

                <div v-else class="alert-reason">
                  <span v-if="
                    (item.agent
                      .cpuUsage ??
                      0) >= 80
                  " :class="[
                    'reason-item',
                    getUsageLevel(
                      item.agent.cpuUsage
                    ),
                  ]">
                    CPU
                    {{
                      formatPercent(
                        item.agent.cpuUsage
                      )
                    }}%
                  </span>

                  <span v-if="
                    (item.agent
                      .memoryUsage ??
                      0) >= 80
                  " :class="[
                    'reason-item',
                    getUsageLevel(
                      item.agent
                        .memoryUsage
                    ),
                  ]">
                    Memory
                    {{
                      formatPercent(
                        item.agent
                          .memoryUsage
                      )
                    }}%
                  </span>

                  <span v-if="
                    (item.agent
                      .diskUsage ??
                      0) >= 80
                  " :class="[
                    'reason-item',
                    getUsageLevel(
                      item.agent.diskUsage
                    ),
                  ]">
                    Disk
                    {{
                      formatPercent(
                        item.agent.diskUsage
                      )
                    }}%
                  </span>
                </div>
              </div>
            </div>

            <span class="row-arrow" :class="{
              expanded:
                selectedAgentCode ===
                item.agent.agentCode,
            }" aria-hidden="true">
              ›
            </span>
          </article>
        </div>
      </section>

      <!-- =========================
           Selected Alert Detail
           ========================= -->

      <section v-if="selectedAlert" class="alert-detail-panel">
        <div class="detail-header">
          <div>
            <h2>
              警示詳細資訊
            </h2>

            <p>
              {{
                selectedAlert.agentCode
              }}
              ·
              {{
                selectedAlert.hostName ||
                "未提供主機名稱"
              }}
            </p>
          </div>

          <button type="button" class="close-detail-button" aria-label="關閉警示詳細資訊" @click="
            selectedAgentCode = null
            ">
            ×
          </button>
        </div>

        <div class="detail-grid">
          <!-- Host -->

          <div class="detail-item">
            <span class="detail-label">
              Agent Code
            </span>

            <strong>
              {{
                selectedAlert.agentCode
              }}
            </strong>
          </div>

          <div class="detail-item">
            <span class="detail-label">
              主機名稱
            </span>

            <strong>
              {{
                selectedAlert.hostName ||
                "-"
              }}
            </strong>
          </div>

          <div class="detail-item">
            <span class="detail-label">
              主機狀態
            </span>

            <strong :class="selectedAlert.status ===
              'ONLINE'
              ? 'status-normal'
              : selectedAlert.status ===
                'OFFLINE'
                ? 'status-critical'
                : 'status-unknown'
              ">
              {{
                getHostStatusLabel(
                  selectedAlert.status
                )
              }}
            </strong>
          </div>

          <!-- Usage -->

          <div class="detail-item">
            <span class="detail-label">
              CPU 使用率
            </span>

            <strong :class="getUsageLevel(
              selectedAlert.cpuUsage
            )
              ">
              {{
                formatPercent(
                  selectedAlert.cpuUsage
                )
              }}%
            </strong>
          </div>

          <div class="detail-item">
            <span class="detail-label">
              Memory 使用率
            </span>

            <strong :class="getUsageLevel(
              selectedAlert.memoryUsage
            )
              ">
              {{
                formatPercent(
                  selectedAlert.memoryUsage
                )
              }}%
            </strong>
          </div>

          <div class="detail-item">
            <span class="detail-label">
              Disk 使用率
            </span>

            <strong :class="getUsageLevel(
              selectedAlert.diskUsage
            )
              ">
              {{
                formatPercent(
                  selectedAlert.diskUsage
                )
              }}%
            </strong>
          </div>

          <!-- Services -->

          <div class="detail-item">
            <span class="detail-label">
              Database
            </span>

            <strong :class="getServiceStatusClass(
              selectedAlert.databaseStatus
            )
              ">
              {{
                getServiceStatusLabel(
                  selectedAlert.databaseStatus
                )
              }}
            </strong>
          </div>

          <div class="detail-item">
            <span class="detail-label">
              FTP
            </span>

            <strong :class="getServiceStatusClass(
              selectedAlert.ftpStatus
            )
              ">
              {{
                getServiceStatusLabel(
                  selectedAlert.ftpStatus
                )
              }}
            </strong>
          </div>

          <div class="detail-item">
            <span class="detail-label">
              應用程式
            </span>

            <strong :class="getServiceStatusClass(
              selectedAlert.applicationStatus
            )
              ">
              {{
                getServiceStatusLabel(
                  selectedAlert.applicationStatus
                )
              }}
            </strong>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.alerts-page {
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
   Header
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
  border: 1px solid rgba(220, 38, 38, 0.16);
  border-radius: 16px;
  background:
    linear-gradient(145deg,
      rgba(220, 38, 38, 0.11),
      rgba(220, 38, 38, 0.035));
  color: #dc2626;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 8px 20px rgba(220, 38, 38, 0.06);
}

.header-copy {
  min-width: 0;
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

.alert-count-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.page-description {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.5;
}

.refresh-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-main);
  font-weight: 650;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow:
    0 0 0 4px rgba(34, 197, 94, 0.1);
}

.summary-divider {
  color: var(--border-color);
}

.refreshing-text {
  color: var(--primary-color);
  font-weight: 650;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  flex-shrink: 0;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.refresh-button:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
}

.refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.refresh-icon {
  display: inline-flex;
  font-size: 16px;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   Summary Cards
   ========================= */

.alert-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 22px;
}

.alert-card {
  position: relative;
  overflow: hidden;
  padding: 19px 20px 18px 23px;
  border: 1px solid rgba(148, 163, 184, 0.17);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 22px rgba(15, 23, 42, 0.04);
}

.alert-card::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
}

.alert-card.critical::before {
  background: #ef4444;
}

.alert-card.warning::before {
  background: #f59e0b;
}

.alert-card.healthy::before {
  background: #22c55e;
}

.alert-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.alert-title {
  color: var(--text-main);
  font-size: 15px;
  font-weight: 750;
}

.alert-description {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.alert-value {
  margin-top: 17px;
  color: var(--text-main);
  font-size: 30px;
  font-weight: 750;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 800;
}

.summary-icon.critical {
  background: rgba(239, 68, 68, 0.09);
  color: #dc2626;
}

.summary-icon.warning {
  background: rgba(245, 158, 11, 0.11);
  color: #b45309;
}

.summary-icon.healthy {
  background: rgba(34, 197, 94, 0.09);
  color: #15803d;
}

/* =========================
   Main Alert Panel
   ========================= */

.alert-panel,
.alert-detail-panel {
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.04);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-header h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 750;
}

.panel-header p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.record-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 45px;
  height: 28px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

/* =========================
   Filters
   ========================= */

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.025);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--panel-bg);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.filter-btn:hover {
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--text-main);
}

.filter-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
}

.filter-btn.critical-filter.active {
  border-color: #dc2626;
  background: #dc2626;
}

.filter-btn.warning-filter.active {
  border-color: #d97706;
  background: #d97706;
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  box-sizing: border-box;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.filter-btn.active .filter-count {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.search-field {
  position: relative;
  min-width: 0;
  flex: 1;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  color: var(--text-muted);
  font-size: 17px;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  width: 100%;
  min-height: 36px;
  box-sizing: border-box;
  padding: 0 38px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
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
    0 0 0 3px rgba(37, 99, 235, 0.08);
}

.clear-search {
  position: absolute;
  top: 50%;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 17px;
  transform: translateY(-50%);
  cursor: pointer;
}

.clear-search:hover {
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-main);
}

/* =========================
   Alert Rows
   ========================= */

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 14px;
  border: 1px solid var(--border-color);
  border-radius: 11px;
  outline: none;
  background: var(--panel-bg);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.alert-row:hover,
.alert-row:focus-visible {
  transform: translateY(-1px);
  box-shadow:
    0 5px 16px rgba(15, 23, 42, 0.05);
}

.alert-row.critical-row {
  border-left: 4px solid #ef4444;
}

.alert-row.warning-row {
  border-left: 4px solid #f59e0b;
}

.alert-row.critical-row:hover,
.alert-row.critical-row.selected {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.025);
}

.alert-row.warning-row:hover,
.alert-row.warning-row.selected {
  border-color: rgba(245, 158, 11, 0.32);
  background: rgba(245, 158, 11, 0.03);
}

.alert-row-main {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-width: 0;
}

.severity-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 800;
}

.severity-icon.severity-critical {
  background: rgba(239, 68, 68, 0.09);
  color: #dc2626;
}

.severity-icon.severity-warning {
  background: rgba(245, 158, 11, 0.11);
  color: #b45309;
}

.alert-content {
  min-width: 0;
}

.alert-row-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.severity-badge {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.severity-critical {
  background: rgba(239, 68, 68, 0.09);
  color: #dc2626;
}

.severity-warning {
  background: rgba(245, 158, 11, 0.11);
  color: #b45309;
}

.severity-info {
  background: rgba(59, 130, 246, 0.09);
  color: #2563eb;
}

.agent-code {
  color: var(--text-main);
  font-size: 15px;
  font-weight: 750;
}

.host-name {
  overflow: hidden;
  max-width: 280px;
  color: var(--text-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-reason {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 7px;
}

.reason-item {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 0 8px;
  border-radius: 7px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.reason-item.critical {
  background: rgba(239, 68, 68, 0.07);
  color: #b91c1c;
}

.reason-item.warning {
  background: rgba(245, 158, 11, 0.09);
  color: #b45309;
}

.row-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 22px;
  line-height: 1;
  transition:
    transform 0.18s ease,
    color 0.18s ease;
}

.alert-row:hover .row-arrow {
  color: var(--primary-color);
}

.row-arrow.expanded {
  transform: rotate(90deg);
  color: var(--primary-color);
}

/* =========================
   Detail Panel
   ========================= */

.alert-detail-panel {
  margin-top: 22px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.detail-header h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 750;
}

.detail-header p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.close-detail-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
}

.close-detail-button:hover {
  border-color: rgba(220, 38, 38, 0.3);
  color: #dc2626;
}

.detail-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.025);
}

.detail-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.detail-item strong {
  overflow-wrap: anywhere;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 750;
}

.detail-item strong.warning {
  color: #b45309;
}

.detail-item strong.critical {
  color: #dc2626;
}

.status-normal {
  color: #15803d !important;
}

.status-critical {
  color: #dc2626 !important;
}

.status-unknown {
  color: #64748b !important;
}

/* =========================
   Empty State
   ========================= */

.empty-alert {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 240px;
  padding: 28px;
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  color: var(--text-muted);
  text-align: center;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 13px;
  border-radius: 14px;
  background: rgba(34, 197, 94, 0.08);
  color: #16a34a;
}

.empty-alert strong {
  color: var(--text-main);
  font-size: 16px;
}

.empty-alert p {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.5;
}

/* =========================
   Error State
   ========================= */

.error-state {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 22px;
  padding: 16px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fef2f2;
  color: #b91c1c;
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

.error-content strong {
  font-size: 15px;
}

.error-content p {
  margin: 5px 0 10px;
  font-size: 13px;
  line-height: 1.5;
}

.error-content button {
  min-height: 31px;
  padding: 0 10px;
  border: 1px solid #fecaca;
  border-radius: 7px;
  background: #ffffff;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* =========================
   Loading Skeleton
   ========================= */

.loading-skeleton {
  width: 100%;
}

.skeleton-summary-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 22px;
}

.skeleton-summary-card {
  min-height: 130px;
  box-sizing: border-box;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
}

.skeleton-panel {
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
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

.skeleton-label {
  width: 95px;
  height: 12px;
}

.skeleton-value {
  width: 48px;
  height: 30px;
  margin-top: 22px;
}

.skeleton-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.skeleton-title {
  width: 120px;
  height: 18px;
}

.skeleton-small {
  width: 48px;
  height: 27px;
}

.skeleton-search {
  width: 100%;
  height: 50px;
  margin-bottom: 18px;
}

.skeleton-alert-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  box-sizing: border-box;
  margin-top: 9px;
  padding: 13px;
  border: 1px solid var(--border-color);
  border-radius: 11px;
}

.skeleton-badge {
  width: 31px;
  height: 31px;
}

.skeleton-row-copy {
  flex: 1;
}

.skeleton-row-title {
  width: 160px;
  height: 12px;
}

.skeleton-row-text {
  width: 260px;
  max-width: 70%;
  height: 9px;
  margin-top: 9px;
}

@keyframes skeleton-loading {
  100% {
    transform: translateX(100%);
  }
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 900px) {
  .filter-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-bar {
    flex-wrap: wrap;
  }

  .detail-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
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

  .refresh-button {
    width: 100%;
  }

  .alert-grid,
  .skeleton-summary-grid {
    grid-template-columns: 1fr;
  }

  .alert-panel,
  .alert-detail-panel {
    padding: 16px;
    border-radius: 13px;
  }

  .filter-bar {
    display: grid;
    grid-template-columns:
      repeat(3, 1fr);
    width: 100%;
  }

  .filter-btn {
    justify-content: center;
  }

  .alert-row {
    align-items: flex-start;
  }

  .host-name {
    width: 100%;
    max-width: none;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

/* =========================
   Accessibility
   ========================= */

@media (prefers-reduced-motion: reduce) {

  .refresh-button,
  .alert-row,
  .row-arrow {
    transition: none;
  }

  .spinning,
  .skeleton::after {
    animation: none;
  }
}
</style>
