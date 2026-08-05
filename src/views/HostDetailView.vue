<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
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
  Number(localStorage.getItem("autoRefreshSeconds") || 30)
);

let refreshTimer: number | undefined;

const recentMetricHistory = computed(() => metricHistory.value.slice(0, 20));
const recentServiceHistory = computed(() => serviceHistory.value.slice(0, 20));

const serviceAvailability = computed(() => {
  if (serviceHistory.value.length === 0) {
    return {
      database: 0,
      ftp: 0,
      application: 0,
    };
  }

  const total = serviceHistory.value.length;

  const databaseUp = serviceHistory.value.filter(
    (item) => item.databaseStatus === "UP"
  ).length;

  const ftpUp = serviceHistory.value.filter(
    (item) => item.ftpStatus === "UP"
  ).length;

  const applicationUp = serviceHistory.value.filter(
    (item) => item.applicationStatus === "UP"
  ).length;

  return {
    database: Number(((databaseUp / total) * 100).toFixed(1)),
    ftp: Number(((ftpUp / total) * 100).toFixed(1)),
    application: Number(((applicationUp / total) * 100).toFixed(1)),
  };
});

const lastUpdated = computed(() => {
  return lastUpdatedAt.value
    ? lastUpdatedAt.value.toLocaleString("zh-TW")
    : "-";
});

function formatDateTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString("sv-SE").replace("T", " ");
}
function serviceStatusClass(
  status: string | null | undefined
): string {
  switch (status) {
    case "UP":
      return "service-up";

    case "DOWN":
      return "service-down";

    case "UNKNOWN":
    case null:
    case undefined:
    case "":
      return "service-unknown";

    default:
      return "service-unknown";
  }
}

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

function hostStatusLabel(status: string) {
  switch (status) {
    case "ONLINE":
      return "正常";

    case "OFFLINE":
      return "異常";

    default:
      return "未知";
  }
}

async function loadHost() {
  const isInitialLoad = !initialized.value;

  if (loading.value || refreshing.value) {
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
    host.value = await fetchHostDetail(agentCode);

    const [metricResult, serviceResult] = await Promise.allSettled([
      fetchMetricHistory(agentCode),
      fetchServiceHistory(agentCode),
    ]);

    if (metricResult.status === "fulfilled") {
      metricHistory.value = metricResult.value;
    } else {
      console.error("Metric history failed", metricResult.reason);

      metricHistoryError.value =
        "效能指標歷史資料更新失敗，目前顯示上一次成功取得的資料";

      if (isInitialLoad) {
        metricHistory.value = [];
      }
    }

    if (serviceResult.status === "fulfilled") {
      serviceHistory.value = serviceResult.value;
    } else {
      console.error("Service history failed", serviceResult.reason);

      serviceHistoryError.value =
        "服務狀態歷史資料更新失敗，目前顯示上一次成功取得的資料";

      if (isInitialLoad) {
        serviceHistory.value = [];
      }
    }

    initialized.value = true;
    lastUpdatedAt.value = new Date();

  } catch (err) {
    console.error("Host detail failed", err);

    error.value = initialized.value
      ? "主機資料更新失敗，目前顯示上一次成功取得的資料"
      : "無法載入主機詳細資訊";
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function goBack() {
  router.push("/");
}

function goToAgentLogs() {
  router.push({
    name: "agent-logs",
    params: {
      agentCode,
    },
  });
}

onMounted(() => {
  autoRefreshSeconds.value = Number(
    localStorage.getItem("autoRefreshSeconds") || 30
  );

  loadHost();

  refreshTimer = window.setInterval(() => {
    loadHost();
  }, autoRefreshSeconds.value * 1000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="host-detail-page">
    <div class="page-topbar">
      <button class="back-btn" @click="goBack">
        <span class="back-icon">←</span>
        返回主控台
      </button>

      <div class="refresh-summary">
        <span class="live-indicator">
          <span class="live-dot"></span>
          自動更新 {{ autoRefreshSeconds }} 秒
        </span>

        <span class="refresh-divider">·</span>

        <span v-if="refreshing" class="refreshing-text">
          背景更新中...
        </span>

        <span v-else>
          最後更新：{{ lastUpdated }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="loading-skeleton">
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
        <div v-for="index in 3" :key="`service-${index}`" class="skeleton-card skeleton-service-card">
          <div class="skeleton skeleton-card-title"></div>
          <div class="skeleton skeleton-status"></div>
          <div class="skeleton skeleton-description"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="error" class="error">
        {{ error }}
      </div>

      <div v-if="host">
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
                <h1>{{ host.agentCode }}</h1>

                <span :class="[
                  'status-badge',
                  host.status.toLowerCase(),
                ]">
                  <span class="status-dot"></span>
                  {{ hostStatusLabel(host.status) }}
                </span>
              </div>

              <p class="host-name">
                {{ host.hostName }}
              </p>

              <p class="host-description">
                主機效能、服務狀態與歷史監控資訊
              </p>
            </div>
          </div>

          <div class="host-actions">
            <button class="refresh-btn" :disabled="loading || refreshing" @click="loadHost">
              <span class="button-icon" :class="{ spinning: refreshing }" aria-hidden="true">
                ↻
              </span>

              {{ refreshing ? "更新中..." : "重新整理" }}
            </button>

            <button class="logs-btn" @click="goToAgentLogs">
              <span class="button-icon" aria-hidden="true">
                ≡
              </span>

              查看 Agent 日誌
            </button>
          </div>
        </section>

        <div class="card-grid">
          <div class="detail-card gauge-card">
            <div class="card-title">CPU 使用率</div>

            <UsageGaugeChart title="CPU" :value="host.cpuUsage" />
          </div>

          <div class="detail-card gauge-card">
            <div class="card-title">Memory 使用率</div>

            <UsageGaugeChart title="Memory" :value="host.memoryUsage" />
          </div>

          <div class="detail-card gauge-card">
            <div class="card-title">Disk 使用率</div>

            <UsageGaugeChart title="Disk" :value="host.diskUsage" />
          </div>
        </div>

        <div class="card-grid service-grid">
          <!-- Database -->
          <div :class="[
            'detail-card',
            'service-card',
            serviceStatusClass(host.databaseStatus ?? 'UNKNOWN'),
          ]">
            <div class="service-card-header">
              <span class="service-code">DB</span>
              <div class="card-title">Database</div>
            </div>

            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(host.databaseStatus ?? 'UNKNOWN'),
              ]">
                {{ serviceStatusLabel(host.databaseStatus ?? "UNKNOWN") }}
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
            serviceStatusClass(host.ftpStatus ?? 'UNKNOWN'),
          ]">
            <div class="service-card-header">
              <span class="service-code">FTP</span>
              <div class="card-title">FTP</div>
            </div>

            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(host.ftpStatus ?? 'UNKNOWN'),
              ]">
                {{ serviceStatusLabel(host.ftpStatus ?? "UNKNOWN") }}
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
            serviceStatusClass(host.applicationStatus ?? 'UNKNOWN'),
          ]">
            <div class="service-card-header">
              <span class="service-code">APP</span>
              <div class="card-title">應用程式</div>
            </div>

            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(host.applicationStatus ?? 'UNKNOWN'),
              ]">
                {{ serviceStatusLabel(host.applicationStatus ?? "UNKNOWN") }}
              </span>
            </div>

            <p class="service-description">
              Agent 應用程式運行狀態
            </p>
          </div>
        </div>

        <CpuTrendChart :history="recentMetricHistory" />

        <MemoryTrendChart :history="recentMetricHistory" />

        <DiskTrendChart :history="recentMetricHistory" />

        <ServiceTrendChart :history="recentServiceHistory" />

        <ServiceTimelineChart :history="recentServiceHistory" />

        <ServiceAvailabilityChart :database="serviceAvailability.database" :ftp="serviceAvailability.ftp"
          :application="serviceAvailability.application" />

        <section class="history-section">
          <div class="section-header">
            <div>
              <h3>效能指標歷史紀錄</h3>

              <p>
                最近 {{ recentMetricHistory.length }}
                筆效能監控資料
              </p>
            </div>

            <span class="record-count">
              {{ recentMetricHistory.length }} 筆
            </span>
          </div>

          <div v-if="metricHistoryError" class="section-error">
            {{ metricHistoryError }}
          </div>

          <div class="table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th class="numeric-column">CPU</th>
                  <th class="numeric-column">Memory</th>
                  <th class="numeric-column">Disk</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="recentMetricHistory.length === 0">
                  <td colspan="4" class="empty-state">
                    目前沒有效能指標歷史資料
                  </td>
                </tr>

                <tr v-for="item in recentMetricHistory" :key="item.id ?? item.collectedAt">
                  <td class="time-cell">
                    {{ formatDateTime(item.collectedAt) }}
                  </td>

                  <td class="numeric-column">
                    <span class="metric-value">
                      {{
                        item.cpuUsage?.toFixed(1) ??
                        "0.0"
                      }}%
                    </span>
                  </td>

                  <td class="numeric-column">
                    <span class="metric-value">
                      {{
                        item.memoryUsage?.toFixed(1) ??
                        "0.0"
                      }}%
                    </span>
                  </td>

                  <td class="numeric-column">
                    <span :class="[
                      'metric-value',
                      (item.diskUsage ?? 0) >= 80
                        ? 'metric-warning'
                        : '',
                    ]">
                      {{
                        item.diskUsage?.toFixed(1) ??
                        "0.0"
                      }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="history-section">
          <div class="section-header">
            <div>
              <h3>服務狀態歷史紀錄</h3>

              <p>
                最近 {{ recentServiceHistory.length }}
                筆服務監控資料
              </p>
            </div>

            <span class="record-count">
              {{ recentServiceHistory.length }} 筆
            </span>
          </div>

          <div v-if="serviceHistoryError" class="section-error">
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
                <tr v-if="recentServiceHistory.length === 0">
                  <td colspan="4" class="empty-state">
                    目前沒有服務狀態歷史資料
                  </td>
                </tr>

                <tr v-for="item in recentServiceHistory" :key="item.id ?? item.collectedAt">
                  <td class="time-cell">
                    {{ formatDateTime(item.collectedAt) }}
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
}

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
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--panel-bg);
  color: var(--text-main);
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
  font-size: 16px;
  line-height: 1;
}

.refresh-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
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
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
}

.refresh-divider {
  color: var(--border-color);
}

.refreshing-text {
  color: var(--primary-color);
  font-weight: 600;
}

.loading,
.error {
  margin-top: 16px;
}

.error {
  color: #dc2626;
}

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
  width: 52px;
  height: 52px;
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
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.host-name {
  margin: 5px 0 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
}

.host-description {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  box-sizing: border-box;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
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
  min-height: 38px;
  box-sizing: border-box;
  padding: 0 14px;
  border-radius: 10px;
  font-weight: 600;
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

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 20px;
  margin-bottom: 24px;
}

.service-grid {
  margin-top: 8px;
  margin-bottom: 24px;
}

.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 150px;
  padding: 18px 18px 18px 22px;
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
  min-width: 38px;
  height: 30px;
  padding: 0 8px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.service-description {
  margin: auto 0 0;
  padding-top: 12px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

/* Service Card 不顯示上方藍色短線 */
.service-card::before {
  display: none;
}

/* 左側狀態色條 */
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

.detail-card {
  height: 100%;
  box-sizing: border-box;
  padding: 18px;
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

  opacity: .9;
}

.card-title {
  color: var(--text-muted);

  font-size: 13px;

  font-weight: 600;

  letter-spacing: .04em;

  text-transform: uppercase;

  margin-bottom: 12px;
}

.card-value {
  color: var(--text-main);
  font-size: 24px;
  font-weight: 700;
}

.gauge-card {
  display: flex;
  flex-direction: column;
  min-height: 300px;
  padding-bottom: 14px;
}

.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  background: transparent;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}

.service-badge::before {
  content: "";
  width: 7px;
  height: 7px;
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
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.section-header p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.record-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 28px;
  padding: 0 10px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 12px;
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
  font-size: 13px;
  line-height: 1.5;
}

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
  font-size: 13px;
  text-align: left;
  vertical-align: middle;
}

.history-table th {
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
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

.metric-value {
  display: inline-block;
  min-width: 56px;
  color: var(--text-main);
  font-weight: 700;
  text-align: right;
}

.metric-warning {
  color: #dc2626;
}

@media (max-width: 768px) {
  .page-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .refresh-summary {
    justify-content: flex-start;
    flex-wrap: wrap;
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
    font-size: 22px;
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
    font-size: 16px;
  }

  .section-header p {
    font-size: 11px;
  }

  .history-table th,
  .history-table td {
    padding: 12px 14px;
  }
}

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
  background: linear-gradient(90deg,
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
  height: 38px;
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
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 15px;
}

.skeleton-host-info {
  width: 100%;
  max-width: 360px;
}

.skeleton-title {
  width: 160px;
  height: 26px;
}

.skeleton-subtitle {
  width: 220px;
  height: 14px;
  margin-top: 10px;
}

.skeleton-description {
  width: 300px;
  max-width: 100%;
  height: 12px;
  margin-top: 9px;
}

.skeleton-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.skeleton-card {
  min-height: 300px;
  box-sizing: border-box;
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
}

.skeleton-service-card {
  min-height: 150px;
}

.skeleton-card-title {
  width: 110px;
  height: 14px;
}

.skeleton-gauge {
  width: 170px;
  height: 170px;
  margin: 34px auto 0;
  border-radius: 50%;
}

.skeleton-status {
  width: 72px;
  height: 24px;
  margin-top: 24px;
}

.skeleton-card .skeleton-description {
  width: 150px;
  margin-top: 20px;
}

@media (max-width: 768px) {

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
</style>
