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

const loading = ref(true);
const error = ref("");
const host = ref<HostDetail | null>(null);
const metricHistory = ref<MetricHistory[]>([]);
const serviceHistory = ref<ServiceHistory[]>([]);

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
  const latest = recentMetricHistory.value[0]?.collectedAt;
  return latest ? formatDateTime(latest) : "-";
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

async function loadHost() {
  loading.value = true;
  error.value = "";

  try {
    host.value = await fetchHostDetail(agentCode);
  } catch (err) {
    console.error("Host detail failed", err);
    error.value = "Failed to load host detail";
    loading.value = false;
    return;
  }

  try {
    metricHistory.value = await fetchMetricHistory(agentCode);
  } catch (err) {
    console.error("Metric history failed", err);
    metricHistory.value = [];
  }

  try {
    serviceHistory.value = await fetchServiceHistory(agentCode);
  } catch (err) {
    console.error("Service history failed", err);
    serviceHistory.value = [];
  }

  loading.value = false;
}

function goBack() {
  router.push("/");
}

onMounted(() => {
  loadHost();

  refreshTimer = window.setInterval(() => {
    loadHost();
  }, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="host-detail-page">
    <button class="back-btn" @click="goBack">← Back</button>

    <h1>Host Detail</h1>

    <div class="last-updated">
      Last Updated: {{ lastUpdated }}
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="host">
      <div class="host-header">
        <div>
          <h2>{{ host.agentCode }}</h2>
          <p class="host-name">{{ host.hostName }}</p>
        </div>

        <span :class="['status-badge', host.status.toLowerCase()]">
          {{ host.status }}
        </span>
      </div>

      <div class="card-grid">
        <div class="detail-card gauge-card">
          <div class="card-title">CPU Usage</div>
          <UsageGaugeChart title="CPU" :value="host.cpuUsage" />
        </div>

        <div class="detail-card gauge-card">
          <div class="card-title">Memory Usage</div>
          <UsageGaugeChart title="Memory" :value="host.memoryUsage" />
        </div>

        <div class="detail-card gauge-card">
          <div class="card-title">Disk Usage</div>
          <UsageGaugeChart title="Disk" :value="host.diskUsage" />
        </div>
      </div>

      <div class="card-grid">
        <div class="detail-card">
          <div class="card-title">Database</div>
          <div class="card-value">{{ host.databaseStatus ?? "UNKNOWN" }}</div>
        </div>

        <div class="detail-card">
          <div class="card-title">FTP</div>
          <div class="card-value">{{ host.ftpStatus ?? "UNKNOWN" }}</div>
        </div>

        <div class="detail-card">
          <div class="card-title">Application</div>
          <div class="card-value">{{ host.applicationStatus ?? "UNKNOWN" }}</div>
        </div>
      </div>

      <CpuTrendChart :history="recentMetricHistory" />

      <MemoryTrendChart :history="recentMetricHistory" />

      <DiskTrendChart :history="recentMetricHistory" />

      <ServiceTrendChart :history="recentServiceHistory" />

      <div class="section">
        <h3>Service Timeline</h3>

        <ServiceTimelineChart :history="recentServiceHistory" />
      </div>

      <div class="section">
        <h3>Service Availability Report</h3>

        <ServiceAvailabilityChart :database="serviceAvailability.database" :ftp="serviceAvailability.ftp"
          :application="serviceAvailability.application" />

        <div class="card-grid">
          <div class="detail-card">
            <div class="card-title">Database Availability</div>
            <div class="card-value">
              {{ serviceAvailability.database }}%
            </div>
          </div>

          <div class="detail-card">
            <div class="card-title">FTP Availability</div>
            <div class="card-value">
              {{ serviceAvailability.ftp }}%
            </div>
          </div>

          <div class="detail-card">
            <div class="card-title">Application Availability</div>
            <div class="card-value">
              {{ serviceAvailability.application }}%
            </div>
          </div>
        </div>




      </div>

      <div class="section">
        <h3>Metric History</h3>

        <table class="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>CPU</th>
              <th>Memory</th>
              <th>Disk</th>
            </tr>
          </thead>

          <tbody>
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
        <h3>Service History</h3>

        <table class="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Database</th>
              <th>FTP</th>
              <th>Application</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in recentServiceHistory" :key="item.id ?? item.collectedAt">
              <td>{{ formatDateTime(item.collectedAt) }}</td>

              <td>
                <span :class="['service-badge', serviceStatusClass(item.databaseStatus)]">
                  {{ item.databaseStatus }}
                </span>
              </td>

              <td>
                <span :class="['service-badge', serviceStatusClass(item.ftpStatus)]">
                  {{ item.ftpStatus }}
                </span>
              </td>

              <td>
                <span :class="['service-badge', serviceStatusClass(item.applicationStatus)]">
                  {{ item.applicationStatus }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.status-badge.online {
  background: #dcfce7;
  color: #166534;
}

.status-badge.offline {
  background: #fee2e2;
  color: #991b1b;
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
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.service-up {
  background: #dcfce7;
  color: #166534;
}

.service-down {
  background: #fee2e2;
  color: #991b1b;
}

.service-unknown {
  background: #e5e7eb;
  color: #374151;
}

.last-updated {
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 14px;
}

.gauge-card {
  padding-bottom: 8px;
}
</style>
