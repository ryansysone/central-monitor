<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from "vue";

import { fetchAgentOptions } from "../api/agentApi";
import { searchSystemLogs } from "../api/logApi";

import type { AgentOption } from "../types/agent";
import type { LogItem } from "../types/dashboard";

const loading = ref(true);
const error = ref("");

const logs = ref<LogItem[]>([]);
const agents = ref<AgentOption[]>([]);

/*
 * Agent 選項載入失敗時，
 * 不影響系統日誌本身的查詢。
 */
const agentOptionsError = ref(false);

/*
 * 畫面目前輸入的篩選條件。
 */
const selectedAgentId = ref<number | null>(null);
const keyword = ref("");
const selectedLevel = ref("ALL");
const selectedSource = ref("ALL");
const startDate = ref("");
const endDate = ref("");

/*
 * 真正已套用到後端查詢的條件。
 *
 * 使用者修改畫面上的條件時，
 * 不會立即影響目前查詢結果。
 *
 * 只有按下「查詢」後，
 * 才會把畫面條件複製到這裡。
 */
const appliedAgentId = ref<number | null>(null);
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
 * 避免較舊的 API response
 * 覆蓋較新的查詢結果。
 */
let latestRequestId = 0;

/*
 * 使用者目前是否有輸入任何篩選條件。
 */
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

/*
 * 目前顯示的資料是否來自篩選查詢。
 */
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

/*
 * 目前頁面起始資料筆數。
 *
 * 例如：
 * 第 1 頁 → 1
 * 第 2 頁 → 21
 */
const pageStart = computed(() => {
  if (
    totalElements.value === 0 ||
    logs.value.length === 0
  ) {
    return 0;
  }

  return (
    (currentPage.value - 1) *
    pageSize +
    1
  );
});

/*
 * 目前頁面結束資料筆數。
 */
const pageEnd = computed(() => {
  if (
    totalElements.value === 0 ||
    logs.value.length === 0
  ) {
    return 0;
  }

  return Math.min(
    pageStart.value +
    logs.value.length -
    1,
    totalElements.value
  );
});

/*
 * 日期時間統一格式：
 *
 * YYYY-MM-DD HH:mm:ss
 */
function formatLogTime(
  loggedAt: string
): string {
  if (!loggedAt) {
    return "-";
  }

  const date = new Date(loggedAt);

  if (Number.isNaN(date.getTime())) {
    return loggedAt;
  }

  return date
    .toLocaleString("sv-SE")
    .replace("T", " ");
}

/*
 * 日誌等級 CSS class。
 */
function getLogLevelClass(
  level: string
): string {
  return `log-level-badge log-level-${level.toLowerCase()}`;
}

/*
 * 日誌 Row CSS class。
 */
function getLogRowClass(
  level: string
): string {
  return `log-row log-row-${level.toLowerCase()}`;
}

/*
 * 載入 Agent 下拉選單。
 *
 * Agent 選項載入失敗時，
 * 系統日誌仍然可以正常顯示。
 */
async function loadAgents(): Promise<void> {
  agentOptionsError.value = false;

  try {
    agents.value =
      await fetchAgentOptions();
  } catch (err) {
    console.error(
      "Failed to load agent options",
      err
    );

    agents.value = [];
    agentOptionsError.value = true;
  }
}

/*
 * 呼叫後端系統日誌分頁查詢 API。
 *
 * Agent、關鍵字、日期、等級、來源、
 * 排序與分頁全部交由後端處理。
 */
async function loadLogs(): Promise<void> {
  const requestId = ++latestRequestId;

  loading.value = true;
  error.value = "";

  try {
    const result =
      await searchSystemLogs({
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

        /*
         * 前端第 1 頁
         * 對應後端第 0 頁。
         */
        page: currentPage.value - 1,

        size: pageSize,
      });

    /*
     * 如果已經有更新的 request，
     * 忽略這次較舊的 response。
     */
    if (requestId !== latestRequestId) {
      return;
    }

    logs.value =
      result.content ?? [];

    totalElements.value =
      result.totalElements ?? 0;

    totalPages.value = Math.max(
      1,
      result.totalPages ?? 0
    );

    hasNext.value =
      result.hasNext ?? false;

    hasPrevious.value =
      result.hasPrevious ?? false;
  } catch (err) {
    /*
     * 如果這次已經不是最新 request，
     * 不讓舊 request 的錯誤影響畫面。
     */
    if (requestId !== latestRequestId) {
      return;
    }

    console.error(
      "Failed to load system logs",
      err
    );

    error.value =
      "無法載入系統日誌";

    logs.value = [];

    totalElements.value = 0;
    totalPages.value = 1;

    hasNext.value = false;
    hasPrevious.value = false;
  } finally {
    /*
     * 只有最新 request
     * 可以關閉 loading。
     */
    if (requestId === latestRequestId) {
      loading.value = false;
    }
  }
}

/*
 * 套用目前畫面上的篩選條件，
 * 並重新從第 1 頁查詢。
 */
async function searchLogs(): Promise<void> {
  if (loading.value) {
    return;
  }

  appliedAgentId.value =
    selectedAgentId.value;

  appliedKeyword.value =
    keyword.value.trim();

  appliedLevel.value =
    selectedLevel.value;

  appliedSource.value =
    selectedSource.value;

  appliedStartDate.value =
    startDate.value;

  appliedEndDate.value =
    endDate.value;

  currentPage.value = 1;

  await loadLogs();
}

/*
 * 清除畫面條件與已套用條件，
 * 並重新查詢全部系統日誌。
 */
async function clearFilters(): Promise<void> {
  if (loading.value) {
    return;
  }

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

/*
 * 上一頁。
 */
async function goToPreviousPage(): Promise<void> {
  if (
    loading.value ||
    !hasPrevious.value ||
    currentPage.value <= 1
  ) {
    return;
  }

  currentPage.value--;

  await loadLogs();
}

/*
 * 下一頁。
 */
async function goToNextPage(): Promise<void> {
  if (
    loading.value ||
    !hasNext.value ||
    currentPage.value >= totalPages.value
  ) {
    return;
  }

  currentPage.value++;

  await loadLogs();
}

/*
 * 重新載入系統日誌。
 */
async function retryLoadLogs(): Promise<void> {
  await loadLogs();
}

onMounted(async () => {
  /*
   * Agent Options 與 Logs
   * 彼此沒有依賴關係，
   * 因此可以平行載入。
   */
  await Promise.all([
    loadAgents(),
    loadLogs(),
  ]);
});
</script>

<template>
  <div class="logs-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-main">
        <div class="header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none">
            <path
              d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z"
              stroke="currentColor" stroke-width="1.7" />

            <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </div>

        <div class="header-copy">
          <div class="title-row">
            <h1>
              系統日誌
            </h1>

            <span v-if="!loading && !error" class="log-count-badge">
              {{ totalElements }} 筆
            </span>
          </div>

          <p class="page-description">
            查看所有 Agent 的系統日誌與事件紀錄
          </p>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-skeleton" aria-label="正在載入系統日誌">
      <div class="skeleton-toolbar">
        <div class="skeleton skeleton-agent"></div>

        <div class="skeleton skeleton-search"></div>

        <div v-for="index in 4" :key="`filter-${index}`" class="skeleton skeleton-filter"></div>
      </div>

      <div class="skeleton-summary">
        <div class="skeleton skeleton-summary-text"></div>
      </div>

      <div class="skeleton-table">
        <div class="skeleton-table-header">
          <div v-for="index in 6" :key="`header-${index}`" class="skeleton skeleton-header-cell"></div>
        </div>

        <div v-for="row in 8" :key="`row-${row}`" class="skeleton-table-row">
          <div v-for="column in 6" :key="`row-${row}-column-${column}`" class="skeleton skeleton-table-cell"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state" role="alert">
      <span class="error-icon" aria-hidden="true">
        !
      </span>

      <div class="error-content">
        <strong>
          系統日誌載入失敗
        </strong>

        <p>
          {{ error }}
        </p>

        <button type="button" class="retry-btn" @click="retryLoadLogs">
          重新載入
        </button>
      </div>
    </div>

    <!-- Logs -->
    <section v-else class="logs-panel">
      <!-- Filters -->
      <div class="filter-section">
        <div class="filter-header">
          <div>
            <h2>
              日誌查詢
            </h2>

            <p>
              使用 Agent、關鍵字、日期、等級與來源篩選系統日誌
            </p>
          </div>

          <span v-if="hasAppliedFilters" class="filter-active-badge">
            已套用篩選
          </span>
        </div>

        <!-- Agent Options Warning -->
        <div v-if="agentOptionsError" class="agent-options-warning" role="status">
          <span aria-hidden="true">
            !
          </span>

          <span>
            Agent 清單載入失敗，目前仍可使用其他條件查詢系統日誌。
          </span>

          <button type="button" @click="loadAgents">
            重新載入
          </button>
        </div>

        <div class="log-toolbar">
          <!-- Agent -->
          <div class="select-field agent-field">
            <label for="system-log-agent">
              Agent
            </label>

            <select id="system-log-agent" v-model="selectedAgentId" class="log-filter-select"
              :disabled="agentOptionsError">
              <option :value="null">
                全部 Agent
              </option>

              <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                {{ agent.agentCode }}
                ·
                {{ agent.hostName }}
              </option>
            </select>
          </div>

          <!-- Keyword -->
          <div class="search-field">
            <label for="system-log-search">
              關鍵字
            </label>

            <div class="search-input-wrapper">
              <span class="search-icon" aria-hidden="true">
                ⌕
              </span>

              <input id="system-log-search" v-model="keyword" name="systemLogSearch" type="search"
                class="log-search-input" autocomplete="off" placeholder="搜尋日誌訊息..." @keyup.enter="searchLogs" />
            </div>
          </div>

          <!-- Start Date -->
          <div class="log-date-field">
            <label for="system-log-start-date">
              開始日期
            </label>

            <input id="system-log-start-date" v-model="startDate" type="date" class="log-date-input"
              :max="endDate || undefined" />
          </div>

          <!-- End Date -->
          <div class="log-date-field">
            <label for="system-log-end-date">
              結束日期
            </label>

            <input id="system-log-end-date" v-model="endDate" type="date" class="log-date-input"
              :min="startDate || undefined" />
          </div>

          <!-- Level -->
          <div class="select-field">
            <label for="system-log-level">
              等級
            </label>

            <select id="system-log-level" v-model="selectedLevel" class="log-filter-select">
              <option value="ALL">
                全部等級
              </option>

              <option value="INFO">
                INFO
              </option>

              <option value="WARN">
                WARNING
              </option>

              <option value="ERROR">
                ERROR
              </option>
            </select>
          </div>

          <!-- Source -->
          <div class="select-field">
            <label for="system-log-source">
              來源
            </label>

            <select id="system-log-source" v-model="selectedSource" class="log-filter-select">
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
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button type="button" class="search-filter-btn" :disabled="loading" @click="searchLogs">
              查詢
            </button>

            <button type="button" class="clear-filter-btn" :disabled="loading ||
              (
                !hasInputFilters &&
                !hasAppliedFilters
              )
              " @click="clearFilters">
              清除篩選
            </button>
          </div>
        </div>
      </div>

      <!-- Result Header -->
      <div class="result-header">
        <div>
          <h2>
            日誌紀錄
          </h2>

          <p v-if="totalElements > 0">
            顯示第
            {{ pageStart }}
            –
            {{ pageEnd }}
            筆，共
            {{ totalElements }}
            筆日誌
          </p>

          <p v-else>
            目前沒有可顯示的系統日誌
          </p>
        </div>

        <span v-if="totalElements > 0" class="record-count">
          本頁 {{ logs.length }} 筆
        </span>
      </div>

      <!-- Empty -->
      <div v-if="logs.length === 0" class="logs-empty-state">
        <div class="empty-state-icon" aria-hidden="true">
          ⌕
        </div>

        <template v-if="!hasAppliedFilters">
          <strong>
            目前沒有系統日誌
          </strong>

          <p>
            尚未收到任何 Agent 日誌，或目前沒有可顯示的紀錄。
          </p>
        </template>

        <template v-else>
          <strong>
            查無符合條件的日誌
          </strong>

          <p>
            請調整 Agent、關鍵字、等級、來源或日期篩選條件。
          </p>

          <button type="button" @click="clearFilters">
            清除篩選條件
          </button>
        </template>
      </div>

      <!-- Table -->
      <div v-else class="table-wrapper">
        <table class="logs-table">
          <thead>
            <tr>
              <th class="time-column">
                時間
              </th>

              <th class="agent-column">
                Agent
              </th>

              <th class="host-column">
                主機名稱
              </th>

              <th class="level-column">
                等級
              </th>

              <th class="source-column">
                來源
              </th>

              <th class="message-column">
                訊息
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="log in logs" :key="log.id" :class="getLogRowClass(
              log.logLevel
            )
              ">
              <td class="time-cell">
                {{
                  formatLogTime(
                    log.loggedAt
                  )
                }}
              </td>

              <td class="agent-cell">
                {{ log.agentCode }}
              </td>

              <td class="host-cell">
                {{ log.hostName || "-" }}
              </td>

              <td>
                <span :class="getLogLevelClass(
                  log.logLevel
                )
                  ">
                  {{ log.logLevel }}
                </span>
              </td>

              <td>
                <span class="log-source-badge">
                  {{ log.sourceType }}
                </span>
              </td>

              <td class="message-cell">
                {{ log.message }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalElements > 0" class="logs-pagination">
        <button type="button" class="pagination-btn" :disabled="loading ||
          !hasPrevious
          " @click="goToPreviousPage">
          <span aria-hidden="true">
            ←
          </span>

          上一頁
        </button>

        <div class="pagination-summary">
          <strong>
            第 {{ currentPage }} 頁
          </strong>

          <span>
            共 {{ totalPages }} 頁
          </span>
        </div>

        <button type="button" class="pagination-btn" :disabled="loading ||
          !hasNext
          " @click="goToNextPage">
          下一頁

          <span aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.logs-page {
  width: 100%;
  min-width: 0;
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

.log-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.page-description {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
}

/* =========================
   Logs Panel
   ========================= */

.logs-panel {
  min-width: 0;
}

/* =========================
   Filter Section
   ========================= */

.filter-section {
  margin-bottom: 22px;
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03);
}

.filter-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.filter-header h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.4;
}

.filter-header p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.filter-active-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 9px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.06);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

/* =========================
   Agent Options Warning
   ========================= */

.agent-options-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 9px;
  background: rgba(245, 158, 11, 0.06);
  color: #b45309;
  font-size: 13px;
  line-height: 1.5;
}

.agent-options-warning>span:first-child {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f59e0b;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.agent-options-warning>span:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.agent-options-warning button {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.agent-options-warning button:hover {
  text-decoration: underline;
}

/* =========================
   Toolbar
   ========================= */

.log-toolbar {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

/* =========================
   Fields
   ========================= */

.search-field,
.log-date-field,
.select-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-field>label,
.log-date-field label,
.select-field label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.agent-field {
  flex: 0 1 210px;
}

.search-field {
  flex: 1 1 250px;
  min-width: 220px;
}

.search-input-wrapper {
  position: relative;
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

.log-search-input,
.log-date-input,
.log-filter-select {
  min-height: 42px;
  box-sizing: border-box;
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

.log-search-input {
  width: 100%;
  padding: 0 14px 0 41px;
}

.log-search-input::placeholder {
  color: var(--text-muted);
}

.log-date-input,
.log-filter-select {
  padding: 0 11px;
}

.log-date-input {
  min-width: 145px;
}

.log-filter-select {
  min-width: 140px;
}

.agent-field .log-filter-select {
  width: 100%;
  min-width: 190px;
}

.log-search-input:focus,
.log-date-input:focus,
.log-filter-select:focus {
  border-color: var(--primary-color);
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

.log-filter-select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* =========================
   Filter Actions
   ========================= */

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-filter-btn,
.clear-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  box-sizing: border-box;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease,
    opacity 0.18s ease;
}

.search-filter-btn {
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
}

.search-filter-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.clear-filter-btn {
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
}

.clear-filter-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.search-filter-btn:disabled,
.clear-filter-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* =========================
   Result Header
   ========================= */

.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.result-header h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.4;
}

.result-header p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.record-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* =========================
   Table
   ========================= */

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03);
}

.logs-table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  table-layout: fixed;
  background: var(--panel-bg);
}

.logs-table th,
.logs-table td {
  box-sizing: border-box;
  padding: 14px 14px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
  vertical-align: middle;
}

.logs-table th {
  background: rgba(148, 163, 184, 0.07);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.logs-table tbody tr {
  transition: background-color 0.18s ease;
}

.logs-table tbody tr:last-child td {
  border-bottom: none;
}

.logs-table tbody tr:hover {
  background: rgba(37, 99, 235, 0.045);
}

.time-column {
  width: 180px;
}

.agent-column {
  width: 125px;
}

.host-column {
  width: 165px;
}

.level-column {
  width: 100px;
}

.source-column {
  width: 130px;
}

.message-column {
  width: auto;
}

.time-cell {
  color: var(--text-muted) !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.agent-cell {
  font-weight: 650;
  white-space: nowrap;
}

.host-cell {
  overflow: hidden;
  color: var(--text-muted) !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-cell {
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* =========================
   Log Level
   ========================= */

.log-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}

.log-level-badge::before {
  content: "";
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.log-level-info {
  color: #2563eb;
}

.log-level-info::before {
  background: #3b82f6;
}

.log-level-warn {
  color: #b45309;
}

.log-level-warn::before {
  background: #f59e0b;
}

.log-level-error {
  color: #dc2626;
}

.log-level-error::before {
  background: #ef4444;
}

/* =========================
   Log Source
   ========================= */

.log-source-badge {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

/* =========================
   Row States
   ========================= */

.log-row-error {
  background: rgba(220, 38, 38, 0.035);
}

.log-row-warn {
  background: rgba(245, 158, 11, 0.035);
}

.log-row-error:hover {
  background:
    rgba(220, 38, 38, 0.065) !important;
}

.log-row-warn:hover {
  background:
    rgba(245, 158, 11, 0.065) !important;
}

/* =========================
   Pagination
   ========================= */

.logs-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 20px;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  box-sizing: border-box;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    opacity 0.18s ease;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pagination-summary {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.pagination-summary strong {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

/* =========================
   Empty State
   ========================= */

.logs-empty-state {
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

.empty-state-icon {
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

.logs-empty-state strong {
  color: var(--text-main);
  font-size: 16px;
}

.logs-empty-state p {
  max-width: 460px;
  margin: 8px 0 17px;
  font-size: 13px;
  line-height: 1.6;
}

.logs-empty-state button {
  min-height: 36px;
  box-sizing: border-box;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--panel-bg);
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
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

.error-content {
  min-width: 0;
}

.error-content strong {
  display: block;
  font-size: 15px;
}

.error-content p {
  margin: 5px 0 12px;
  font-size: 13px;
  line-height: 1.5;
}

.retry-btn {
  min-height: 34px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #dc2626;
  border-radius: 8px;
  background: transparent;
  color: #dc2626;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.retry-btn:hover {
  background: #dc2626;
  color: #ffffff;
}

/* =========================
   Loading Skeleton
   ========================= */

.loading-skeleton {
  width: 100%;
  box-sizing: border-box;
  padding: 18px;
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
  animation:
    skeleton-loading 1.35s infinite;
}

.skeleton-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.skeleton-agent {
  width: 200px;
  height: 42px;
}

.skeleton-search {
  width: 260px;
  max-width: 100%;
  height: 42px;
}

.skeleton-filter {
  width: 135px;
  height: 42px;
}

.skeleton-summary {
  margin-bottom: 14px;
}

.skeleton-summary-text {
  width: 190px;
  height: 12px;
}

.skeleton-table {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 14px;
}

.skeleton-table-header,
.skeleton-table-row {
  display: grid;
  grid-template-columns:
    180px 125px 165px 100px 130px minmax(220px, 1fr);
  align-items: center;
  gap: 14px;
  min-width: 1000px;
  box-sizing: border-box;
  padding: 13px 14px;
}

.skeleton-table-header {
  background: rgba(148, 163, 184, 0.07);
}

.skeleton-table-row {
  border-top: 1px solid var(--border-color);
}

.skeleton-header-cell {
  width: 65%;
  height: 10px;
}

.skeleton-table-cell {
  width: 80%;
  height: 11px;
}

@keyframes skeleton-loading {
  100% {
    transform: translateX(100%);
  }
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 1100px) {
  .agent-field {
    flex: 1 1 210px;
  }

  .search-field {
    flex: 1 1 300px;
  }

  .log-date-field,
  .select-field {
    flex: 1 1 150px;
  }

  .log-date-input,
  .log-filter-select {
    width: 100%;
    min-width: 0;
  }

  .agent-field .log-filter-select {
    min-width: 0;
  }

  .filter-actions {
    flex: 1 1 100%;
  }
}

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
    font-size: 13px;
  }

  .filter-section {
    padding: 16px;
    border-radius: 14px;
  }

  .filter-header {
    align-items: flex-start;
  }

  .log-toolbar {
    flex-direction: column;
  }

  .agent-field,
  .search-field,
  .log-date-field,
  .select-field {
    width: 100%;
    min-width: 0;
    flex: none;
  }

  .filter-actions {
    width: 100%;
  }

  .search-filter-btn,
  .clear-filter-btn {
    flex: 1;
  }

  .result-header {
    align-items: flex-start;
  }

  .logs-pagination {
    gap: 10px;
  }

  .pagination-btn {
    flex: 1;
  }

  .pagination-summary {
    min-width: 86px;
  }

  .agent-options-warning {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .skeleton-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .skeleton-agent,
  .skeleton-search,
  .skeleton-filter {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .header-main {
    gap: 12px;
  }

  .header-icon {
    width: 42px;
    height: 42px;
  }

  .title-row {
    gap: 8px;
  }

  .title-row h1 {
    font-size: 20px;
  }

  .page-description {
    font-size: 13px;
  }

  .filter-header {
    flex-direction: column;
  }

  .filter-actions {
    flex-direction: column;
  }

  .search-filter-btn,
  .clear-filter-btn {
    width: 100%;
  }

  .logs-pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .pagination-summary {
    order: -1;
  }

  .agent-options-warning button {
    width: 100%;
    margin-left: 26px;
    text-align: left;
  }
}

/* =========================
   Accessibility
   ========================= */

@media (prefers-reduced-motion: reduce) {

  .log-search-input,
  .log-date-input,
  .log-filter-select,
  .search-filter-btn,
  .clear-filter-btn,
  .logs-table tbody tr,
  .pagination-btn {
    transition: none;
  }

  .skeleton::after {
    animation: none;
  }
}
</style>
