<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useDashboardStore } from "../stores/dashboard";

const dashboardStore = useDashboardStore();

const logSearchKeyword = ref("");
const selectedLevel = ref("ALL");

const formatLogTime = (loggedAt: string) => {
  if (!loggedAt) return "-";

  const date = new Date(loggedAt);

  if (Number.isNaN(date.getTime())) {
    return loggedAt;
  }

  return date.toLocaleString();
};

/**
 * 支援搜尋：
 * 1. API 原始時間
 * 2. yyyy-MM-dd HH:mm:ss
 * 3. toLocaleString() 顯示格式
 */
const formatLogTimeForSearch = (loggedAt: string): string => {
  if (!loggedAt) return "";

  const date = new Date(loggedAt);

  if (Number.isNaN(date.getTime())) {
    return loggedAt.toLowerCase();
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  const fixedFormat = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  const displayFormat = date.toLocaleString();

  return [
    loggedAt,
    fixedFormat,
    displayFormat,
  ]
    .join(" ")
    .toLowerCase();
};

const filteredLogs = computed(() => {
  const keyword = logSearchKeyword.value.trim().toLowerCase();

  return dashboardStore.logs.filter((log) => {
    const matchesKeyword =
      !keyword ||
      formatLogTimeForSearch(log.loggedAt).includes(keyword) ||
      log.agentCode?.toLowerCase().includes(keyword) ||
      log.logLevel?.toLowerCase().includes(keyword) ||
      log.sourceType?.toLowerCase().includes(keyword) ||
      log.message?.toLowerCase().includes(keyword);

    const matchesLevel =
      selectedLevel.value === "ALL" ||
      log.logLevel === selectedLevel.value;

    return matchesKeyword && matchesLevel;
  });
});

const totalLogCount = computed(() => dashboardStore.logs.length);

const filteredLogCount = computed(() => filteredLogs.value.length);

const hasActiveLogFilters = computed(() => {
  return (
    logSearchKeyword.value.trim() !== "" ||
    selectedLevel.value !== "ALL"
  );
});

const resetLogFilters = () => {
  logSearchKeyword.value = "";
  selectedLevel.value = "ALL";
};

const getLogLevelClass = (level: string) => {
  return `log-level-badge log-level-${level.toLowerCase()}`;
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
    <h1>系統日誌</h1>

    <div class="logs-panel">
      <div class="log-toolbar">
        <input v-model="logSearchKeyword" type="text" class="log-search-input" placeholder="依時間、Agent、等級、來源或訊息搜尋日誌" />

        <select v-model="selectedLevel" class="log-level-filter">
          <option value="ALL">全部等級</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>

        <button v-if="hasActiveLogFilters" type="button" class="log-reset-button" @click="resetLogFilters">
          重設
        </button>
      </div>

      <div class="log-count-summary">
        顯示 {{ filteredLogCount }} 筆，共 {{ totalLogCount }} 筆日誌
      </div>

      <div v-if="filteredLogs.length === 0" class="logs-empty-state">
        找不到符合條件的日誌。
      </div>

      <table v-else class="logs-table">
        <thead>
          <tr>
            <th>時間</th>
            <th>Agent</th>
            <th>等級</th>
            <th>來源</th>
            <th>訊息</th>
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
              <span class="log-source-badge">
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

.log-row-warn {
  background: rgba(245, 158, 11, 0.08);
}

.log-row:hover {
  background: rgba(37, 99, 235, 0.08);
}

.log-level-badge,
.log-source-badge {
  display: inline;
  padding: 0;
  border-radius: 0;
  background: transparent;
  font-size: 15px;
  cursor: default;
}

.log-level-badge {
  font-weight: 600;
}

.log-level-info {
  color: #2563eb;
}

.log-level-warn {
  color: #b45309;
}

.log-level-error {
  color: #dc2626;
}

.log-source-badge {
  color: var(--text-muted);
  font-weight: 500;
}
</style>
