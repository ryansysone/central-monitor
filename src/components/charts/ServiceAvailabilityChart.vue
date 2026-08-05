<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseEChart from "./BaseEChart.vue";

const props = defineProps<{
  database: number;
  ftp: number;
  application: number;
}>();

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function getAvailabilityColor(value: number): string {
  if (value < 80) {
    return "#dc2626";
  }

  if (value < 95) {
    return "#f59e0b";
  }

  return "#16a34a";
}

const availabilityData = computed(() => [
  {
    name: "Database",
    value: normalizePercent(props.database),
  },
  {
    name: "FTP",
    value: normalizePercent(props.ftp),
  },
  {
    name: "應用程式",
    value: normalizePercent(props.application),
  },
]);

const option = computed<EChartsOption>(() => ({
  animation: true,
  animationDuration: 500,
  animationEasing: "cubicOut",

  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
    },
    confine: true,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderWidth: 0,
    padding: [10, 12],

    textStyle: {
      color: "#ffffff",
      fontSize: 13,
    },

    formatter: (params) => {
      const items = Array.isArray(params) ? params : [params];
      const firstItem = items[0];

      if (!firstItem) {
        return "";
      }

      const dataIndex =
        typeof firstItem.dataIndex === "number"
          ? firstItem.dataIndex
          : -1;

      if (
        dataIndex < 0 ||
        dataIndex >= availabilityData.value.length
      ) {
        return "";
      }

      const item = availabilityData.value[dataIndex];

      if (!item) {
        return "";
      }

      return [
        `<strong>${item.name}</strong>`,
        `可用率：${item.value.toFixed(1)}%`,
      ].join("<br/>");
    },
  },

  grid: {
    top: 24,
    right: 32,
    bottom: 32,
    left: 92,
    containLabel: false,
  },

  xAxis: {
    type: "value",
    min: 0,
    max: 100,
    interval: 20,

    axisLine: {
      show: false,
    },

    axisTick: {
      show: false,
    },

    axisLabel: {
      color: "#64748b",
      fontSize: 11,
      formatter: "{value}%",
    },

    splitLine: {
      show: true,
      lineStyle: {
        color: "#e2e8f0",
        type: "dashed",
      },
    },
  },

  yAxis: {
    type: "category",
    data: availabilityData.value.map((item) => item.name),

    axisLine: {
      show: false,
    },

    axisTick: {
      show: false,
    },

    axisLabel: {
      color: "#64748b",
      fontSize: 12,
      fontWeight: 600,
    },
  },

  series: [
    {
      name: "可用率",
      type: "bar",
      barWidth: 18,
      showBackground: true,

      backgroundStyle: {
        color: "#e8edf3",
        borderRadius: 999,
      },

      data: availabilityData.value.map((item) => ({
        value: item.value,

        itemStyle: {
          color: getAvailabilityColor(item.value),
          borderRadius: 999,
        },

        label: {
          show: true,
          position: "right",
          distance: 10,
          color: "#64748b",
          fontSize: 12,
          fontWeight: 700,
          formatter: `${item.value.toFixed(1)}%`,
        },
      })),

      emphasis: {
        focus: "series",

        itemStyle: {
          shadowBlur: 10,
          shadowColor: "rgba(15, 23, 42, 0.18)",
        },
      },
    },
  ],
}));
</script>

<template>
  <section class="availability-card">
    <div class="availability-header">
      <div>
        <h3>服務可用率</h3>
        <p>Database、FTP 與應用程式的歷史可用率</p>
      </div>

      <span class="chart-unit">%</span>
    </div>

    <BaseEChart :option="option" height="300px" />
  </section>
</template>

<style scoped>
.availability-card {
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

.availability-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.availability-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.availability-header p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.chart-unit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 28px;
  padding: 0 9px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--panel-bg);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .availability-card {
    padding: 16px;
    border-radius: 12px;
  }

  .availability-header h3 {
    font-size: 16px;
  }

  .availability-header p {
    font-size: 11px;
  }
}
</style>
