<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";

import SummaryCard from "../components/SummaryCard.vue";
import AgentStatusTable from "../components/AgentStatusTable.vue";
import RecentLogsPanel from "../components/RecentLogsPanel.vue";
import AlertCenter from "../components/AlertCenter.vue";

import TopHostsBarChart from "../components/charts/TopHostsBarChart.vue";
import TopErrorHostsChart from "../components/charts/TopErrorHostsChart.vue";
import ErrorDistributionChart from "../components/charts/ErrorDistributionChart.vue";
import HostStatusDistributionChart from "../components/charts/HostStatusDistributionChart.vue";

import { useDashboardStore } from "../stores/dashboard";
import { useThemeStore } from "../stores/theme";

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();
const router = useRouter();

const searchKeyword = ref(
  localStorage.getItem("dashboardSearchKeyword") ?? ""
);

const autoRefreshSeconds = ref(
  Number(localStorage.getItem("autoRefreshSeconds") || 30)
);

const topN = ref(
  Number(localStorage.getItem("topN") || 5)
);

let refreshTimer: number | undefined;

const filteredAgents = computed(() => {
  const keyword = searchKeyword.value
    .trim()
    .toLowerCase();

  if (!keyword) {
    return dashboardStore.agents;
  }

  return dashboardStore.agents.filter((agent) => {
    const agentCode =
      agent.agentCode?.toLowerCase() ?? "";

    const hostName =
      agent.hostName?.toLowerCase() ?? "";

    const status =
      agent.status?.toLowerCase() ?? "";

    return (
      agentCode.includes(keyword) ||
      hostName.includes(keyword) ||
      status.includes(keyword)
    );
  });
});

const offlineAgents = computed(() => {
  return dashboardStore.agents.filter(
    (agent) => agent.status === "OFFLINE"
  );
});

const criticalAgents = computed(() => {
  return dashboardStore.agents.filter((agent) => {
    return (
      Number(agent.cpuUsage ?? 0) >= 90 ||
      Number(agent.memoryUsage ?? 0) >= 90 ||
      Number(agent.diskUsage ?? 0) >= 90
    );
  });
});

const errorAgents = computed(() => {
  const errorAgentCodes = new Set(
    dashboardStore.logs
      .filter((log) => log.logLevel === "ERROR")
      .map((log) => log.agentCode)
  );

  return dashboardStore.agents.filter((agent) =>
    errorAgentCodes.has(agent.agentCode)
  );
});

const latestErrorLog = computed(() => {
  return (
    dashboardStore.logs
      .filter((log) => log.logLevel === "ERROR")
      .sort((a, b) => {
        return (
          new Date(b.loggedAt).getTime() -
          new Date(a.loggedAt).getTime()
        );
      })[0] ?? null
  );
});

const serviceStatusSummary = computed(() => {
  const services =
    dashboardStore.agents.flatMap((agent) => [
      agent.databaseStatus ?? "UNKNOWN",
      agent.ftpStatus ?? "UNKNOWN",
      agent.applicationStatus ?? "UNKNOWN",
    ]);

  return {
    up: services.filter(
      (status) => status === "UP"
    ).length,

    down: services.filter(
      (status) => status === "DOWN"
    ).length,

    unknown: services.filter(
      (status) => status === "UNKNOWN"
    ).length,
  };
});

const dashboardHealthScore = computed(() => {
  const total =
    dashboardStore.summary.totalAgents;

  if (total === 0) {
    return 100;
  }

  const onlinePenalty =
    (dashboardStore.summary.offlineAgents /
      total) *
    40;

  const criticalPenalty =
    criticalAgents.value.length * 15;

  const errorPenalty =
    errorAgents.value.length * 10;

  const score =
    100 -
    onlinePenalty -
    criticalPenalty -
    errorPenalty;

  return Math.max(0, Math.round(score));
});

const healthStatusLabel = computed(() => {
  if (dashboardHealthScore.value >= 90) {
    return "健康";
  }

  if (dashboardHealthScore.value >= 70) {
    return "警告";
  }

  return "危險";
});

const healthStatusClass = computed(() => {
  if (dashboardHealthScore.value >= 90) {
    return "health-good";
  }

  if (dashboardHealthScore.value >= 70) {
    return "health-warning";
  }

  return "health-critical";
});

async function refreshDashboard(): Promise<void> {
  await dashboardStore.loadDashboard();
}

function goToHostDetail(agentCode: string): void {
  router.push(`/host/${agentCode}`);
}

function changeTopN(value: number): void {
  topN.value = value;
  localStorage.setItem("topN", String(value));
}

function clearSearch(): void {
  searchKeyword.value = "";
  localStorage.removeItem(
    "dashboardSearchKeyword"
  );
}

function exportReport(): void {
  const reportRows = [
    ["Monitoring Dashboard Report"],
    [
      "Generated At",
      new Date().toLocaleString(),
    ],
    [],
    ["Summary"],
    [
      "Total Agents",
      dashboardStore.summary.totalAgents,
    ],
    [
      "Online Agents",
      dashboardStore.summary.onlineAgents,
    ],
    [
      "Offline Agents",
      dashboardStore.summary.offlineAgents,
    ],
    [
      "Error Count",
      dashboardStore.summary.errorCount,
    ],
    [],
    ["Agents"],
    [
      "Agent Code",
      "Host Name",
      "Status",
      "CPU Usage",
      "Memory Usage",
      "Disk Usage",
      "Database",
      "FTP",
      "Application",
    ],
    ...dashboardStore.agents.map((agent) => [
      agent.agentCode,
      agent.hostName,
      agent.status,
      `${agent.cpuUsage ?? 0}%`,
      `${agent.memoryUsage ?? 0}%`,
      `${agent.diskUsage ?? 0}%`,
      agent.databaseStatus ?? "UNKNOWN",
      agent.ftpStatus ?? "UNKNOWN",
      agent.applicationStatus ?? "UNKNOWN",
    ]),
    [],
    ["Recent Logs"],
    [
      "Time",
      "Agent",
      "Host",
      "Level",
      "Source",
      "Message",
    ],
    ...dashboardStore.logs.map((log) => [
      log.loggedAt,
      log.agentCode,
      log.hostName,
      log.logLevel,
      log.sourceType,
      log.message,
    ]),
  ];

  const csvContent = reportRows
    .map((row) => {
      return row
        .map((cell) => {
          const value = String(cell ?? "");

          return `"${value.replace(
            /"/g,
            '""'
          )}"`;
        })
        .join(",");
    })
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;

  link.download = `monitoring-report-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

watch(searchKeyword, (value) => {
  localStorage.setItem(
    "dashboardSearchKeyword",
    value
  );
});

onMounted(() => {
  autoRefreshSeconds.value = Number(
    localStorage.getItem("autoRefreshSeconds") || 30
  );

  void refreshDashboard();

  dashboardStore.connectWebSocket();

  refreshTimer = window.setInterval(() => {
    void refreshDashboard();
  }, autoRefreshSeconds.value * 1000);
});

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
  }

  dashboardStore.disconnectWebSocket();
});
</script>

<template>
  <div class="dashboard-page">
    <header class="page-header">
      <div class="header-main">
        <div class="dashboard-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none">
            <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" />

            <path d="M2 19h20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <div class="header-copy">
          <div class="dashboard-title-row">
            <h1>中央監控儀表板</h1>

            <span class="monitoring-badge">
              <span class="monitoring-dot"></span>
              即時監控
            </span>
          </div>

          <p class="dashboard-description">
            集中查看主機狀態、效能指標、服務健康度與異常事件
          </p>

          <div class="refresh-information">
            <span class="auto-refresh-status">
              <span class="live-dot"></span>
              自動更新 {{ autoRefreshSeconds }} 秒
            </span>

            <span class="refresh-divider">·</span>

            <span v-if="dashboardStore.refreshing" class="refreshing-status">
              背景更新中...
            </span>

            <span v-else-if="
              dashboardStore.lastUpdated
            ">
              最後更新：
              {{
                dashboardStore.lastUpdated.toLocaleTimeString(
                  "zh-TW"
                )
              }}
            </span>

            <span v-else>
              尚未更新
            </span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <AlertCenter />

        <button class="header-button secondary-button" type="button" @click="themeStore.toggleTheme">
          <span class="action-icon" aria-hidden="true">
            {{
              themeStore.mode === "dark"
                ? "☀"
                : "◐"
            }}
          </span>

          {{
            themeStore.mode === "dark"
              ? "淺色模式"
              : "深色模式"
          }}
        </button>

        <button class="header-button secondary-button" type="button" :disabled="dashboardStore.loading ||
          dashboardStore.refreshing
          " @click="exportReport">
          <span class="action-icon" aria-hidden="true">
            ⇩
          </span>

          匯出報表
        </button>

        <button class="header-button primary-button" type="button" :disabled="dashboardStore.loading ||
          dashboardStore.refreshing
          " @click="refreshDashboard">
          <span class="action-icon" :class="{
            spinning:
              dashboardStore.refreshing,
          }" aria-hidden="true">
            ↻
          </span>

          {{
            dashboardStore.refreshing
              ? "更新中..."
              : "重新整理"
          }}
        </button>
      </div>
    </header>

    <div v-if="dashboardStore.loading" class="dashboard-skeleton" aria-label="正在載入儀表板">
      <div class="skeleton-summary-grid">
        <div v-for="index in 4" :key="`summary-${index}`" class="skeleton-card skeleton-summary-card">
          <div class="skeleton skeleton-small"></div>
          <div class="skeleton skeleton-number"></div>
          <div class="skeleton skeleton-medium"></div>
        </div>
      </div>

      <div class="skeleton-service-grid">
        <div v-for="index in 3" :key="`service-${index}`" class="skeleton-card skeleton-service-card">
          <div class="skeleton skeleton-small"></div>
          <div class="skeleton skeleton-number"></div>
        </div>
      </div>

      <div class="skeleton-widget-grid">
        <div v-for="index in 5" :key="`widget-${index}`" class="skeleton-card skeleton-widget-card">
          <div class="skeleton skeleton-medium"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-block"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="dashboardStore.error" class="status-message error" role="alert">
        <span class="status-message-icon">
          !
        </span>

        <div>
          <strong>儀表板載入失敗</strong>
          <p>{{ dashboardStore.error }}</p>
        </div>
      </div>

      <section class="summary-grid" aria-label="主機監控總覽">
        <div class="summary-item">
          <SummaryCard title="總主機數" :value="dashboardStore.summary.totalAgents" />
        </div>

        <div class="summary-item">
          <SummaryCard title="正常" :value="dashboardStore.summary.onlineAgents" />
        </div>

        <div class="summary-item">
          <SummaryCard title="異常" :value="dashboardStore.summary.offlineAgents" />
        </div>

        <div class="summary-item">
          <SummaryCard title="錯誤事件" :value="dashboardStore.summary.errorCount" />
        </div>
      </section>

      <section class="service-status-grid" aria-label="服務狀態總覽">
        <article class="service-status-card up">
          <div class="service-status-heading">
            <span class="service-status-icon">
              ✓
            </span>

            <div>
              <div class="service-status-title">
                服務正常
              </div>

              <div class="service-status-hint">
                目前正常運作
              </div>
            </div>
          </div>

          <div class="service-status-value">
            {{ serviceStatusSummary.up }}
          </div>
        </article>

        <article class="service-status-card down">
          <div class="service-status-heading">
            <span class="service-status-icon">
              !
            </span>

            <div>
              <div class="service-status-title">
                服務異常
              </div>

              <div class="service-status-hint">
                需要立即檢查
              </div>
            </div>
          </div>

          <div class="service-status-value">
            {{ serviceStatusSummary.down }}
          </div>
        </article>

        <article class="service-status-card unknown">
          <div class="service-status-heading">
            <span class="service-status-icon">
              ?
            </span>

            <div>
              <div class="service-status-title">
                服務未知
              </div>

              <div class="service-status-hint">
                尚無可用狀態
              </div>
            </div>
          </div>

          <div class="service-status-value">
            {{ serviceStatusSummary.unknown }}
          </div>
        </article>
      </section>

      <div class="section-heading">
        <div>
          <h2>監控中心</h2>
          <p>
            即時掌握系統健康度與需要注意的主機
          </p>
        </div>
      </div>

      <section class="noc-widgets-grid">
        <article class="noc-card health-score-card">
          <div>
            <span class="card-eyebrow">
              SYSTEM HEALTH
            </span>

            <h3>系統健康度</h3>

            <p>
              依據離線、高風險及異常主機計算
            </p>
          </div>

          <div class="health-score-result">
            <div :class="[
              'health-score-value',
              healthStatusClass,
            ]">
              {{ dashboardHealthScore }}
            </div>

            <div :class="[
              'health-score-label',
              healthStatusClass,
            ]">
              {{ healthStatusLabel }}
            </div>
          </div>
        </article>

        <article class="noc-card offline-hosts-card">
          <div class="widget-header">
            <div>
              <span class="card-eyebrow">
                OFFLINE
              </span>

              <h3>離線主機</h3>

              <p class="widget-hint">
                點擊主機查看詳細資訊
              </p>
            </div>

            <span class="widget-count danger-count">
              {{ offlineAgents.length }}
            </span>
          </div>

          <div v-if="offlineAgents.length === 0" class="widget-empty-state">
            <span class="empty-state-dot success"></span>
            目前沒有離線主機
          </div>

          <ul v-else class="widget-host-list">
            <li v-for="agent in offlineAgents" :key="agent.agentCode" role="button" tabindex="0"
              @click="goToHostDetail(agent.agentCode)" @keydown.enter.prevent="goToHostDetail(agent.agentCode)"
              @keydown.space.prevent="goToHostDetail(agent.agentCode)">

              <span class="offline-dot"></span>

              <span class="widget-host-name">
                {{
                  agent.hostName ||
                  agent.agentCode
                }}
              </span>

              <span class="row-arrow">›</span>
            </li>
          </ul>
        </article>

        <article class="noc-card critical-hosts-card">
          <div class="widget-header">
            <div>
              <span class="card-eyebrow">
                CRITICAL
              </span>

              <h3>高風險主機</h3>

              <p class="widget-hint">
                CPU／Memory／Disk ≥ 90%
              </p>
            </div>

            <span class="widget-count danger-count">
              {{ criticalAgents.length }}
            </span>
          </div>

          <div v-if="criticalAgents.length === 0" class="widget-empty-state">
            <span class="empty-state-dot success"></span>
            目前沒有高風險主機
          </div>

          <ul v-else class="widget-host-list critical-list">
            <li v-for="agent in criticalAgents" :key="agent.agentCode" role="button" tabindex="0"
              @click="goToHostDetail(agent.agentCode)" @keydown.enter.prevent="goToHostDetail(agent.agentCode)"
              @keydown.space.prevent="goToHostDetail(agent.agentCode)">
              <div class="critical-host-row">
                <span class="widget-host-name">
                  {{
                    agent.hostName ||
                    agent.agentCode
                  }}
                </span>

                <span class="critical-values">
                  CPU {{ agent.cpuUsage ?? 0 }}%
                  · MEM
                  {{ agent.memoryUsage ?? 0 }}%
                  · DISK
                  {{ agent.diskUsage ?? 0 }}%
                </span>
              </div>

              <span class="row-arrow">›</span>
            </li>
          </ul>
        </article>

        <article class="noc-card error-hosts-card">
          <div class="widget-header">
            <div>
              <span class="card-eyebrow">
                ERROR LOGS
              </span>

              <h3>異常主機</h3>

              <p class="widget-hint">
                偵測到 ERROR 等級日誌
              </p>
            </div>

            <span class="widget-count warning-count">
              {{ errorAgents.length }}
            </span>
          </div>

          <div v-if="errorAgents.length === 0" class="widget-empty-state">
            <span class="empty-state-dot success"></span>
            目前沒有異常主機
          </div>

          <ul v-else class="widget-host-list">
            <li v-for="agent in errorAgents" :key="agent.agentCode" role="button" tabindex="0"
              @click="goToHostDetail(agent.agentCode)" @keydown.enter.prevent="goToHostDetail(agent.agentCode)"
              @keydown.space.prevent="goToHostDetail(agent.agentCode)">

              <span class="error-dot"></span>

              <span class="widget-host-name">
                {{
                  agent.hostName ||
                  agent.agentCode
                }}
              </span>

              <span class="row-arrow">›</span>
            </li>
          </ul>
        </article>

        <article class="noc-card latest-error-card">
          <div class="widget-header">
            <div>
              <span class="card-eyebrow">
                LATEST ERROR
              </span>

              <h3>最新異常</h3>

              <p class="widget-hint">
                最近一筆 ERROR 日誌
              </p>
            </div>
          </div>

          <div v-if="!latestErrorLog" class="widget-empty-state">
            <span class="empty-state-dot success"></span>
            目前沒有 ERROR 日誌
          </div>

          <div v-else class="latest-error-body clickable-error" role="button" tabindex="0"
            @click="goToHostDetail(latestErrorLog.agentCode)"
            @keydown.enter.prevent="goToHostDetail(latestErrorLog.agentCode)"
            @keydown.space.prevent="goToHostDetail(latestErrorLog.agentCode)">

            <div class="latest-error-host">
              {{
                latestErrorLog.hostName ||
                latestErrorLog.agentCode
              }}
            </div>

            <div class="latest-error-message">
              {{ latestErrorLog.message }}
            </div>

            <div class="latest-error-footer">
              <span class="error-level-chip">
                ERROR
              </span>

              <span class="latest-error-time">
                {{ latestErrorLog.loggedAt }}
              </span>
            </div>
          </div>


        </article>
      </section>

      <div class="section-heading chart-section-heading">
        <div>
          <h2>效能排名</h2>
          <p>
            查看目前資源使用率最高的主機
          </p>
        </div>

        <div class="top-chart-toolbar" aria-label="排名顯示數量">
          <span class="toolbar-label">
            顯示數量
          </span>

          <div class="segmented-control">
            <button type="button" :class="{ active: topN === 3 }" @click="changeTopN(3)">
              3
            </button>

            <button type="button" :class="{ active: topN === 5 }" @click="changeTopN(5)">
              5
            </button>

            <button type="button" :class="{ active: topN === 10 }" @click="changeTopN(10)">
              10
            </button>
          </div>

          <span v-if="searchKeyword.trim()" class="filter-hint">
            {{ filteredAgents.length }} 台符合
          </span>
        </div>
      </div>

      <section class="top-charts-grid">
        <TopHostsBarChart :title="`CPU 使用率前 ${topN} 名`" :hosts="filteredAgents" metric-key="cpuUsage" :top-n="topN"
          empty-text="目前沒有 CPU 資料" />

        <TopHostsBarChart :title="`Memory 使用率前 ${topN} 名`" :hosts="filteredAgents" metric-key="memoryUsage"
          :top-n="topN" empty-text="目前沒有 Memory 資料" />

        <TopHostsBarChart :title="`Disk 使用率前 ${topN} 名`" :hosts="filteredAgents" metric-key="diskUsage" :top-n="topN"
          empty-text="目前沒有 Disk 資料" />
      </section>

      <section class="content-section">
        <div class="search-panel">
          <div class="search-field">
            <span class="search-icon" aria-hidden="true">
              ⌕
            </span>

            <input id="dashboard-host-search" v-model="searchKeyword" name="dashboardHostSearch" class="search-input"
              type="search" autocomplete="off" placeholder="依 Agent Code、主機名稱或主機狀態搜尋..." />
          </div>

          <span class="search-result-count">
            {{ filteredAgents.length }} /
            {{ dashboardStore.agents.length }}
            台主機
          </span>

          <button v-if="searchKeyword.trim()" class="clear-search-button" type="button" @click="clearSearch">
            清除搜尋
          </button>
        </div>
      </section>

      <section class="analytics-grid">
        <TopErrorHostsChart :logs="dashboardStore.logs" :top-n="topN" />

        <ErrorDistributionChart :logs="dashboardStore.logs" />

        <HostStatusDistributionChart :hosts="dashboardStore.agents" />
      </section>

      <div class="section-heading">
        <div>
          <h2>主機列表</h2>

          <p>
            檢視所有 Agent 的即時狀態與資源使用率
          </p>
        </div>

        <span class="section-count">
          {{ filteredAgents.length }} 台
        </span>
      </div>

      <section class="content-section">
        <div v-if="
          filteredAgents.length === 0 &&
          searchKeyword.trim()
        " class="empty-filter-message">
          <div class="empty-filter-icon">
            ⌕
          </div>

          <strong>
            找不到符合搜尋條件的主機
          </strong>

          <p>
            請嘗試其他 Agent Code、主機名稱或狀態。
          </p>

          <button type="button" @click="clearSearch">
            清除搜尋條件
          </button>
        </div>

        <AgentStatusTable v-else :items="filteredAgents" @select-agent="goToHostDetail" />
      </section>

      <div class="section-heading">
        <div>
          <h2>最近日誌</h2>

          <p>
            查看中央監控系統最近接收到的事件
          </p>
        </div>

        <span class="section-count">
          {{ dashboardStore.logs.length }} 筆
        </span>
      </div>

      <section class="content-section">
        <RecentLogsPanel :items="dashboardStore.logs" />
      </section>

    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  width: 100%;
  box-sizing: border-box;
  background: var(--page-bg);
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

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 28px;
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

.dashboard-icon {
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

.header-copy {
  min-width: 0;
}

.dashboard-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.dashboard-title-row h1 {
  margin: 0;
  color: var(--text-main);
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.monitoring-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.monitoring-dot,
.live-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #22c55e;
}

.monitoring-dot {
  box-shadow:
    0 0 0 4px rgba(34, 197, 94, 0.12);
}

.dashboard-description {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.refresh-information {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 11px;
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.auto-refresh-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-main);
  font-weight: 600;
}

.refresh-divider {
  color: var(--border-color);
}

.refreshing-status {
  color: var(--primary-color);
  font-weight: 650;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.header-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.secondary-button {
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
}

.secondary-button:hover:not(:disabled) {
  border-color:
    color-mix(in srgb,
      var(--primary-color) 55%,
      var(--border-color));
  color: var(--primary-color);
  transform: translateY(-1px);
}

.primary-button {
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
  box-shadow:
    0 6px 16px rgba(37, 99, 235, 0.18);
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 8px 20px rgba(37, 99, 235, 0.24);
}

.header-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  font-size: 16px;
  line-height: 1;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--panel-bg);
}

.status-message.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.status-message p {
  margin: 5px 0 0;
  font-size: 13px;
}

.status-message-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #dc2626;
  color: #ffffff;
  font-weight: 800;
}

.summary-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 22px;
}

.summary-item {
  min-width: 0;
  height: 100%;
}

.summary-item :deep(.summary-card) {
  height: 100%;
}

.service-status-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 30px;
}

.service-status-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 108px;
  box-sizing: border-box;
  overflow: hidden;
  padding: 18px 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 8px 22px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.service-status-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 2px 5px rgba(15, 23, 42, 0.04),
    0 12px 26px rgba(15, 23, 42, 0.06);
}

.service-status-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
}

.service-status-card.up::before {
  background: #22c55e;
}

.service-status-card.down::before {
  background: #ef4444;
}

.service-status-card.unknown::before {
  background: #94a3b8;
}

.service-status-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.service-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 11px;
  font-size: 16px;
  font-weight: 800;
}

.service-status-card.up .service-status-icon {
  background: #f0fdf4;
  color: #15803d;
}

.service-status-card.down .service-status-icon {
  background: #fef2f2;
  color: #b91c1c;
}

.service-status-card.unknown .service-status-icon {
  background: rgba(148, 163, 184, 0.12);
  color: #64748b;
}

.service-status-title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.service-status-hint {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 12px;
}

.service-status-value {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.service-status-card.up .service-status-value {
  color: #16a34a;
}

.service-status-card.down .service-status-value {
  color: #dc2626;
}

.service-status-card.unknown .service-status-value {
  color: #64748b;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin: 30px 0 16px;
}

.section-heading h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 19px;
  font-weight: 750;
  letter-spacing: -0.015em;
}

.section-heading p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.section-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.noc-widgets-grid {
  display: grid;
  grid-template-columns:
    repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 30px;
}

.noc-card {
  min-width: 0;
  min-height: 176px;
  box-sizing: border-box;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 8px 22px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.noc-card:hover {
  transform: translateY(-2px);
  border-color:
    rgba(59, 130, 246, 0.16);
  box-shadow:
    0 2px 5px rgba(15, 23, 42, 0.04),
    0 12px 28px rgba(15, 23, 42, 0.06);
}

.card-eyebrow {
  display: block;
  margin-bottom: 7px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.health-score-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.health-score-card h3,
.widget-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 750;
}

.health-score-card p {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.health-score-result {
  flex-shrink: 0;
  text-align: right;
}

.health-score-value {
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.health-score-label {
  margin-top: 7px;
  font-size: 12px;
  font-weight: 750;
}

.health-good {
  color: #16a34a;
}

.health-warning {
  color: #d97706;
}

.health-critical {
  color: #dc2626;
}

.widget-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.widget-hint {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.45;
}

.widget-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  min-height: 28px;
  box-sizing: border-box;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.danger-count {
  background: #fef2f2;
  color: #dc2626;
}

.warning-count {
  background: #fff7ed;
  color: #ea580c;
}

.widget-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 74px;
  box-sizing: border-box;
  padding: 12px;
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

.empty-state-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.empty-state-dot.success {
  background: #22c55e;
}

.widget-host-list {
  max-height: 104px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.widget-host-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 4px 2px;
  border-radius: 8px;
  color: var(--text-main);
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.widget-host-list li:hover,
.widget-host-list li:focus-visible {
  background: rgba(148, 163, 184, 0.08);
}

.widget-host-list li:focus-visible,
.clickable-error:focus-visible,
.segmented-control button:focus-visible,
.header-button:focus-visible,
.clear-search-button:focus-visible,
.empty-filter-message button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.widget-host-name {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-arrow {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 18px;
}

.offline-dot,
.error-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.offline-dot {
  background: #ef4444;
}

.error-dot {
  background: #f97316;
}

.critical-list li {
  align-items: flex-start;
}

.critical-host-row {
  min-width: 0;
}

.critical-values {
  display: block;
  margin-top: 4px;
  color: #dc2626;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.4;
}

.latest-error-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 78px;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: rgba(254, 242, 242, 0.6);
}

.clickable-error {
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}

.clickable-error:hover,
.clickable-error:focus-visible {
  transform: translateY(-1px);
  border-color: #fca5a5;
}

.latest-error-host {
  color: #dc2626;
  font-size: 12px;
  font-weight: 750;
}

.latest-error-message {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.45;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.latest-error-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}

.error-level-chip {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: #dc2626;
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.latest-error-time {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-section-heading {
  align-items: center;
}

.top-chart-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.segmented-control {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.08);
}

.segmented-control button {
  min-width: 38px;
  height: 30px;
  padding: 0 9px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.segmented-control button.active {
  background: var(--panel-bg);
  color: var(--primary-color);
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.1);
}

.filter-hint {
  color: var(--text-muted);
  font-size: 11px;
}

.top-charts-grid,
.analytics-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.content-section {
  margin-bottom: 26px;
}

.search-panel {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-size: 18px;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  width: 100%;
  min-height: 42px;
  box-sizing: border-box;
  padding: 0 14px 0 41px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  outline: none;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 13px;
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
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.clear-search-button {
  min-height: 38px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.clear-search-button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.empty-filter-message {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 220px;
  box-sizing: border-box;
  padding: 28px;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  background: var(--panel-bg);
  color: var(--text-muted);
  text-align: center;
}

.empty-filter-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  margin-bottom: 13px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-muted);
  font-size: 25px;
}

.empty-filter-message strong {
  color: var(--text-main);
  font-size: 15px;
}

.empty-filter-message p {
  margin: 7px 0 16px;
  font-size: 12px;
}

.empty-filter-message button {
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--panel-bg);
  color: var(--primary-color);
  font-weight: 650;
  cursor: pointer;
}

/* Loading Skeleton */

.dashboard-skeleton {
  width: 100%;
}

.skeleton-summary-grid,
.skeleton-service-grid,
.skeleton-widget-grid {
  display: grid;
  gap: 18px;
  margin-bottom: 22px;
}

.skeleton-summary-grid {
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
}

.skeleton-service-grid {
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
}

.skeleton-widget-grid {
  grid-template-columns:
    repeat(5, minmax(0, 1fr));
}

.skeleton-card {
  box-sizing: border-box;
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
}

.skeleton-summary-card {
  min-height: 126px;
}

.skeleton-service-card {
  min-height: 108px;
}

.skeleton-widget-card {
  min-height: 176px;
}

.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 7px;
  background:
    rgba(148, 163, 184, 0.15);
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
  animation:
    skeleton-loading 1.35s infinite;
}

.skeleton-small {
  width: 84px;
  height: 12px;
}

.skeleton-medium {
  width: 132px;
  max-width: 70%;
  height: 14px;
}

.skeleton-number {
  width: 68px;
  height: 32px;
  margin-top: 19px;
}

.skeleton-line {
  width: 90%;
  height: 10px;
  margin-top: 13px;
}

.skeleton-block {
  width: 100%;
  height: 58px;
  margin-top: 22px;
}

@keyframes skeleton-loading {
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 1280px) {

  .noc-widgets-grid,
  .skeleton-widget-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .latest-error-card {
    grid-column: span 2;
  }
}

@media (max-width: 1050px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .top-charts-grid,
  .analytics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 850px) {

  .summary-grid,
  .skeleton-summary-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .service-status-grid,
  .skeleton-service-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart-section-heading {
    align-items: flex-start;
  }

  .search-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .search-result-count {
    padding-left: 2px;
  }
}

@media (max-width: 600px) {
  .page-header {
    gap: 18px;
    padding: 18px;
    border-radius: 14px;
  }

  .header-main {
    align-items: flex-start;
  }

  .dashboard-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
  }

  .dashboard-title-row h1 {
    font-size: 22px;
  }

  .dashboard-description {
    font-size: 12px;
  }

  .header-actions {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .header-button {
    width: 100%;
    padding: 0 10px;
  }

  .summary-grid,
  .skeleton-summary-grid,
  .noc-widgets-grid,
  .skeleton-widget-grid {
    grid-template-columns: 1fr;
  }

  .latest-error-card {
    grid-column: auto;
  }

  .health-score-card {
    min-height: 154px;
  }

  .service-status-card {
    min-height: 98px;
  }

  .top-chart-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .search-panel {
    padding: 11px;
  }

  .clear-search-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {

  .header-button,
  .service-status-card,
  .noc-card,
  .clickable-error {
    transition: none;
  }

  .spinning,
  .skeleton::after {
    animation: none;
  }
}
</style>
