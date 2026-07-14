<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useDashboardStore } from "../stores/dashboard";

const dashboardStore = useDashboardStore();
const router = useRouter();

const searchKeyword = ref("");

onMounted(() => {
  dashboardStore.loadDashboard();
});

const filteredHosts = computed(() => {
  const keyword = searchKeyword.value.toLowerCase();

  if (!keyword) {
    return dashboardStore.agents;
  }

  return dashboardStore.agents.filter((host) => {
    return (
      host.agentCode.toLowerCase().includes(keyword) ||
      host.hostName.toLowerCase().includes(keyword)
    );
  });
});

function openHost(agentCode: string) {
  router.push(`/host/${agentCode}`);
}
</script>

<template>
  <div class="hosts-page">
    <h1>主機列表</h1>

    <div class="search-panel">
      <input v-model="searchKeyword" class="search-input" placeholder="搜尋主機..." />
    </div>

    <div class="host-list">
      <div v-for="host in filteredHosts" :key="host.agentCode" class="host-card" @click="openHost(host.agentCode)">
        <div class="host-header">
          <div>
            <div class="host-code">
              {{ host.agentCode }}
            </div>

            <div class="host-name">
              {{ host.hostName }}
            </div>
          </div>

          <span :class="[
            'status-badge',
            host.status.toLowerCase()
          ]">
            {{ host.status === "ONLINE" ? "在線" : "離線" }}
          </span>
        </div>

        <div class="usage-row">
          CPU 使用率：{{ host.cpuUsage?.toFixed(1) ?? 0 }}%
        </div>

        <div class="usage-row">
          Memory 使用率：{{ host.memoryUsage?.toFixed(1) ?? 0 }}%
        </div>

        <div class="usage-row">
          Disk 使用率：{{ host.diskUsage?.toFixed(1) ?? 0 }}%
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hosts-page {
  width: 100%;
  color: var(--text-main);
}

.search-panel {
  margin: 20px 0;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-main);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.host-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.host-card {
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
}

.host-card:hover {
  border-color: var(--primary-color);
}

.host-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.host-code {
  font-weight: 700;
  color: var(--text-main);
}

.host-name {
  color: var(--text-muted);
  font-size: 13px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.status-badge.online {
  background: #dcfce7;
  color: #166534;
}

.status-badge.offline {
  background: #fee2e2;
  color: #991b1b;
}

.usage-row {
  margin-top: 8px;
  color: var(--text-main);
}
</style>
