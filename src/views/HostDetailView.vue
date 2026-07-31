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

function serviceStatusClass(status: string) {
  switch (status) {
    case "UP":
      return "service-up";

    case "DOWN":
      return "service-down";

    default:
      return "service-unknown";
  }
}

function serviceStatusLabel(status: string) {
  switch (status) {
    case "UP":
      return "正常";

    case "DOWN":
      return "異常";

    default:
      console.warn(
        `[Service Status] Unknown status received: ${status}`
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
    <button class="back-btn" @click="goBack">← 返回</button>

    <h1>主機詳細資訊</h1>

    <div class="last-updated">
      自動更新：{{ autoRefreshSeconds }} 秒

      <span v-if="refreshing">
        ・背景更新中...
      </span>

      <span v-else>
        ・最後更新：{{ lastUpdated }}
      </span>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <template v-else>
      <div v-if="error" class="error">
        {{ error }}
      </div>

      <div v-if="host">
        <div class="host-header">
          <div>
            <h2>{{ host.agentCode }}</h2>
            <p class="host-name">{{ host.hostName }}</p>
          </div>

          <div class="host-actions">
            <span :class="['status-badge', host.status.toLowerCase()]">
              <span class="status-dot"></span>
              {{ hostStatusLabel(host.status) }}
            </span>

            <button class="refresh-btn" :disabled="loading || refreshing" @click="loadHost">
              {{ refreshing ? "更新中..." : "重新整理" }}
            </button>

            <button class="logs-btn" @click="goToAgentLogs">
              查看 Agent 日誌
            </button>
          </div>

        </div>

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

        <div class="card-grid">
          <div class="detail-card">
            <div class="card-title">Database</div>
            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(host.databaseStatus ?? 'UNKNOWN'),
              ]">
                {{ serviceStatusLabel(host.databaseStatus ?? "UNKNOWN") }}
              </span>
            </div>
          </div>

          <div class="detail-card">
            <div class="card-title">FTP</div>
            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(host.ftpStatus ?? 'UNKNOWN'),
              ]">
                {{ serviceStatusLabel(host.ftpStatus ?? "UNKNOWN") }}
              </span>
            </div>
          </div>

          <div class="detail-card">
            <div class="card-title">應用程式</div>
            <div class="card-value">
              <span :class="[
                'service-badge',
                serviceStatusClass(host.applicationStatus ?? 'UNKNOWN'),
              ]">
                {{ serviceStatusLabel(host.applicationStatus ?? "UNKNOWN") }}
              </span>
            </div>

          </div>
        </div>

        <CpuTrendChart :history="recentMetricHistory" />

        <MemoryTrendChart :history="recentMetricHistory" />

        <DiskTrendChart :history="recentMetricHistory" />

        <ServiceTrendChart :history="recentServiceHistory" />

        <div class="section">
          <h3>服務狀態時間軸</h3>

          <ServiceTimelineChart :history="recentServiceHistory" />
        </div>

        <div class="section">
          <h3>服務可用率報表</h3>

          <ServiceAvailabilityChart :database="serviceAvailability.database" :ftp="serviceAvailability.ftp"
            :application="serviceAvailability.application" />

          <div class="card-grid">
            <div class="detail-card">
              <div class="card-title">Database 可用率</div>
              <div class="card-value">
                {{ serviceAvailability.database }}%
              </div>
            </div>

            <div class="detail-card">
              <div class="card-title">FTP 可用率</div>
              <div class="card-value">
                {{ serviceAvailability.ftp }}%
              </div>
            </div>

            <div class="detail-card">
              <div class="card-title">應用程式可用率</div>
              <div class="card-value">
                {{ serviceAvailability.application }}%
              </div>
            </div>
          </div>
        </div>

        <div class="section">

          <h3>效能指標歷史紀錄</h3>

          <div v-if="metricHistoryError" class="section-error">
            {{ metricHistoryError }}
          </div>


          <table class="history-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>CPU</th>
                <th>Memory</th>
                <th>Disk</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="recentMetricHistory.length === 0">
                <td colspan="4" class="empty-state">
                  目前沒有效能指標歷史資料
                </td>
              </tr>

              <tr v-for="item in recentMetricHistory" :key="item.id ?? item.collectedAt">
                <td>{{ formatDateTime(item.collectedAt) }}</td>
                <td>{{ item.cpuUsage }}%</td>
                <td>{{ item.memoryUsage }}%</td>
                <td>{{ item.diskUsage }}%</td>
              </tr>
            </tbody>

          </table>
        </div>

        <div class="section">
          <h3>服務狀態歷史紀錄</h3>

          <div v-if="serviceHistoryError" class="section-error">
            {{ serviceHistoryError }}
          </div>

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
                <td>{{ formatDateTime(item.collectedAt) }}</td>

                <td>
                  <span :class="[
                    'service-badge',
                    serviceStatusClass(item.databaseStatus),
                  ]">
                    {{ serviceStatusLabel(item.databaseStatus) }}
                  </span>
                </td>

                <td>
                  <span :class="[
                    'service-badge',
                    serviceStatusClass(item.ftpStatus),
                  ]">
                    {{ serviceStatusLabel(item.ftpStatus) }}
                  </span>
                </td>

                <td>
                  <span :class="[
                    'service-badge',
                    serviceStatusClass(item.applicationStatus),
                  ]">
                    {{ serviceStatusLabel(item.applicationStatus) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
.host-detail-page {
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

.loading,
.error {
  margin-top: 16px;
}

.error {
  color: #dc2626;
}

.section-error {
  margin-bottom: 12px;
  color: #dc2626;
  font-size: 14px;
}

.host-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.host-header h2 {
  margin: 0;
  color: var(--text-main);
}

.host-name {
  margin: 4px 0 0;
  color: var(--text-muted);
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

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.detail-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
}

.card-title {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 8px;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-main);
}

.section {
  margin-top: 32px;
  color: var(--text-main);
}

.section h3 {
  color: var(--text-main);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
}

.history-table .empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}

.history-table th,
.history-table td {
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  color: var(--text-main);
}

.history-table th {
  background: var(--panel-bg);
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .host-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}

.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  border-radius: 0;
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
  border-radius: 50%;
  flex-shrink: 0;
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

.last-updated {
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 14px;
}

.gauge-card {
  padding-bottom: 8px;
}

.host-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  min-height: 36px;
  box-sizing: border-box;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
  border-radius: 8px;
  padding: 0 14px;
  font-weight: 600;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.logs-btn {
  min-height: 36px;
  box-sizing: border-box;
  cursor: pointer;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
  border-radius: 8px;
  padding: 0 14px;
  font-weight: 600;
}

.logs-btn:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .host-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
