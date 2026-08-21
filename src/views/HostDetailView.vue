<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  fetchHostDetail,
  fetchMetricHistory,
  fetchServiceHistory,
} from "../api/dashboardApi";

import type {
  HostDetail,
  MetricHistory,
  ServiceHistory,
} from "../types/dashboard";

import CpuTrendChart from "../components/CpuTrendChart.vue";
import MemoryTrendChart from "../components/MemoryTrendChart.vue";
import DiskTrendChart from "../components/DiskTrendChart.vue";
import ServiceTrendChart from "../components/ServiceTrendChart.vue";

import UsageGaugeChart from "../components/charts/UsageGaugeChart.vue";
import ServiceAvailabilityChart from "../components/charts/ServiceAvailabilityChart.vue";
import ServiceTimelineChart from "../components/charts/ServiceTimelineChart.vue";

const route = useRoute();
const router = useRouter();

const agentCode = route.params.agentCode as string;

const loading = ref(false);
const refreshing = ref(false);
const initialized = ref(false);

const error = ref("");
const metricHistoryError = ref("");
const serviceHistoryError = ref("");

const host = ref<HostDetail | null>(null);

const metricHistory = ref<MetricHistory[]>([]);
const serviceHistory = ref<ServiceHistory[]>([]);

const lastUpdatedAt = ref<Date | null>(null);

const autoRefreshSeconds = ref(
  Number(
    localStorage.getItem(
      "autoRefreshSeconds"
    ) || 30
  )
);

let refreshTimer: number | undefined;

/*
 * 最近 20 筆效能指標。
 *
 * 前提：
 * API 回傳資料順序為最新 → 最舊。
 */
const recentMetricHistory = computed(() =>
  metricHistory.value.slice(0, 20)
);

/*
 * 最近 20 筆服務狀態。
 *
 * 前提：
 * API 回傳資料順序為最新 → 最舊。
 */
const recentServiceHistory = computed(() =>
  serviceHistory.value.slice(0, 20)
);

/*
 * 計算單一服務 Availability。
 *
 * UNKNOWN / null / undefined 不應被視為 DOWN，
 * 因此只使用 UP / DOWN 作為有效樣本。
 */
function calculateAvailability(
  statuses: Array<
    string | null | undefined
  >
): number {
  const validStatuses = statuses.filter(
    (status) =>
      status === "UP" ||
      status === "DOWN"
  );

  if (validStatuses.length === 0) {
    return 0;
  }

  const upCount = validStatuses.filter(
    (status) => status === "UP"
  ).length;

  return Number(
    (
      (upCount / validStatuses.length) *
      100
    ).toFixed(1)
  );
}

/*
 * Database / FTP / Application
 * 各自獨立計算 Availability。
 */
const serviceAvailability = computed(
  () => ({
    database: calculateAvailability(
      serviceHistory.value.map(
        (item) => item.databaseStatus
      )
    ),

    ftp: calculateAvailability(
      serviceHistory.value.map(
        (item) => item.ftpStatus
      )
    ),

    application: calculateAvailability(
      serviceHistory.value.map(
        (item) => item.applicationStatus
      )
    ),
  })
);

/*
 * 最後成功更新時間。
 */
const lastUpdated = computed(() => {
  return lastUpdatedAt.value
    ? lastUpdatedAt.value.toLocaleString(
      "zh-TW"
    )
    : "-";
});

/*
 * 日期時間格式。
 */
function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  return date
    .toLocaleString("sv-SE")
    .replace("T", " ");
}

/*
 * Host 狀態文字。
 */
function hostStatusLabel(
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
 * Host 狀態 CSS class。
 */
function hostStatusClass(
  status: string | null | undefined
): string {
  switch (status) {
    case "ONLINE":
      return "online";

    case "OFFLINE":
      return "offline";

    default:
      return "unknown";
  }
}

/*
 * Service 狀態 CSS class。
 */
function serviceStatusClass(
  status: string | null | undefined
): string {
  switch (status) {
    case "UP":
      return "service-up";

    case "DOWN":
      return "service-down";

    default:
      return "service-unknown";
  }
}

/*
 * Service 狀態文字。
 */
function serviceStatusLabel(
  status: string | null | undefined
): string {
  switch (status) {
    case "UP":
      return "正常";

    case "DOWN":
      return "異常";

    case "UNKNOWN":
    case null:
    case undefined:
    case "":
      return "未知";

    default:
      console.warn(
        `[Service Status] Unsupported status received: ${status}`
      );

      return "未知";
  }
}

/*
 * Metric 顯示格式。
 *
 * null / undefined 代表沒有資料，
 * 不應顯示成 0.0%。
 */
function formatMetric(
  value: number | null | undefined
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "--";
  }

  return `${value.toFixed(1)}%`;
}

/*
 * Metric 等級。
 *
 * < 75   Normal
 * >= 75  Warning
 * >= 90  Critical
 */
function getMetricLevel(
  value: number | null | undefined
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "metric-unknown";
  }

  if (value >= 90) {
    return "metric-critical";
  }

  if (value >= 75) {
    return "metric-warning";
  }

  return "";
}

/*
 * 載入 Host Detail。
 *
 * 初次載入：
 * loading skeleton
 *
 * 後續更新：
 * 保留畫面並顯示 refreshing
 */
async function loadHost(): Promise<void> {
  const isInitialLoad =
    !initialized.value;

  if (
    loading.value ||
    refreshing.value
  ) {
    return;
  }

  if (isInitialLoad) {
    loading.value = true;
  } else {
    refreshing.value = true;
  }

  error.value = "";
  metricHistoryError.value = "";
  serviceHistoryError.value = "";

  try {
    /*
     * Host Detail 為主要資料。
     * 若這裡失敗，進入 catch。
     */
    host.value =
      await fetchHostDetail(agentCode);

    /*
     * History 彼此獨立。
     *
     * 其中一個失敗時，
     * 不應影響另一個成功結果。
     */
    const [
      metricResult,
      serviceResult,
    ] = await Promise.allSettled([
      fetchMetricHistory(agentCode),
      fetchServiceHistory(agentCode),
    ]);

    /*
     * Metric History
     */
    if (
      metricResult.status ===
      "fulfilled"
    ) {
      metricHistory.value =
        metricResult.value;
    } else {
      console.error(
        "Metric history failed",
        metricResult.reason
      );

      metricHistoryError.value =
        "效能指標歷史資料更新失敗，目前顯示上一次成功取得的資料";

      if (isInitialLoad) {
        metricHistory.value = [];
      }
    }

    /*
     * Service History
     */
    if (
      serviceResult.status ===
      "fulfilled"
    ) {
      serviceHistory.value =
        serviceResult.value;
    } else {
      console.error(
        "Service history failed",
        serviceResult.reason
      );

      serviceHistoryError.value =
        "服務狀態歷史資料更新失敗，目前顯示上一次成功取得的資料";

      if (isInitialLoad) {
        serviceHistory.value = [];
      }
    }

    initialized.value = true;
    lastUpdatedAt.value = new Date();
  } catch (err) {
    console.error(
      "Host detail failed",
      err
    );

    error.value = initialized.value
      ? "主機資料更新失敗，目前顯示上一次成功取得的資料"
      : "無法載入主機詳細資訊";
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

/*
 * 返回主機列表。
 */
function goBack(): void {
  router.push("/hosts");
}

/*
 * 查看目前 Agent 的 Logs。
 */
function goToAgentLogs(): void {
  router.push({
    name: "agent-logs",

    params: {
      agentCode,
    },
  });
}

/*
 * 初始載入 + Auto Refresh。
 */
onMounted(() => {
  autoRefreshSeconds.value = Number(
    localStorage.getItem(
      "autoRefreshSeconds"
    ) || 30
  );

  void loadHost();

  refreshTimer = window.setInterval(
    () => {
      void loadHost();
    },
    autoRefreshSeconds.value * 1000
  );
});

/*
 * 清除 Timer。
 */
onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(
      refreshTimer
    );

    refreshTimer = undefined;
  }
});
</script>

<template>
  <div class="host-detail-page">
    <!-- Page Topbar -->
    <div class="page-topbar">
      <button class="back-btn" type="button" @click="goBack">
        <span class="back-icon" aria-hidden="true">
          ←
        </span>

        返回主機列表
      </button>

      <div class="refresh-summary">
        <span class="live-indicator">
          <span class="live-dot" aria-hidden="true"></span>

          自動更新
          {{ autoRefreshSeconds }}
          秒
        </span>

        <span class="refresh-divider" aria-hidden="true">
          ·
        </span>

        <span v-if="refreshing" class="refreshing-text">
          背景更新中...
        </span>

        <span v-else>
          最後更新：{{ lastUpdated }}
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-skeleton" aria-label="正在載入主機詳細資訊">
      <div class="skeleton-topbar">
        <div class="skeleton skeleton-back"></div>

        <div class="skeleton skeleton-update"></div>
      </div>

      <div class="skeleton-hero">
        <div class="skeleton skeleton-host-icon"></div>

        <div class="skeleton-host-info">
          <div class="skeleton skeleton-title"></div>

          <div class="skeleton skeleton-subtitle"></div>

          <div class="skeleton skeleton-description"></div>
        </div>
      </div>

      <div class="skeleton-card-grid">
        <div v-for="index in 3" :key="`gauge-${index}`" class="skeleton-card">
          <div class="skeleton skeleton-card-title"></div>

          <div class="skeleton skeleton-gauge"></div>
        </div>
      </div>

      <div class="skeleton-card-grid">
        <div v-for="index in 3" :key="`service-${index}`" class="
            skeleton-card
            skeleton-service-card
          ">
          <div class="skeleton skeleton-card-title"></div>

          <div class="skeleton skeleton-status"></div>

          <div class="skeleton skeleton-description"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Main Error -->
      <div v-if="error" class="error" role="alert">
        {{ error }}
      </div>

      <div v-if="host">
        <!-- Host Hero -->
        <section class="host-hero">
          <div class="host-identity">
            <div class="host-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                <path
                  d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-13C4.67 16 4 15.33 4 14.5v-9Z"
                  stroke="currentColor" stroke-width="1.7" />

                <path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </div>

            <div>
              <div class="host-title-row">
                <h1>
                  {{ host.agentCode }}
                </h1>

                <span :class="[
                  'status-badge',
                  hostStatusClass(
                    host.status
                  ),
                ]">
                  <span class="status-dot" aria-hidden="true"></span>

                  {{
                    hostStatusLabel(
                      host.status
                    )
                  }}
                </span>
              </div>

              <p class="host-name">
                {{
                  host.hostName ||
                  "未提供主機名稱"
                }}
              </p>

              <p class="host-description">
                主機效能、服務狀態與歷史監控資訊
              </p>
            </div>
          </div>

          <div class="host-actions">
            <button class="refresh-btn" type="button" :disabled="loading ||
              refreshing
              " @click="loadHost">
              <span class="button-icon" :class="{
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

            <button class="logs-btn" type="button" @click="goToAgentLogs">
              <span class="button-icon" aria-hidden="true">
                ≡
              </span>

              查看 Agent 日誌
            </button>
          </div>
        </section>

        <!-- Resource Gauges -->
        <div class="card-grid">
          <div class="
              detail-card
              gauge-card
            ">
            <div class="card-title">
              CPU 使用率
            </div>

            <UsageGaugeChart title="CPU" :value="host.cpuUsage" />
          </div>

          <div class="
              detail-card
              gauge-card
            ">
            <div class="card-title">
              Memory 使用率
            </div>

            <UsageGaugeChart title="Memory" :value="host.memoryUsage" />
          </div>

          <div class="
              detail-card
              gauge-card
            ">
            <div class="card-title">
              Disk 使用率
            </div>

            <UsageGaugeChart title="Disk" :value="host.diskUsage" />
          </div>
        </div>

        <!-- Service Status -->
        <div class="
            card-grid
            service-grid
          ">
          <!-- Database -->
          <div :class="[
            'detail-card',
            'service-card',
            serviceStatusClass(
              host.databaseStatus
            ),
          ]">
            <div class="service-card-header">
              <span class="service-code">
                DB
              </span>

              <div class="card-title">
                Database
              </div>
            </div>

            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(
                  host.databaseStatus
                ),
              ]">
                {{
                  serviceStatusLabel(
                    host.databaseStatus
                  )
                }}
              </span>
            </div>

            <p class="service-description">
              資料庫連線狀態
            </p>
          </div>

          <!-- FTP -->
          <div :class="[
            'detail-card',
            'service-card',
            serviceStatusClass(
              host.ftpStatus
            ),
          ]">
            <div class="service-card-header">
              <span class="service-code">
                FTP
              </span>

              <div class="card-title">
                FTP
              </div>
            </div>

            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(
                  host.ftpStatus
                ),
              ]">
                {{
                  serviceStatusLabel(
                    host.ftpStatus
                  )
                }}
              </span>
            </div>

            <p class="service-description">
              檔案傳輸服務狀態
            </p>
          </div>

          <!-- Application -->
          <div :class="[
            'detail-card',
            'service-card',
            serviceStatusClass(
              host.applicationStatus
            ),
          ]">
            <div class="service-card-header">
              <span class="service-code">
                APP
              </span>

              <div class="card-title">
                應用程式
              </div>
            </div>

            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(
                  host.applicationStatus
                ),
              ]">
                {{
                  serviceStatusLabel(
                    host.applicationStatus
                  )
                }}
              </span>
            </div>

            <p class="service-description">
              Agent 應用程式運行狀態
            </p>
          </div>
        </div>

        <!-- Metric Trend Charts -->
        <CpuTrendChart :history="recentMetricHistory" />

        <MemoryTrendChart :history="recentMetricHistory" />

        <DiskTrendChart :history="recentMetricHistory" />

        <!-- Service Charts -->
        <ServiceTrendChart :history="recentServiceHistory" />

        <ServiceTimelineChart :history="recentServiceHistory" />

        <ServiceAvailabilityChart :database="serviceAvailability.database
          " :ftp="serviceAvailability.ftp
            " :application="serviceAvailability.application
              " />

        <!-- Metric History -->
        <section class="history-section">
          <div class="section-header">
            <div>
              <h3>
                效能指標歷史紀錄
              </h3>

              <p>
                最近
                {{
                  recentMetricHistory.length
                }}
                筆效能監控資料
              </p>
            </div>

            <span class="record-count">
              {{
                recentMetricHistory.length
              }}
              筆
            </span>
          </div>

          <div v-if="metricHistoryError" class="section-error" role="alert">
            {{ metricHistoryError }}
          </div>

          <div class="table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>時間</th>

                  <th class="numeric-column">
                    CPU
                  </th>

                  <th class="numeric-column">
                    Memory
                  </th>

                  <th class="numeric-column">
                    Disk
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="
                  recentMetricHistory.length ===
                  0
                ">
                  <td colspan="4" class="empty-state">
                    目前沒有效能指標歷史資料
                  </td>
                </tr>

                <tr v-for="item in recentMetricHistory" :key="item.id ??
                  item.collectedAt
                  ">
                  <td class="time-cell">
                    {{
                      formatDateTime(
                        item.collectedAt
                      )
                    }}
                  </td>

                  <td class="numeric-column">
                    <span :class="[
                      'metric-value',
                      getMetricLevel(
                        item.cpuUsage
                      ),
                    ]">
                      {{
                        formatMetric(
                          item.cpuUsage
                        )
                      }}
                    </span>
                  </td>

                  <td class="numeric-column">
                    <span :class="[
                      'metric-value',
                      getMetricLevel(
                        item.memoryUsage
                      ),
                    ]">
                      {{
                        formatMetric(
                          item.memoryUsage
                        )
                      }}
                    </span>
                  </td>

                  <td class="numeric-column">
                    <span :class="[
                      'metric-value',
                      getMetricLevel(
                        item.diskUsage
                      ),
                    ]">
                      {{
                        formatMetric(
                          item.diskUsage
                        )
                      }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Service History -->
        <section class="history-section">
          <div class="section-header">
            <div>
              <h3>
                服務狀態歷史紀錄
              </h3>

              <p>
                最近
                {{
                  recentServiceHistory.length
                }}
                筆服務監控資料
              </p>
            </div>

            <span class="record-count">
              {{
                recentServiceHistory.length
              }}
              筆
            </span>
          </div>

          <div v-if="serviceHistoryError" class="section-error" role="alert">
            {{ serviceHistoryError }}
          </div>

          <div class="table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>Database</th>
                  <th>FTP</th>
                  <th>應用程式</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="
                  recentServiceHistory.length ===
                  0
                ">
                  <td colspan="4" class="empty-state">
                    目前沒有服務狀態歷史資料
                  </td>
                </tr>

                <tr v-for="item in recentServiceHistory" :key="item.id ??
                  item.collectedAt
                  ">
                  <td class="time-cell">
                    {{
                      formatDateTime(
                        item.collectedAt
                      )
                    }}
                  </td>

                  <td>
                    <span :class="[
                      'service-badge',
                      serviceStatusClass(
                        item.databaseStatus
                      ),
                    ]">
                      {{
                        serviceStatusLabel(
                          item.databaseStatus
                        )
                      }}
                    </span>
                  </td>

                  <td>
                    <span :class="[
                      'service-badge',
                      serviceStatusClass(
                        item.ftpStatus
                      ),
                    ]">
                      {{
                        serviceStatusLabel(
                          item.ftpStatus
                        )
                      }}
                    </span>
                  </td>

                  <td>
                    <span :class="[
                      'service-badge',
                      serviceStatusClass(
                        item.applicationStatus
                      ),
                    ]">
                      {{
                        serviceStatusLabel(
                          item.applicationStatus
                        )
                      }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.host-detail-page {
  width: 100%;
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
   Page Topbar
   ========================= */

.page-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.back-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateX(-2px);
}

.back-icon {
  font-size: 17px;
  line-height: 1;
}

.refresh-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-main);
  font-weight: 600;
}

.live-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #22c55e;
  box-shadow:
    0 0 0 4px rgba(34, 197, 94, 0.12);
}

.refresh-divider {
  color: var(--border-color);
}

.refreshing-text {
  color: var(--primary-color);
  font-weight: 600;
}

/* =========================
   Error
   ========================= */

.error {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
  line-height: 1.55;
}

/* =========================
   Host Hero
   ========================= */

.host-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
  padding: 22px 24px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 10px 30px rgba(15, 23, 42, 0.05);
}

.host-identity {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.host-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 15px;
  background: var(--panel-bg);
  color: var(--primary-color);
}

.host-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.host-title-row h1 {
  margin: 0;
  color: var(--text-main);
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.host-name {
  margin: 6px 0 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.45;
}

.host-description {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
}

/* =========================
   Host Status
   ========================= */

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  box-sizing: border-box;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}

.status-badge.online {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.status-badge.online .status-dot {
  background: #22c55e;
}

.status-badge.offline {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.status-badge.offline .status-dot {
  background: #ef4444;
}

.status-badge.unknown {
  border: 1px solid var(--border-color);
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
}

.status-badge.unknown .status-dot {
  background: #94a3b8;
}

/* =========================
   Host Actions
   ========================= */

.host-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.refresh-btn,
.logs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.refresh-btn {
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.logs-btn {
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
}

.logs-btn:hover {
  transform: translateY(-1px);
  opacity: 0.94;
}

.button-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
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

/* =========================
   Card Grid
   ========================= */

.card-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 20px;
  margin-bottom: 24px;
}

.detail-card {
  height: 100%;
  box-sizing: border-box;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.detail-card:hover {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow:
    0 2px 6px rgba(15, 23, 42, 0.05),
    0 12px 28px rgba(15, 23, 42, 0.07);
}

.detail-card::before {
  content: "";
  display: block;
  width: 48px;
  height: 4px;
  margin-bottom: 14px;
  border-radius: 999px;
  background: var(--primary-color);
  opacity: 0.9;
}

.card-title {
  margin-bottom: 12px;
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.card-value {
  color: var(--text-main);
  font-size: 26px;
  font-weight: 750;
}

.gauge-card {
  display: flex;
  flex-direction: column;
  min-height: 300px;
  padding-bottom: 14px;
}

/* =========================
   Service Cards
   ========================= */

.service-grid {
  margin-top: 8px;
  margin-bottom: 24px;
}

.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 160px;
  overflow: hidden;
  padding: 20px 20px 20px 24px;
}

.service-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.service-card-header .card-title {
  margin: 0;
}

.service-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 32px;
  box-sizing: border-box;
  padding: 0 9px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 750;
  letter-spacing: 0.04em;
}

.service-description {
  margin: auto 0 0;
  padding-top: 12px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.service-card::before {
  display: none;
}

.service-card::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: #94a3b8;
}

.service-card.service-up::after {
  background: #22c55e;
}

.service-card.service-down::after {
  background: #ef4444;
}

.service-card.service-unknown::after {
  background: #94a3b8;
}

/* =========================
   Service Badge
   ========================= */

.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 2px 0;
  background: transparent;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.4;
  white-space: nowrap;
}

.service-badge::before {
  content: "";
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}

.service-up {
  color: #15803d;
}

.service-up::before {
  background: #22c55e;
}

.service-down {
  color: #b91c1c;
}

.service-down::before {
  background: #ef4444;
}

.service-unknown {
  color: #64748b;
}

.service-unknown::before {
  background: #94a3b8;
}

/* =========================
   History Section
   ========================= */

.history-section {
  margin-top: 24px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.04);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.4;
}

.section-header p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.record-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  height: 30px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.section-error {
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
  line-height: 1.5;
}

/* =========================
   History Table
   ========================= */

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.history-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  background: var(--panel-bg);
}

.history-table th,
.history-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
  vertical-align: middle;
}

.history-table th {
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 750;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.history-table tbody tr {
  transition: background-color 0.18s ease;
}

.history-table tbody tr:hover {
  background: rgba(148, 163, 184, 0.07);
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.history-table .empty-state {
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

.time-cell {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.numeric-column {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

/* =========================
   Metric Values
   ========================= */

.metric-value {
  display: inline-block;
  min-width: 60px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 750;
  text-align: right;
}

.metric-value.metric-warning {
  color: #d97706;
}

.metric-value.metric-critical {
  color: #dc2626;
}

.metric-value.metric-unknown {
  color: var(--text-muted);
  font-weight: 600;
}

/* =========================
   Loading Skeleton
   ========================= */

.loading-skeleton {
  width: 100%;
}

.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.16);
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
  animation: skeleton-loading 1.4s infinite;
}

@keyframes skeleton-loading {
  100% {
    transform: translateX(100%);
  }
}

.skeleton-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.skeleton-back {
  width: 116px;
  height: 40px;
}

.skeleton-update {
  width: 260px;
  height: 20px;
}

.skeleton-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 22px 24px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--panel-bg);
}

.skeleton-host-icon {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 15px;
}

.skeleton-host-info {
  width: 100%;
  max-width: 360px;
}

.skeleton-title {
  width: 160px;
  height: 28px;
}

.skeleton-subtitle {
  width: 220px;
  height: 16px;
  margin-top: 10px;
}

.skeleton-description {
  width: 300px;
  max-width: 100%;
  height: 14px;
  margin-top: 9px;
}

.skeleton-card-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.skeleton-card {
  min-height: 300px;
  box-sizing: border-box;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
}

.skeleton-service-card {
  min-height: 160px;
}

.skeleton-card-title {
  width: 110px;
  height: 15px;
}

.skeleton-gauge {
  width: 170px;
  height: 170px;
  margin: 34px auto 0;
  border-radius: 50%;
}

.skeleton-status {
  width: 72px;
  height: 26px;
  margin-top: 24px;
}

.skeleton-card .skeleton-description {
  width: 150px;
  margin-top: 20px;
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 768px) {
  .page-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .refresh-summary {
    justify-content: flex-start;
    flex-wrap: wrap;
    font-size: 13px;
  }

  .host-hero {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px;
    border-radius: 14px;
  }

  .host-identity {
    align-items: flex-start;
  }

  .host-title-row h1 {
    font-size: 23px;
  }

  .host-name {
    font-size: 15px;
  }

  .host-description {
    font-size: 14px;
  }

  .host-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .refresh-btn,
  .logs-btn {
    flex: 1;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .history-section {
    padding: 16px;
    border-radius: 12px;
  }

  .section-header {
    gap: 12px;
  }

  .section-header h3 {
    font-size: 17px;
  }

  .section-header p {
    font-size: 13px;
  }

  .history-table th,
  .history-table td {
    padding: 12px 14px;
  }

  .skeleton-topbar,
  .skeleton-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .skeleton-update {
    width: 220px;
    max-width: 100%;
  }

  .skeleton-card-grid {
    grid-template-columns: 1fr;
  }
}

/* =========================
   Reduced Motion
   ========================= */

@media (prefers-reduced-motion: reduce) {

  .back-btn,
  .refresh-btn,
  .logs-btn,
  .detail-card,
  .history-table tbody tr {
    transition: none;
  }

  .spinning {
    animation: none;
  }

  .skeleton::after {
    animation: none;
  }
}
</style>
