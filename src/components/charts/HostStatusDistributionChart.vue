<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import type { AgentDashboardItem } from "../../types/dashboard";

const props = defineProps<{
  hosts: AgentDashboardItem[];
}>();

const statusNameMap: Record<string, string> = {
  ONLINE: "在線",
  OFFLINE: "離線",
};

const chartOption = computed(() => {
  const distribution = props.hosts.reduce(
    (acc, host) => {
      acc[host.status] = (acc[host.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    tooltip: {
      trigger: "item",
    },

    legend: {
      bottom: 0,
    },

    series: [
      {
        name: "主機狀態",
        type: "pie",
        radius: ["45%", "75%"],

        label: {
          formatter: "{b}\n{d}%",
        },

        data: Object.entries(distribution).map(([name, value]) => ({
          name: statusNameMap[name] ?? name,
          value,
        })),
      },
    ],
  };
});
</script>

<template>
  <div class="chart-card">
    <h3>主機狀態分布</h3>

    <VChart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.chart-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--panel-bg);
}

.chart-card h3 {
  margin: 0 0 16px;
  color: var(--text-main);
}

.chart {
  height: 340px;
}
</style>
