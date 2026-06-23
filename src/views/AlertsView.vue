<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useDashboardStore } from "../stores/dashboard";

const dashboardStore = useDashboardStore();
const selectedFilter = ref("ALL");

onMounted(() => {
  dashboardStore.loadDashboard();
});

const criticalAlerts = computed(() => {
  return dashboardStore.agents.filter((agent) => {
    return (
      agent.status === "OFFLINE" ||
      agent.databaseStatus === "DOWN" ||
      agent.ftpStatus === "DOWN" ||
      agent.applicationStatus === "DOWN"
    );
  });
});

const warningAlerts = computed(() => {
  return dashboardStore.agents.filter((agent) => {
    return (
      (agent.cpuUsage ?? 0) >= 80 ||
      (agent.memoryUsage ?? 0) >= 80 ||
      (agent.diskUsage ?? 0) >= 80
    );
  });
});

const healthyHosts = computed(() => {
  return dashboardStore.agents.filter((agent) => {
    return (
      agent.status === "ONLINE" &&
      agent.databaseStatus !== "DOWN" &&
      agent.ftpStatus !== "DOWN" &&
      agent.applicationStatus !== "DOWN"
    );
  });
});

const filteredAlerts = computed(() => {
  if (selectedFilter.value === "CRITICAL") {
    return criticalAlerts.value.map((agent) => ({
      type: "CRITICAL",
      agent,
    }));
  }

  if (selectedFilter.value === "WARNING") {
    return warningAlerts.value.map((agent) => ({
      type: "WARNING",
      agent,
    }));
  }

  return [
    ...criticalAlerts.value.map((agent) => ({
      type: "CRITICAL",
      agent,
    })),
    ...warningAlerts.value.map((agent) => ({
      type: "WARNING",
      agent,
    })),
  ];
});

const selectedAgentCode = ref<string | null>(null);

const selectedAlert = computed(() => {
  if (!selectedAgentCode.value) return null;

  return dashboardStore.agents.find(
    (agent) => agent.agentCode === selectedAgentCode.value
  );
});


function getSeverityClass(type: string) {
  if (type === "CRITICAL") return "severity-critical";
  if (type === "WARNING") return "severity-warning";
  return "severity-info";
}


</script>

<template>
  <div class="alerts-page">
    <h1>Alerts</h1>

    <div class="alert-grid">
      <div class="alert-card critical">
        <div class="alert-title">Critical Alerts</div>
        <div class="alert-value">{{ criticalAlerts.length }}</div>
      </div>

      <div class="alert-card warning">
        <div class="alert-title">Warnings</div>
        <div class="alert-value">{{ warningAlerts.length }}</div>
      </div>

      <div class="alert-card healthy">
        <div class="alert-title">Healthy Hosts</div>
        <div class="alert-value">{{ healthyHosts.length }}</div>
      </div>
    </div>

    <div class="alert-panel">
      <h2>Recent Alerts</h2>

      <div class="filter-bar">
        <button :class="['filter-btn', selectedFilter === 'ALL' ? 'active' : '']" @click="selectedFilter = 'ALL'">
          All
        </button>

        <button :class="['filter-btn', selectedFilter === 'CRITICAL' ? 'active' : '']"
          @click="selectedFilter = 'CRITICAL'">
          Critical
        </button>

        <button :class="['filter-btn', selectedFilter === 'WARNING' ? 'active' : '']"
          @click="selectedFilter = 'WARNING'">
          Warning
        </button>
      </div>

      <p v-if="filteredAlerts.length === 0" class="empty-alert">
        No active alerts.
      </p>

      <div v-else class="alert-list">
        <div v-for="item in filteredAlerts" :key="`${item.type}-${item.agent.agentCode}`" :class="[
          'alert-row',
          item.type === 'CRITICAL' ? 'critical-row' : 'warning-row',
        ]" @click="selectedAgentCode = item.agent.agentCode">


          <span :class="['severity-badge', getSeverityClass(item.type)]">
            {{ item.type }}
          </span>

          {{ item.agent.agentCode }}

          <div class="alert-reason" v-if="item.type === 'CRITICAL'">
            <span v-if="item.agent.status === 'OFFLINE'">Host Offline</span>
            <span v-if="item.agent.databaseStatus === 'DOWN'">DB Down</span>
            <span v-if="item.agent.ftpStatus === 'DOWN'">FTP Down</span>
            <span v-if="item.agent.applicationStatus === 'DOWN'">APP Down</span>
          </div>

          <div class="alert-reason" v-else>
            <span v-if="(item.agent.cpuUsage ?? 0) >= 80">
              CPU {{ item.agent.cpuUsage?.toFixed(1) }}%
            </span>

            <span v-if="(item.agent.memoryUsage ?? 0) >= 80">
              Memory {{ item.agent.memoryUsage?.toFixed(1) }}%
            </span>

            <span v-if="(item.agent.diskUsage ?? 0) >= 80">
              Disk {{ item.agent.diskUsage?.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>
      <div v-if="selectedAlert" class="alert-detail-panel">
        <h2>Alert Detail</h2>

        <p><strong>Agent Code:</strong> {{ selectedAlert.agentCode }}</p>
        <p><strong>Host Name:</strong> {{ selectedAlert.hostName }}</p>
        <p><strong>Status:</strong> {{ selectedAlert.status }}</p>
        <p><strong>CPU:</strong> {{ selectedAlert.cpuUsage ?? 0 }}%</p>
        <p><strong>Memory:</strong> {{ selectedAlert.memoryUsage ?? 0 }}%</p>
        <p><strong>Disk:</strong> {{ selectedAlert.diskUsage ?? 0 }}%</p>
        <p><strong>DB:</strong> {{ selectedAlert.databaseStatus ?? "UNKNOWN" }}</p>
        <p><strong>FTP:</strong> {{ selectedAlert.ftpStatus ?? "UNKNOWN" }}</p>
        <p><strong>APP:</strong> {{ selectedAlert.applicationStatus ?? "UNKNOWN" }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-page {
  width: 100%;
  color: var(--text-main);
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.alert-card,
.alert-panel,
.alert-detail-panel {
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.alert-card.critical {
  border-left: 6px solid #dc2626;
}

.alert-card.warning {
  border-left: 6px solid #f59e0b;
}

.alert-card.healthy {
  border-left: 6px solid #16a34a;
}

.alert-title,
.empty-alert {
  color: var(--text-muted);
}

.alert-title {
  font-size: 14px;
}

.alert-value {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 700;
  color: var(--text-main);
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-row {
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.alert-row:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.alert-reason {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 400;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.critical-row {
  background: #fee2e2;
  color: #991b1b;
}

.warning-row {
  background: #fef3c7;
  color: #92400e;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-btn {
  border: 1px solid var(--border-color);
  background: var(--panel-bg);
  color: var(--text-main);
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.filter-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.alert-detail-panel {
  margin-top: 24px;
}

.alert-detail-panel h2,
.alert-detail-panel p {
  color: var(--text-main);
}

.severity-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  margin-right: 8px;
}

.severity-critical {
  background: #dc2626;
  color: white;
}

.severity-warning {
  background: #f59e0b;
  color: white;
}

.severity-info {
  background: #2563eb;
  color: white;
}
</style>
