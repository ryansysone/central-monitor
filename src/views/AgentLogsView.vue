<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  fetchAgentByCode,
  fetchLogsByAgentId,
} from "../api/dashboardApi";

import type {
  AgentDetail,
  LogItem,
} from "../types/dashboard";

const route = useRoute();
const router = useRouter();

const agentCode = route.params.agentCode as string;

const loading = ref(true);
const error = ref("");
const agent = ref<AgentDetail | null>(null);
const logs = ref<LogItem[]>([]);
const keyword = ref("");
const selectedLevel = ref("ALL");
const selectedSource = ref("ALL");
const startDate = ref("");
const endDate = ref("");

function formatLogTime(loggedAt: string) {
  if (!loggedAt) {
    return "-";
  }

  const date = new Date(loggedAt);

  if (Number.isNaN(date.getTime())) {
    return loggedAt;
  }

  return date.toLocaleString();
}

function getLogLevelClass(level: string) {
  return `log-level-badge log-level-${level.toLowerCase()}`;
}

function getLogSourceClass(sourceType: string) {
  return `log-source-badge log-source-${sourceType.toLowerCase()}`;
}

function getLogRowClass(level: string) {
  return `log-row log-row-${level.toLowerCase()}`;
}

const filteredLogs = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();

  return logs.value.filter((log) => {
    const matchesKeyword =
      !normalizedKeyword ||
      (log.message ?? "").toLowerCase().includes(normalizedKeyword);

    const matchesLevel =
      selectedLevel.value === "ALL" ||
      log.logLevel?.toUpperCase() === selectedLevel.value;

    const matchesSource =
      selectedSource.value === "ALL" ||
      log.sourceType?.toUpperCase() === selectedSource.value;

    const loggedDate = new Date(log.loggedAt);

    const matchesStartDate =
      !startDate.value ||
      (!Number.isNaN(loggedDate.getTime()) &&
        loggedDate >= new Date(`${startDate.value}T00:00:00`));

    const matchesEndDate =
      !endDate.value ||
      (!Number.isNaN(loggedDate.getTime()) &&
        loggedDate <= new Date(`${endDate.value}T23:59:59.999`));

    return (
      matchesKeyword &&
      matchesLevel &&
      matchesSource &&
      matchesStartDate &&
      matchesEndDate
    );
  });
});

async function loadAgentLogs() {
  loading.value = true;
  error.value = "";

  try {
    agent.value = await fetchAgentByCode(agentCode);

    const agentLogs = await fetchLogsByAgentId(agent.value.id);

    logs.value = [...agentLogs].sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() -
        new Date(a.loggedAt).getTime(),
    );
  } catch (err) {
    console.error("Failed to load agent logs", err);
    error.value = "無法載入此 Agent 的日誌";
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push({
    name: "host-detail",
    params: {
      agentCode,
    },
  });
}

onMounted(() => {
  loadAgentLogs();
});
</script>

<template>
  <div class="agent-logs-page">
    <button class="back-btn" @click="goBack">
      ← 返回主機詳細資訊
    </button>

    <div class="page-header">
      <div>
        <h1>{{ agentCode }} 日誌</h1>

        <p v-if="agent">
          {{ agent.hostName }} · 僅顯示此 Agent 的日誌紀錄
        </p>

        <p v-else>
          僅顯示 Agent {{ agentCode }} 的日誌紀錄
        </p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>日誌載入中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">!</div>

      <div class="error-content">
        <h2>日誌載入失敗</h2>
        <p>{{ error }}</p>

        <button class="retry-btn" @click="loadAgentLogs">
          重新載入
        </button>
      </div>
    </div>

    <div v-else class="logs-panel">
      <div class="logs-toolbar">
        <input v-model="keyword" type="search" class="log-search-input" placeholder="搜尋日誌訊息" />

        <div class="log-date-field">
          <label for="start-date">開始日期</label>

          <input id="start-date" v-model="startDate" type="date" class="log-date-input" />
        </div>

        <div class="log-date-field">
          <label for="end-date">結束日期</label>

          <input id="end-date" v-model="endDate" type="date" class="log-date-input" />
        </div>

        <select v-model="selectedLevel" class="log-filter-select">
          <option value="ALL">全部等級</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
        </select>

        <select v-model="selectedSource" class="log-filter-select">
          <option value="ALL">全部來源</option>
          <option value="SYSTEM">SYSTEM</option>
          <option value="AGENT">AGENT</option>
          <option value="SERVICE">SERVICE</option>
          <option value="APPLICATION">APPLICATION</option>
        </select>


      </div>
      <div class="log-count-summary">
        顯示 {{ filteredLogs.length }} 筆，共 {{ logs.length }} 筆日誌
      </div>

      <div v-if="filteredLogs.length === 0" class="logs-empty-state">
        <div class="empty-state-icon">⌕</div>

        <template v-if="logs.length === 0">
          <h2>目前沒有日誌紀錄</h2>

          <p>
            Agent {{ agentCode }} 尚未產生日誌，或目前沒有可顯示的紀錄。
          </p>
        </template>

        <template v-else>
          <h2>查無符合條件的日誌</h2>

          <p>
            請調整關鍵字、等級或來源篩選條件。
          </p>
        </template>
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
.agent-logs-page {
  width: 100%;
  color: var(--text-main);
}

.back-btn {
  margin-bottom: 16px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
  border-radius: 8px;
  padding: 8px 12px;
}

.back-btn:hover {
  border-color: var(--primary-color);
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
}

.page-header p {
  margin-top: 8px;
  color: var(--text-muted);
}

.loading-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-muted);
}

.loading-state p {
  margin: 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding: 24px;
  background: var(--panel-bg);
  border: 1px solid rgba(220, 38, 38, 0.35);
  border-radius: 12px;
}

.error-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  color: #ffffff;
  background: #dc2626;
  font-size: 22px;
  font-weight: 700;
}

.error-content h2 {
  margin: 0 0 8px;
  color: #dc2626;
  font-size: 18px;
}

.error-content p {
  margin: 0 0 16px;
  color: var(--text-muted);
}

.retry-btn {
  cursor: pointer;
  border: 1px solid #dc2626;
  background: transparent;
  color: #dc2626;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
}

.retry-btn:hover {
  color: #ffffff;
  background: #dc2626;
}

.logs-panel {
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.logs-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.log-filter-select {
  min-width: 150px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 15px;
}

.log-filter-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.log-date-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-date-field label {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 15px;
}

.log-date-input {
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 15px;
}

.log-date-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.log-search-input {
  width: 100%;
  max-width: 420px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 15px;
}

.log-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.log-count-summary {
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 15px;
}

.logs-empty-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  border: 1px dashed var(--border-color);
  border-radius: 10px;
}

.empty-state-icon {
  margin-bottom: 12px;
  font-size: 36px;
  line-height: 1;
  color: var(--text-muted);
}

.logs-empty-state h2 {
  margin: 0 0 8px;
  color: var(--text-main);
  font-size: 18px;
}

.logs-empty-state p {
  margin: 0;
  max-width: 420px;
  line-height: 1.6;
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
