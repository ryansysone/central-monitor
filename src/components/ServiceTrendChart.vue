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
import type { ServiceHistory } from "../types/dashboard";

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
    history?: ServiceHistory[];
  }>(),
  {
    history: () => [],
  }
);

function statusToValue(status: string) {
  if (status === "UP") return 1;
  if (status === "DOWN") return 0;
  return 0.5;
}

const chartData = computed(() => ({
  labels: props.history.map((item, index) => {
    return item.collectedAt || `#${index + 1}`;
  }),
  datasets: [
    {
      label: "Database",
      data: props.history.map((item) => statusToValue(item.databaseStatus)),
      tension: 0.2,
      fill: false,
    },
    {
      label: "FTP",
      data: props.history.map((item) => statusToValue(item.ftpStatus)),
      tension: 0.2,
      fill: false,
    },
    {
      label: "Application",
      data: props.history.map((item) => statusToValue(item.applicationStatus)),
      tension: 0.2,
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
      max: 1,
      ticks: {
        stepSize: 0.5,
        callback(value: string | number) {
          if (value === 1) return "UP";
          if (value === 0.5) return "UNKNOWN";
          if (value === 0) return "DOWN";
          return "";
        },
      },
    },
  },
};
</script>

<template>
  <div class="chart-card">
    <h3>Service Trend</h3>

    <div v-if="props.history.length === 0" class="empty-chart">
      No service history data
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
