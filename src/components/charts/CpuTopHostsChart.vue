<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import type { AgentDashboardItem } from "../../types/dashboard";

const props = defineProps<{
  hosts: AgentDashboardItem[];
  topN?: number;
}>();

const topHosts = computed(() =>
  [...props.hosts]
    .filter(
      (host) =>
        host.cpuUsage !== null &&
        host.cpuUsage !== undefined
    )
    .sort(
      (a, b) =>
        Number(b.cpuUsage) - Number(a.cpuUsage)
    )
    .slice(0, props.topN ?? 5)
);

const chartOption = computed(() => ({
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
    },
    formatter: "{b}: {c}%",
  },
  grid: {
    left: 90,
    right: 24,
    top: 24,
    bottom: 24,
  },
  xAxis: {
    type: "value",
    max: 100,
    axisLabel: {
      formatter: "{value}%",
    },
  },
  yAxis: {
    type: "category",
    data: topHosts.value.map(
      (host) => host.hostName || host.agentCode
    ),
    inverse: true,
  },
  series: [
    {
      name: "CPU 使用率",
      type: "bar",
      data: topHosts.value.map((host) =>
        Number(host.cpuUsage ?? 0)
      ),
      barWidth: 18,
    },
  ],
}));
</script>

<template>
  <div class="cpu-top-hosts-card">
    <div class="chart-header">
      <h3>CPU 使用率前 {{ topN ?? 5 }} 名</h3>
    </div>

    <div v-if="topHosts.length === 0" class="empty-state">
      目前沒有 CPU 資料
    </div>

    <VChart v-else class="chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.cpu-top-hosts-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.chart-header h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.chart {
  width: 100%;
  height: 320px;
}

.empty-state {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}
</style>
