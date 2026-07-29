<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchAgentOptions } from "../api/agentApi";
import { searchSystemLogs } from "../api/logApi";

import type { AgentOption } from "../types/agent";
import type { LogItem } from "../types/dashboard";

const loading = ref(true);
const error = ref("");

const logs = ref<LogItem[]>([]);
const agents = ref<AgentOption[]>([]);

const selectedAgentId = ref<number | null>(null);
const keyword = ref("");
const selectedLevel = ref("ALL");
const selectedSource = ref("ALL");
const startDate = ref("");
const endDate = ref("");

const appliedAgentId = ref<number | null>(null);
const appliedKeyword = ref("");
const appliedLevel = ref("ALL");
const appliedSource = ref("ALL");
const appliedStartDate = ref("");
const appliedEndDate = ref("");

const currentPage = ref(1);
const pageSize = 20;

const totalElements = ref(0);
const totalPages = ref(1);

const hasNext = ref(false);
const hasPrevious = ref(false);

let latestRequestId = 0;

const hasInputFilters = computed(() => {
  return (
    selectedAgentId.value !== null ||
    keyword.value.trim() !== "" ||
    selectedLevel.value !== "ALL" ||
    selectedSource.value !== "ALL" ||
    startDate.value !== "" ||
    endDate.value !== ""
  );
});

const hasAppliedFilters = computed(() => {
  return (
    appliedAgentId.value !== null ||
    appliedKeyword.value !== "" ||
    appliedLevel.value !== "ALL" ||
    appliedSource.value !== "ALL" ||
    appliedStartDate.value !== "" ||
    appliedEndDate.value !== ""
  );
});

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

function getLogRowClass(level: string) {
  return `log-row log-row-${level.toLowerCase()}`;
}

async function loadAgents() {
  try {
    agents.value = await fetchAgentOptions();
  } catch (err) {
    console.error(err);
    agents.value = [];
  }
}

async function loadLogs() {
  const requestId = ++latestRequestId;

  loading.value = true;
  error.value = "";

  try {
    const result = await searchSystemLogs({
      agentId:
        appliedAgentId.value !== null
          ? appliedAgentId.value
          : undefined,

      keyword:
        appliedKeyword.value !== ""
          ? appliedKeyword.value
          : undefined,

      logLevel:
        appliedLevel.value !== "ALL"
          ? appliedLevel.value
          : undefined,

      sourceType:
        appliedSource.value !== "ALL"
          ? appliedSource.value
          : undefined,

      startDate:
        appliedStartDate.value !== ""
          ? appliedStartDate.value
          : undefined,

      endDate:
        appliedEndDate.value !== ""
          ? appliedEndDate.value
          : undefined,

      page: currentPage.value - 1,
      size: pageSize,
    });

    if (requestId !== latestRequestId) {
      return;
    }

    logs.value = result.content;
    totalElements.value = result.totalElements;
    totalPages.value = Math.max(result.totalPages, 1);
    hasNext.value = result.hasNext;
    hasPrevious.value = result.hasPrevious;
  } catch (err) {
    if (requestId !== latestRequestId) {
      return;
    }

    console.error(err);

    error.value = "無法載入系統日誌";

    logs.value = [];
    totalElements.value = 0;
    totalPages.value = 1;
    hasNext.value = false;
    hasPrevious.value = false;
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false;
    }
  }
}

async function searchLogs() {
  appliedAgentId.value = selectedAgentId.value;
  appliedKeyword.value = keyword.value.trim();
  appliedLevel.value = selectedLevel.value;
  appliedSource.value = selectedSource.value;
  appliedStartDate.value = startDate.value;
  appliedEndDate.value = endDate.value;

  currentPage.value = 1;

  await loadLogs();
}

async function clearFilters() {
  selectedAgentId.value = null;
  keyword.value = "";
  selectedLevel.value = "ALL";
  selectedSource.value = "ALL";
  startDate.value = "";
  endDate.value = "";

  appliedAgentId.value = null;
  appliedKeyword.value = "";
  appliedLevel.value = "ALL";
  appliedSource.value = "ALL";
  appliedStartDate.value = "";
  appliedEndDate.value = "";

  currentPage.value = 1;

  await loadLogs();
}

async function goToPreviousPage() {
  if (!hasPrevious.value) {
    return;
  }

  currentPage.value--;

  await loadLogs();
}

async function goToNextPage() {
  if (!hasNext.value) {
    return;
  }

  currentPage.value++;

  await loadLogs();
}

onMounted(async () => {
  await Promise.all([
    loadAgents(),
    loadLogs(),
  ]);
});
</script>

<template>
  <div class="logs-page">
    <h1>系統日誌</h1>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>系統日誌載入中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">!</div>

      <div class="error-content">
        <h2>系統日誌載入失敗</h2>
        <p>{{ error }}</p>

        <button type="button" class="retry-btn" @click="loadLogs">
          重新載入
        </button>
      </div>
    </div>

    <div v-else class="logs-panel">
      <div class="log-toolbar">
        <select v-model="selectedAgentId" class="log-filter-select">
          <option :value="null">
            全部 Agent
          </option>

          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.agentCode }} · {{ agent.hostName }}
          </option>
        </select>

        <input v-model="keyword" type="search" class="log-search-input" placeholder="搜尋日誌訊息"
          @keyup.enter="searchLogs" />

        <div class="log-date-field">
          <label for="system-log-start-date">
            開始日期
          </label>

          <input id="system-log-start-date" v-model="startDate" type="date" class="log-date-input"
            :max="endDate || undefined" />
        </div>

        <div class="log-date-field">
          <label for="system-log-end-date">
            結束日期
          </label>

          <input id="system-log-end-date" v-model="endDate" type="date" class="log-date-input"
            :min="startDate || undefined" />
        </div>

        <select v-model="selectedLevel" class="log-filter-select">
          <option value="ALL">
            全部等級
          </option>

          <option value="INFO">
            INFO
          </option>

          <option value="WARN">
            WARN
          </option>

          <option value="ERROR">
            ERROR
          </option>
        </select>

        <select v-model="selectedSource" class="log-filter-select">
          <option value="ALL">
            全部來源
          </option>

          <option value="SYSTEM">
            SYSTEM
          </option>

          <option value="APPLICATION">
            APPLICATION
          </option>

          <option value="DATABASE">
            DATABASE
          </option>

          <option value="FTP">
            FTP
          </option>

          <option value="SFTP">
            SFTP
          </option>

          <option value="SECURITY">
            SECURITY
          </option>
        </select>

        <button type="button" class="search-filter-btn" :disabled="loading" @click="searchLogs">
          查詢
        </button>

        <button type="button" class="clear-filter-btn" :disabled="loading ||
          (!hasInputFilters && !hasAppliedFilters)
          " @click="clearFilters">
          清除篩選
        </button>
      </div>

      <div class="log-count-summary">
        本頁顯示 {{ logs.length }} 筆，共 {{ totalElements }} 筆日誌
      </div>

      <div v-if="logs.length === 0" class="logs-empty-state">
        <template v-if="!hasAppliedFilters">
          <h2>目前沒有系統日誌</h2>

          <p>
            尚未收到任何 Agent 日誌，或目前沒有可顯示的紀錄。
          </p>
        </template>

        <template v-else>
          <h2>查無符合條件的日誌</h2>

          <p>
            請調整 Agent、關鍵字、等級、來源或日期條件。
          </p>
        </template>
      </div>

      <table v-else class="logs-table">
        <thead>
          <tr>
            <th>時間</th>
            <th>Agent</th>
            <th>主機名稱</th>
            <th>等級</th>
            <th>來源</th>
            <th>訊息</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="log in logs" :key="log.id" :class="getLogRowClass(log.logLevel)">
            <td>
              {{ formatLogTime(log.loggedAt) }}
            </td>

            <td>
              {{ log.agentCode }}
            </td>

            <td>
              {{ log.hostName || "-" }}
            </td>

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

            <td>
              {{ log.message }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalElements > 0" class="logs-pagination">
        <button type="button" class="pagination-btn" :disabled="!hasPrevious" @click="goToPreviousPage">
          上一頁
        </button>

        <span class="pagination-summary">
          第 {{ currentPage }} 頁，共 {{ totalPages }} 頁
        </span>

        <button type="button" class="pagination-btn" :disabled="!hasNext" @click="goToNextPage">
          下一頁
        </button>
      </div>
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
  padding: 20px;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
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
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 15px;
  background: var(--panel-bg);
  border: 1px dashed var(--border-color);
  border-radius: 10px;
}

.logs-empty-state h2 {
  margin: 0 0 8px;
  color: var(--text-main);
  font-size: 18px;
}

.logs-empty-state p {
  margin: 0;
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
  color: var(--text-main);
  font-size: 15px;
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

.loading-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;

  margin-top: 24px;

  border: 1px solid var(--border-color);
  border-radius: 12px;

  background: var(--panel-bg);
  color: var(--text-muted);
}

.loading-spinner {
  width: 32px;
  height: 32px;

  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);

  border-radius: 50%;

  animation: spin .8s linear infinite;
}

.loading-state p {
  margin: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;

  gap: 18px;

  min-height: 220px;

  margin-top: 24px;
  padding: 24px;

  border-radius: 12px;

  border: 1px solid rgba(220, 38, 38, .35);

  background: var(--panel-bg);
}

.error-icon {
  width: 42px;
  height: 42px;

  display: flex;
  justify-content: center;
  align-items: center;

  border-radius: 50%;

  background: #dc2626;
  color: white;

  font-size: 22px;
  font-weight: bold;
}

.error-content h2 {
  margin: 0 0 8px;
  color: #dc2626;
}

.error-content p {
  margin: 0 0 16px;
}

.retry-btn {
  cursor: pointer;

  padding: 8px 16px;

  border-radius: 8px;

  border: 1px solid #dc2626;

  background: transparent;

  color: #dc2626;
}

.retry-btn:hover {
  background: #dc2626;
  color: white;
}

.log-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;

  gap: 12px;

  margin-bottom: 18px;
}

.log-filter-select {
  min-width: 170px;

  padding: 10px 12px;

  border-radius: 8px;
  border: 1px solid var(--border-color);

  background: var(--panel-bg);

  color: var(--text-main);
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
  color: var(--text-muted);
  white-space: nowrap;
}

.log-date-input {
  padding: 10px 12px;

  border-radius: 8px;

  border: 1px solid var(--border-color);

  background: var(--panel-bg);

  color: var(--text-main);
}

.log-date-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.search-filter-btn,
.clear-filter-btn,
.pagination-btn {
  cursor: pointer;

  padding: 10px 16px;

  border-radius: 8px;

  font-size: 14px;
}

.search-filter-btn {
  border: none;

  background: var(--primary-color);

  color: white;
}

.search-filter-btn:hover:not(:disabled) {
  opacity: .9;
}

.clear-filter-btn,
.pagination-btn {
  border: 1px solid var(--border-color);

  background: transparent;

  color: var(--text-main);
}

.clear-filter-btn:hover:not(:disabled),
.pagination-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
}

.search-filter-btn:disabled,
.clear-filter-btn:disabled,
.pagination-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.logs-pagination {
  display: flex;
  justify-content: center;
  align-items: center;

  gap: 18px;

  margin-top: 24px;
}

.pagination-summary {
  color: var(--text-muted);
}
</style>
