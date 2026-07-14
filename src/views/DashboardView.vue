<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import SummaryCard from "../components/SummaryCard.vue";
import AgentStatusTable from "../components/AgentStatusTable.vue";
import RecentLogsPanel from "../components/RecentLogsPanel.vue";
import { useDashboardStore } from "../stores/dashboard";
import { useThemeStore } from "../stores/theme";
import TopHostsBarChart from "../components/charts/TopHostsBarChart.vue";
import TopErrorHostsChart from "../components/charts/TopErrorHostsChart.vue";
import ErrorDistributionChart from "../components/charts/ErrorDistributionChart.vue";
import AlertCenter from "../components/AlertCenter.vue";
import HostStatusDistributionChart from "../components/charts/HostStatusDistributionChart.vue";

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();
const router = useRouter();

const lastUpdatedAt = ref<string>("--");

const searchKeyword = ref(
  localStorage.getItem("dashboardSearchKeyword") ?? ""
);

const autoRefreshSeconds = ref(
  Number(localStorage.getItem("autoRefreshSeconds") || 30)
);

const topN = ref(Number(localStorage.getItem("topN") || 5));

const filteredAgents = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  if (!keyword) {
    return dashboardStore.agents;
  }

  return dashboardStore.agents.filter((agent) => {
    return (
      agent.agentCode.toLowerCase().includes(keyword) ||
      agent.hostName.toLowerCase().includes(keyword) ||
      agent.status.toLowerCase().includes(keyword)
    );
  });
});

const offlineAgents = computed(() =>
  dashboardStore.agents.filter((agent) => agent.status === "OFFLINE")
);

const criticalAgents = computed(() =>
  dashboardStore.agents.filter((agent) => {
    return (
      Number(agent.cpuUsage ?? 0) >= 90 ||
      Number(agent.memoryUsage ?? 0) >= 90 ||
      Number(agent.diskUsage ?? 0) >= 90
    );
  })
);

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

// const connectionStatusLabel = computed(() => {
//   switch (dashboardStore.connectionStatus) {
//     case "connected":
//       return "WebSocket Connected";

//     case "connecting":
//       return "WebSocket Connecting";

//     case "error":
//       return "WebSocket Error";

//     case "disconnected":
//     default:
//       return "WebSocket Disconnected";
//   }
// });

const latestErrorLog = computed(() =>
  dashboardStore.logs
    .filter((log) => log.logLevel === "ERROR")
    .sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() -
        new Date(a.loggedAt).getTime()
    )[0] ?? null
);

const serviceStatusSummary = computed(() => {
  const services = dashboardStore.agents.flatMap((agent) => [
    agent.databaseStatus ?? "UNKNOWN",
    agent.ftpStatus ?? "UNKNOWN",
    agent.applicationStatus ?? "UNKNOWN",
  ]);

  return {
    up: services.filter((status) => status === "UP").length,
    down: services.filter((status) => status === "DOWN").length,
    unknown: services.filter((status) => status === "UNKNOWN").length,
  };
});

const dashboardHealthScore = computed(() => {
  const total = dashboardStore.summary.totalAgents;

  if (total === 0) {
    return 100;
  }

  const onlinePenalty =
    (dashboardStore.summary.offlineAgents / total) * 40;

  const criticalPenalty = criticalAgents.value.length * 15;

  const errorPenalty = errorAgents.value.length * 10;

  const score = 100 - onlinePenalty - criticalPenalty - errorPenalty;

  return Math.max(0, Math.round(score));
});

let refreshTimer: number | undefined;

async function refreshDashboard() {
  await dashboardStore.loadDashboard();
  lastUpdatedAt.value = new Date().toLocaleString();
}

function goToHostDetail(agentCode: string) {
  router.push(`/host/${agentCode}`);
}

function changeTopN(value: number) {
  topN.value = value;
  localStorage.setItem("topN", String(value));
}

function clearSearch() {
  searchKeyword.value = "";
  localStorage.removeItem("dashboardSearchKeyword");
}

function exportReport() {
  const reportRows = [
    ["Monitoring Dashboard Report"],
    ["Generated At", new Date().toLocaleString()],
    [],
    ["Summary"],
    ["Total Agents", dashboardStore.summary.totalAgents],
    ["Online Agents", dashboardStore.summary.onlineAgents],
    ["Offline Agents", dashboardStore.summary.offlineAgents],
    ["Error Count", dashboardStore.summary.errorCount],
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
    ["Time", "Agent", "Host", "Level", "Source", "Message"],
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
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
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

  link.click();

  URL.revokeObjectURL(url);
}

watch(searchKeyword, (value) => {
  localStorage.setItem("dashboardSearchKeyword", value);
});

onMounted(() => {
  refreshDashboard();

  //dashboardStore.connectWebSocket();

  refreshTimer = window.setInterval(() => {
    refreshDashboard();
  }, autoRefreshSeconds.value * 1000);
});

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }

  dashboardStore.disconnectWebSocket();
});
</script>

<template>
  <div class="dashboard-page">
    <header class="page-header">
      <div>
        <div class="dashboard-title-row">
          <h1>中央監控儀表板</h1>

          <!-- <span :class="[
            'live-badge',
            dashboardStore.connectionStatus === 'connected'
              ? 'live'
              : 'offline',
          ]">
            {{
              dashboardStore.connectionStatus === "connected"
                ? "LIVE"
                : "OFFLINE"
            }}
          </span> -->
        </div>

        <p class="last-updated">
          最後更新: {{ lastUpdatedAt }}
        </p>

        <p class="auto-refresh">
          自動更新：開啟（{{ autoRefreshSeconds }} 秒）
        </p>
      </div>

      <div class="header-actions">
        <AlertCenter />
        <button class="theme-toggle-button" @click="themeStore.toggleTheme">
          {{ themeStore.mode === "dark" ? "淺色模式" : "深色模式" }}
        </button>
        <!-- <div :class="['connection-indicator', dashboardStore.connectionStatus]">
          <span class="connection-dot"></span>
          <span>{{ connectionStatusLabel }}</span>
        </div> -->
        <button class="export-button" :disabled="dashboardStore.loading" @click="exportReport">
          匯出報表
        </button>

        <button class="refresh-button" :disabled="dashboardStore.loading" @click="refreshDashboard">
          重新整理
        </button>
      </div>
    </header>

    <div v-if="dashboardStore.loading" class="status-message">
      正在載入儀表板...
    </div>

    <div v-else-if="dashboardStore.error" class="status-message error">
      {{ dashboardStore.error }}
    </div>

    <template v-else>
      <section class="summary-grid">
        <SummaryCard title="總主機數" :value="dashboardStore.summary.totalAgents" />

        <SummaryCard title="在線" :value="dashboardStore.summary.onlineAgents" />

        <SummaryCard title="離線" :value="dashboardStore.summary.offlineAgents" />

        <SummaryCard title="異常" :value="dashboardStore.summary.errorCount" />
      </section>

      <section class="service-status-grid">
        <div class="service-status-card up">
          <div class="service-status-title">服務正常</div>
          <div class="service-status-value">
            {{ serviceStatusSummary.up }}
          </div>
        </div>

        <div class="service-status-card down">
          <div class="service-status-title">服務異常</div>
          <div class="service-status-value">
            {{ serviceStatusSummary.down }}
          </div>
        </div>

        <div class="service-status-card unknown">
          <div class="service-status-title">服務未知</div>
          <div class="service-status-value">
            {{ serviceStatusSummary.unknown }}
          </div>
        </div>
      </section>

      <section class="noc-widgets-grid">
        <div class="health-score-card">
          <div>
            <h3>系統健康度</h3>
            <p>依據離線、高風險及異常主機計算</p>
          </div>

          <div class="health-score-result">
            <div :class="[
              'health-score-value',
              dashboardHealthScore >= 90
                ? 'health-good'
                : dashboardHealthScore >= 70
                  ? 'health-warning'
                  : 'health-critical',
            ]">
              {{ dashboardHealthScore }}
            </div>

            <div class="health-score-label">
              {{
                dashboardHealthScore >= 90
                  ? "健康"
                  : dashboardHealthScore >= 70
                    ? "警告"
                    : "危及"
              }}
            </div>
          </div>
        </div>

        <div class="offline-hosts-card">
          <div class="offline-hosts-header">
            <div>
              <h3>離線主機</h3>
              <p class="widget-hint">
                點擊主機查看詳細資訊
              </p>
            </div>

            <span>{{ offlineAgents.length }}</span>
          </div>

          <div v-if="offlineAgents.length === 0" class="offline-empty">
            目前沒有離線主機
          </div>

          <ul v-else class="offline-hosts-list">
            <li v-for="agent in offlineAgents" :key="agent.agentCode" @click="goToHostDetail(agent.agentCode)">
              <span class="offline-dot"></span>
              <span>{{ agent.hostName || agent.agentCode }}</span>
            </li>
          </ul>
        </div>

        <div class="critical-hosts-card">
          <div class="critical-hosts-header">
            <div>
              <h3>高風險主機</h3>
              <p class="widget-hint">
                CPU／Memory／Disk 使用率 ≥ 90%
              </p>
            </div>

            <span>{{ criticalAgents.length }}</span>
          </div>

          <div v-if="criticalAgents.length === 0" class="critical-empty">
            目前沒有高風險主機
          </div>

          <ul v-else class="critical-hosts-list">
            <li v-for="agent in criticalAgents" :key="agent.agentCode" @click="goToHostDetail(agent.agentCode)">
              <span>{{ agent.hostName || agent.agentCode }}</span>

              <span class="critical-values">
                CPU {{ agent.cpuUsage ?? 0 }}% /
                MEM {{ agent.memoryUsage ?? 0 }}% /
                DISK {{ agent.diskUsage ?? 0 }}%
              </span>
            </li>
          </ul>
        </div>

        <div class="error-hosts-card">
          <div class="error-hosts-header">
            <div>
              <h3>異常主機</h3>
              <p class="widget-hint">
                偵測到 ERROR 等級日誌
              </p>
            </div>

            <span>{{ errorAgents.length }}</span>
          </div>

          <div v-if="errorAgents.length === 0" class="error-empty">
            目前沒有異常主機
          </div>

          <ul v-else class="error-hosts-list">
            <li v-for="agent in errorAgents" :key="agent.agentCode" @click="goToHostDetail(agent.agentCode)">
              <span class="error-dot"></span>
              <span>{{ agent.hostName || agent.agentCode }}</span>
            </li>
          </ul>
        </div>

        <div class="latest-error-card">
          <div class="latest-error-header">
            <div>
              <h3>最新異常</h3>
              <p class="widget-hint">最近一筆錯誤（ERROR）日誌</p>
            </div>
          </div>

          <div v-if="!latestErrorLog" class="latest-error-empty">
            目前沒有 ERROR 日誌
          </div>

          <div v-else class="latest-error-body clickable-error" @click="goToHostDetail(latestErrorLog.agentCode)">
            <div class="latest-error-host">
              {{ latestErrorLog.hostName || latestErrorLog.agentCode }}
            </div>

            <div class="latest-error-message">
              {{ latestErrorLog.message }}
            </div>

            <div class="latest-error-time">
              {{ latestErrorLog.loggedAt }}
            </div>
          </div>
        </div>
      </section>

      <section class="top-chart-toolbar">
        <span>顯示數量：</span>

        <button :class="{ active: topN === 3 }" @click="changeTopN(3)">
          Top 3
        </button>

        <button :class="{ active: topN === 5 }" @click="changeTopN(5)">
          Top 5
        </button>

        <button :class="{ active: topN === 10 }" @click="changeTopN(10)">
          Top 10
        </button>

        <span v-if="searchKeyword.trim()" class="filter-hint">
          顯示 {{ filteredAgents.length }} 主機數
        </span>
      </section>

      <section class="top-charts-grid">
        <TopHostsBarChart :title="`CPU 使用率前 ${topN} 名`" :hosts="filteredAgents" metric-key="cpuUsage" :top-n="topN"
          empty-text="目前沒有 CPU 資料" />

        <TopHostsBarChart :title="`Memory 使用率前 ${topN} 名`" :hosts="filteredAgents" metric-key="memoryUsage"
          empty-text="目前沒有 Memory 資料" />

        <TopHostsBarChart :title="`Disk 使用率前 ${topN} 名`" :hosts="filteredAgents" metric-key="diskUsage" :top-n="topN"
          empty-text="目前沒有 Disk 資料" />
      </section>

      <section class="content-section">
        <div class="search-panel">
          <input v-model="searchKeyword" class="search-input" placeholder="依 Agent Code、主機名稱或主機狀態搜尋..."
            @keydown.enter="refreshDashboard" />

          <button v-if="searchKeyword.trim()" class="clear-search-button" @click="clearSearch">
            清除
          </button>
        </div>
      </section>

      <section class="content-section">
        <TopErrorHostsChart :logs="dashboardStore.logs" :top-n="topN" />
        <ErrorDistributionChart :logs="dashboardStore.logs" />
        <HostStatusDistributionChart :hosts="dashboardStore.agents" />
      </section>

      <section class="content-section">
        <div v-if="filteredAgents.length === 0 && searchKeyword.trim()" class="empty-filter-message">
          找不到符合搜尋條件的主機
        </div>

        <AgentStatusTable v-else :items="filteredAgents" @select-agent="goToHostDetail" />
      </section>

      <section class="content-section">
        <RecentLogsPanel :items="dashboardStore.logs" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  background: var(--page-bg);
  font-family: Arial, Helvetica, sans-serif;
  color: var(--text-main);
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dashboard-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.live-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.live-badge.live {
  background: #dcfce7;
  color: #16a34a;
}

.live-badge.offline {
  background: #fee2e2;
  color: #dc2626;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
}

.page-header p {
  margin-top: 8px;
  color: var(--text-muted);
}

.last-updated {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.auto-refresh {
  margin-top: 4px;
  color: #16a34a;
  font-size: 13px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.connection-indicator.connected {
  border-color: #bbf7d0;
  color: #16a34a;
}

.connection-indicator.connected .connection-dot {
  background: #16a34a;
}

.connection-indicator.connecting {
  border-color: #bfdbfe;
  color: #2563eb;
}

.connection-indicator.connecting .connection-dot {
  background: #2563eb;
}

.connection-indicator.error,
.connection-indicator.disconnected {
  border-color: #fecaca;
  color: #dc2626;
}

.connection-indicator.error .connection-dot,
.connection-indicator.disconnected .connection-dot {
  background: #dc2626;
}

.status-message {
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid var(--border-color);
}

.status-message.error {
  color: #dc2626;
}


.noc-widgets-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.service-status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.service-status-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
}

.service-status-title {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 8px;
}

.service-status-value {
  font-size: 28px;
  font-weight: 800;
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

.content-section {
  margin-bottom: 24px;
}

.theme-toggle-button,
.refresh-button,
.export-button {
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.refresh-button {
  background: #2563eb;
}

.theme-toggle-button {
  background: #475569;
}

.export-button {
  background: #16a34a;
}

.refresh-button:hover {
  background: #1d4ed8;
}

.export-button:hover {
  background: #15803d;
}

.refresh-button:disabled,
.export-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.health-score-card,
.offline-hosts-card,
.critical-hosts-card,
.error-hosts-card,
.latest-error-card {
  min-height: 150px;
  padding: 16px;
  border-radius: 12px;
  background: var(--panel-bg);
}

.offline-hosts-list,
.critical-hosts-list,
.error-hosts-list {
  max-height: 96px;
  overflow-y: auto;
}

.health-score-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border-color);
}

.health-score-card h3,
.offline-hosts-header h3,
.critical-hosts-header h3,
.error-hosts-header h3,
.latest-error-header h3 {
  margin: 0;
  color: var(--text-main);
}

.health-score-card p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.health-score-value {
  font-size: 42px;
  font-weight: 800;
}

.health-score-result {
  text-align: right;
}

.health-score-label {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}

.health-good {
  color: #16a34a;
}

.health-warning {
  color: #f59e0b;
}

.health-critical {
  color: #dc2626;
}

.offline-hosts-card {
  border: 1px solid var(--border-color);
}

.critical-hosts-card {
  border: 1px solid #fecaca;
}

.error-hosts-card {
  border: 1px solid #fed7aa;
}

.offline-hosts-header,
.critical-hosts-header,
.error-hosts-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.offline-hosts-header span,
.critical-hosts-header span {
  min-width: 34px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.error-hosts-header span {
  min-width: 34px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #ffedd5;
  color: #ea580c;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.offline-empty,
.critical-empty,
.error-empty,
.latest-error-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 14px;
}

.offline-hosts-list,
.critical-hosts-list,
.error-hosts-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.offline-hosts-list li,
.error-hosts-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  color: var(--text-main);
}

.critical-hosts-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  cursor: pointer;
  color: var(--text-main);
}

.offline-hosts-list li:hover,
.critical-hosts-list li:hover {
  color: #dc2626;
}

.error-hosts-list li:hover {
  color: #ea580c;
}

.offline-dot,
.error-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.offline-dot {
  background: #dc2626;
}

.error-dot {
  background: #ea580c;
}

.critical-values {
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
}

.top-chart-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--text-main);
}

.top-chart-toolbar button {
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

.top-chart-toolbar button.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.filter-hint {
  margin-left: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.top-charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.search-panel {
  display: flex;
  gap: 8px;
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--panel-bg);
  color: var(--text-main);
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
}

.clear-search-button {
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
  border-radius: 8px;
  padding: 0 12px;
  cursor: pointer;
}

.empty-filter-message {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .noc-widgets-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .top-charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {

  .summary-grid,
  .service-status-grid,
  .noc-widgets-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }
}

.widget-hint {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}


.latest-error-card {
  border: 1px solid #fecaca;
}

.latest-error-header {
  margin-bottom: 16px;
}

.latest-error-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.clickable-error {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable-error:hover {
  transform: translateY(-2px);
}

.latest-error-host {
  color: #dc2626;
  font-weight: 700;
}

.latest-error-message {
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.4;

  display: -webkit-box;

  line-clamp: 3;
  -webkit-line-clamp: 3;

  -webkit-box-orient: vertical;
  overflow: hidden;
}

.latest-error-time {
  color: var(--text-muted);
  font-size: 12px;
}
</style>
