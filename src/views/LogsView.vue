<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useDashboardStore } from "../stores/dashboard";

const dashboardStore = useDashboardStore();

const logSearchKeyword = ref("");
const selectedLevel = ref("ALL");

const filteredLogs = computed(() => {
  const keyword = logSearchKeyword.value.trim().toLowerCase();

  return dashboardStore.logs.filter((log) => {
    const matchesKeyword =
      !keyword ||
      log.loggedAt?.toLowerCase().includes(keyword) ||
      log.agentCode?.toLowerCase().includes(keyword) ||
      log.logLevel?.toLowerCase().includes(keyword) ||
      log.sourceType?.toLowerCase().includes(keyword) ||
      log.message?.toLowerCase().includes(keyword);

    const matchesLevel =
      selectedLevel.value === "ALL" || log.logLevel === selectedLevel.value;

    return matchesKeyword && matchesLevel;
  });
});

const totalLogCount = computed(() => dashboardStore.logs.length);
const filteredLogCount = computed(() => filteredLogs.value.length);

const hasActiveLogFilters = computed(() => {
  return logSearchKeyword.value.trim() !== "" || selectedLevel.value !== "ALL";
});

const resetLogFilters = () => {
  logSearchKeyword.value = "";
  selectedLevel.value = "ALL";
};

const formatLogTime = (loggedAt: string) => {
  if (!loggedAt) return "-";

  const date = new Date(loggedAt);

  if (Number.isNaN(date.getTime())) {
    return loggedAt;
  }

  return date.toLocaleString();
};

const getLogLevelClass = (level: string) => {
  return `log-level-badge log-level-${level.toLowerCase()}`;
};

const getLogSourceClass = (sourceType: string) => {
  return `log-source-badge log-source-${sourceType.toLowerCase()}`;
};

const getLogRowClass = (level: string) => {
  return `log-row log-row-${level.toLowerCase()}`;
};

onMounted(() => {
  dashboardStore.loadDashboard();
});
</script>

<template>
  <div class="logs-page">
    <h1>Logs</h1>

    <div class="logs-panel">
      <div class="log-toolbar">
        <input v-model="logSearchKeyword" type="text" class="log-search-input"
          placeholder="Search logs by time, agent, level, source, or message" />

        <select v-model="selectedLevel" class="log-level-filter">
          <option value="ALL">All Levels</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
        </select>

        <button v-if="hasActiveLogFilters" type="button" class="log-reset-button" @click="resetLogFilters">
          Reset
        </button>
      </div>

      <div class="log-count-summary">
        Showing {{ filteredLogCount }} of {{ totalLogCount }} logs
      </div>

      <div v-if="filteredLogs.length === 0" class="logs-empty-state">
        No logs found.
      </div>

      <table v-else class="logs-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Agent</th>
            <th>Level</th>
            <th>Source</th>
            <th>Message</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="log in filteredLogs" :key="log.id" :class="getLogRowClass(log.logLevel)">
            <td>{{ formatLogTime(log.loggedAt) }}</td>
            <td>{{ log.agentCode }}</td>
            <td>
              <span :class="getLogLevelClass(log.logLevel)">
                {{ log.logLevel }}
              </span>
            </td>
            <td>
              <span :class="getLogSourceClass(log.sourceType)">
                {{ log.sourceType }}
              </span>
            </td>
            <td>{{ log.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.logs-page {
  width: 100%;
  color: var(--text-main);
}

.logs-panel {
  margin-top: 24px;
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.log-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.log-search-input {
  width: 100%;
  max-width: 420px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 15px;
  background: var(--panel-bg);
  color: var(--text-main);
}

.log-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.log-level-filter {
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 15px;
  background: var(--panel-bg);
  color: var(--text-main);
}

.log-level-filter:focus {
  outline: none;
  border-color: var(--primary-color);
}

.log-reset-button {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 15px;
  cursor: pointer;
}

.log-reset-button:hover {
  border-color: var(--primary-color);
}

.log-count-summary {
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 15px;
}

.logs-empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 15px;
  background: var(--panel-bg);
  border: 1px dashed var(--border-color);
  border-radius: 10px;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th,
.logs-table td {
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  font-size: 15px;
  color: var(--text-main);
}

.logs-table th {
  color: var(--text-muted);
}

.log-row-error {
  background: rgba(220, 38, 38, 0.08);
}

.log-row-warning {
  background: rgba(245, 158, 11, 0.08);
}

.log-row:hover {
  background: rgba(37, 99, 235, 0.08);
}

.log-level-badge,
.log-source-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
}

.log-level-info {
  color: #2563eb;
  background: #dbeafe;
}

.log-level-warning {
  color: #b45309;
  background: #fef3c7;
}

.log-level-error {
  color: #dc2626;
  background: #fee2e2;
}

.log-source-system {
  color: #334155;
  background: #e2e8f0;
}

.log-source-agent {
  color: #047857;
  background: #d1fae5;
}

.log-source-service {
  color: #7c3aed;
  background: #ede9fe;
}

.log-source-application {
  color: #c2410c;
  background: #ffedd5;
}
</style>
