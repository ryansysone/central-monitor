<script setup lang="ts">
import { computed } from "vue";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "vue-chartjs";
import type { MetricHistory } from "../types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const props = withDefaults(
  defineProps<{
    history?: MetricHistory[];
  }>(),
  {
    history: () => [],
  }
);

const chartData = computed(() => ({
  labels: props.history.map((item, index) => {
    return item.collectedAt || `#${index + 1}`;
  }),
  datasets: [
    {
      label: "CPU Usage",
      data: props.history.map((item) => item.cpuUsage),
      tension: 0.3,
      fill: false,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 0,
      max: 100,
    },
  },
};
</script>

<template>
  <div class="chart-card">
    <h3>CPU Trend</h3>

    <div v-if="props.history.length === 0" class="empty-chart">
      No metric history data
    </div>

    <div v-else class="chart-container">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  margin-top: 32px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}

.chart-card h3 {
  margin-top: 0;
}

.chart-container {
  height: 300px;
}

.empty-chart {
  color: #666;
  padding: 24px 0;
}
</style>
