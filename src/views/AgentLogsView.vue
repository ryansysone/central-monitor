<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { fetchAgentByCode } from "../api/agentApi";

import {
  searchAgentLogs,
} from "../api/logApi";

import type { AgentDetail } from "../types/agent";

import type {
  LogItem,
} from "../types/dashboard";


const route = useRoute();
const router = useRouter();

const agentCode = route.params.agentCode as string;

const loading = ref(true);
const error = ref("");

const agent = ref<AgentDetail | null>(null);

/*
 * logs 現在只保存後端回傳的「目前頁面」資料。
 */
const logs = ref<LogItem[]>([]);

const keyword = ref("");
const selectedLevel = ref("ALL");
const selectedSource = ref("ALL");
const startDate = ref("");
const endDate = ref("");

/*
 * 真正已套用到後端查詢的條件。
 *
 * 使用者修改畫面上的篩選條件時，
 * 不會立刻影響目前查詢結果。
 *
 * 只有按下「查詢」後，
 * 才會把畫面條件複製到這裡。
 */
const appliedKeyword = ref("");
const appliedLevel = ref("ALL");
const appliedSource = ref("ALL");
const appliedStartDate = ref("");
const appliedEndDate = ref("");

/*
 * 前端頁碼從 1 開始。
 * 後端頁碼從 0 開始。
 */
const currentPage = ref(1);
const pageSize = 20;

const totalElements = ref(0);
const totalPages = ref(1);
const hasNext = ref(false);
const hasPrevious = ref(false);

/*
 * 用來避免較舊的 API 回應覆蓋較新的結果。
 */
let latestRequestId = 0;

const hasInputFilters = computed(() => {
  return (
    keyword.value.trim() !== "" ||
    selectedLevel.value !== "ALL" ||
    selectedSource.value !== "ALL" ||
    startDate.value !== "" ||
    endDate.value !== ""
  );
});

const hasAppliedFilters = computed(() => {
  return (
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

/*
 * 呼叫後端分頁查詢 API。
 *
 * 篩選、排序、分頁全部由後端與資料庫處理。
 */
async function loadLogs() {
  if (!agent.value) {
    return;
  }

  const requestId = ++latestRequestId;

  loading.value = true;
  error.value = "";

  try {
    const result = await searchAgentLogs({
      agentId: agent.value.id,

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

      /*
       * 前端第 1 頁對應後端第 0 頁。
       */
      page: currentPage.value - 1,
      size: pageSize,
    });

    /*
     * 若已有更新的請求，就忽略這次舊回應。
     */
    if (requestId !== latestRequestId) {
      return;
    }

    logs.value = result.content ?? [];
    totalElements.value = result.totalElements ?? 0;
    totalPages.value = Math.max(1, result.totalPages ?? 0);
    hasNext.value = result.hasNext ?? false;
    hasPrevious.value = result.hasPrevious ?? false;
  } catch (err) {
    if (requestId !== latestRequestId) {
      return;
    }

    console.error("Failed to load agent logs", err);

    error.value = "無法載入此 Agent 的日誌";
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

/*
 * 初次進入頁面：
 *
 * 1. 透過 agentCode 查詢 Agent
 * 2. 取得 Agent ID
 * 3. 查詢第一頁 Log
 */
async function loadAgentLogs() {
  loading.value = true;
  error.value = "";

  try {
    agent.value = await fetchAgentByCode(agentCode);

    await loadLogs();
  } catch (err) {
    console.error("Failed to load agent logs", err);

    error.value = "無法載入此 Agent 的日誌";
    agent.value = null;
    logs.value = [];
    totalElements.value = 0;
    totalPages.value = 1;
    hasNext.value = false;
    hasPrevious.value = false;
    loading.value = false;
  }
}

/*
 * 套用目前畫面上的篩選條件並執行查詢。
 */
async function searchLogs() {
  if (loading.value) {
    return;
  }

  appliedKeyword.value = keyword.value.trim();
  appliedLevel.value = selectedLevel.value;
  appliedSource.value = selectedSource.value;
  appliedStartDate.value = startDate.value;
  appliedEndDate.value = endDate.value;

  currentPage.value = 1;

  await loadLogs();
}

/*
 * 清除畫面條件與已套用條件，
 * 並重新查詢全部日誌。
 */
async function clearFilters() {
  if (loading.value) {
    return;
  }

  keyword.value = "";
  selectedLevel.value = "ALL";
  selectedSource.value = "ALL";
  startDate.value = "";
  endDate.value = "";

  appliedKeyword.value = "";
  appliedLevel.value = "ALL";
  appliedSource.value = "ALL";
  appliedStartDate.value = "";
  appliedEndDate.value = "";

  currentPage.value = 1;

  await loadLogs();
}

async function goToPreviousPage() {
  if (!hasPrevious.value || currentPage.value <= 1) {
    return;
  }

  currentPage.value--;

  await loadLogs();
}

async function goToNextPage() {
  if (!hasNext.value || currentPage.value >= totalPages.value) {
    return;
  }

  currentPage.value++;

  await loadLogs();
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
        <input v-model="keyword" type="search" class="log-search-input" placeholder="搜尋日誌訊息"
          @keyup.enter="searchLogs" />

        <div class="log-date-field">
          <label for="start-date">開始日期</label>

          <input id="start-date" v-model="startDate" type="date" class="log-date-input" :max="endDate || undefined" />
        </div>

        <div class="log-date-field">
          <label for="end-date">結束日期</label>

          <input id="end-date" v-model="endDate" type="date" class="log-date-input" :min="startDate || undefined" />
        </div>

        <!-- 等級種類 -->
        <select v-model="selectedLevel" class="log-filter-select">
          <option value="ALL">全部等級</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARNING</option>
          <option value="ERROR">ERROR</option>
        </select>

        <!-- 來源種類 -->
        <select v-model="selectedSource" class="log-filter-select">
          <option value="ALL">全部來源</option>
          <option value="SYSTEM">SYSTEM</option>
          <option value="APPLICATION">APPLICATION</option>
          <option value="DATABASE">DATABASE</option>
          <option value="FTP">FTP</option>
          <option value="SFTP">SFTP</option>
          <option value="SECURITY">SECURITY</option>
        </select>

        <button type="button" class="search-filter-btn" :disabled="loading" @click="searchLogs">
          查詢
        </button>
        <button type="button" class="clear-filter-btn" :disabled="loading || (!hasInputFilters && !hasAppliedFilters)"
          @click="clearFilters">
          清除篩選
        </button>

      </div>


      <div class="log-count-summary">
        本頁顯示 {{ logs.length }} 筆，共 {{ totalElements }} 筆日誌
      </div>

      <div v-if="logs.length === 0" class="logs-empty-state">
        <div class="empty-state-icon">⌕</div>

        <template v-if="!hasAppliedFilters">
          <h2>目前沒有日誌紀錄</h2>

          <p>
            Agent {{ agentCode }} 尚未產生日誌，或目前沒有可顯示的紀錄。
          </p>
        </template>

        <template v-else>
          <h2>查無符合條件的日誌</h2>

          <p>
            請調整關鍵字、等級、來源或日期篩選條件。
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
          <tr v-for="log in logs" :key="log.id" :class="getLogRowClass(log.logLevel)">
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

.clear-filter-btn {
  cursor: pointer;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  font-size: 15px;
}

.clear-filter-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.clear-filter-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.clear-filter-btn:disabled:hover {
  border-color: var(--border-color);
  color: var(--text-main);
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

.logs-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.pagination-btn {
  cursor: pointer;
  padding: 8px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  font-size: 15px;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pagination-summary {
  color: var(--text-muted);
  font-size: 15px;
}

.search-filter-btn {
  cursor: pointer;
  padding: 10px 16px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  background: var(--primary-color);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
}

.search-filter-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.search-filter-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
