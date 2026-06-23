<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import SummaryCard from "../components/SummaryCard.vue";
import AgentStatusTable from "../components/AgentStatusTable.vue";
import RecentLogsPanel from "../components/RecentLogsPanel.vue";
import { useDashboardStore } from "../stores/dashboard";

const dashboardStore = useDashboardStore();
const router = useRouter();

const lastUpdatedAt = ref<string>("--");

const searchKeyword = ref("");

const autoRefreshSeconds = ref(
  Number(localStorage.getItem("autoRefreshSeconds") || 30)
);

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

let refreshTimer: number | undefined;

async function refreshDashboard() {
  await dashboardStore.loadDashboard();
  lastUpdatedAt.value = new Date().toLocaleString();
}

function goToHostDetail(agentCode: string) {
  router.push(`/host/${agentCode}`);
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

onMounted(() => {
  refreshDashboard();

  dashboardStore.connectWebSocket();

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
        <h1>中央監控儀表板</h1>

        <p class="last-updated">
          Last Updated: {{ lastUpdatedAt }}
        </p>

        <p class="auto-refresh">
          Auto Refresh: ON ({{ autoRefreshSeconds }}s)
        </p>
      </div>

      <div class="header-actions">
        <button class="export-button" :disabled="dashboardStore.loading" @click="exportReport">
          Export Report
        </button>

        <button class="refresh-button" :disabled="dashboardStore.loading" @click="refreshDashboard">
          Refresh Now
        </button>
      </div>
    </header>

    <div v-if="dashboardStore.loading" class="status-message">
      Loading dashboard data...
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

      <section class="content-section">
        <div class="search-panel">
          <input v-model="searchKeyword" class="search-input"
            placeholder="Search host by agent code, host name, or status..." />
        </div>
      </section>

      <section class="content-section">
        <AgentStatusTable :items="filteredAgents" @select-agent="goToHostDetail" />
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
  gap: 10px;
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.content-section {
  margin-bottom: 24px;
}

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

.search-panel {
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
</style>
