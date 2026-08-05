<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseEChart from "./charts/BaseEChart.vue";
import type { MetricHistory } from "../types/dashboard";

const props = withDefaults(
  defineProps<{
    history?: MetricHistory[];
  }>(),
  {
    history: () => [],
  }
);

const sortedHistory = computed<MetricHistory[]>(() => {
  return [...props.history]
    .filter((item) => Boolean(item.collectedAt))
    .sort((a, b) => {
      const timeA = new Date(a.collectedAt).getTime();
      const timeB = new Date(b.collectedAt).getTime();

      if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
        return 0;
      }

      if (Number.isNaN(timeA)) {
        return 1;
      }

      if (Number.isNaN(timeB)) {
        return -1;
      }

      return timeA - timeB;
    });
});

function formatChartTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function normalizePercent(
  value: number | null | undefined
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

const option = computed<EChartsOption>(() => {
  const labels = sortedHistory.value.map((item) =>
    formatChartTime(item.collectedAt)
  );

  const values = sortedHistory.value.map((item) =>
    normalizePercent(item.diskUsage)
  );

  return {
    animation: true,
    animationDuration: 500,
    animationEasing: "cubicOut",

    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "rgba(15, 23, 42, 0.94)",
      borderWidth: 0,
      padding: [10, 12],

      textStyle: {
        color: "#ffffff",
        fontSize: 13,
      },

      axisPointer: {
        type: "line",
        lineStyle: {
          color: "#94a3b8",
          type: "dashed",
          width: 1,
        },
      },

      formatter: (params) => {
        const items = Array.isArray(params)
          ? params
          : [params];

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
          dataIndex >= sortedHistory.value.length
        ) {
          return "";
        }

        const historyItem =
          sortedHistory.value[dataIndex];

        if (!historyItem) {
          return "";
        }

        const rawValue = Array.isArray(firstItem.value)
          ? firstItem.value[1]
          : firstItem.value;

        const parsedValue =
          typeof rawValue === "number"
            ? rawValue
            : Number(rawValue ?? 0);

        const numericValue = Number.isFinite(parsedValue)
          ? parsedValue
          : 0;

        return [
          `<strong>${formatChartTime(
            historyItem.collectedAt
          )}</strong>`,
          `Disk 使用率：${numericValue.toFixed(1)}%`,
        ].join("<br/>");
      },
    },

    grid: {
      top: 24,
      right: 24,
      bottom: 46,
      left: 58,
      containLabel: false,
    },

    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,

      axisLine: {
        show: true,
        lineStyle: {
          color: "#cbd5e1",
        },
      },

      axisTick: {
        show: false,
      },

      axisLabel: {
        color: "#64748b",
        fontSize: 11,
        margin: 14,
        hideOverlap: true,
      },

      splitLine: {
        show: false,
      },
    },

    yAxis: {
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

    series: [
      {
        name: "Disk 使用率",
        type: "line",
        data: values,

        smooth: true,
        smoothMonotone: "x",

        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,

        connectNulls: false,

        lineStyle: {
          width: 3,
          color: "#ea580c",
          cap: "round",
        },

        itemStyle: {
          color: "#ea580c",
          borderColor: "#ffffff",
          borderWidth: 2,
        },

        areaStyle: {
          color: "rgba(234, 88, 12, 0.10)",
        },

        emphasis: {
          focus: "series",
          scale: true,

          itemStyle: {
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: "rgba(234, 88, 12, 0.35)",
          },
        },

        markLine: {
          silent: true,
          symbol: "none",

          label: {
            show: true,
            formatter: "警戒值 80%",
            position: "insideEndTop",
            color: "#d97706",
            fontSize: 11,
          },

          lineStyle: {
            color: "#f59e0b",
            type: "dashed",
            width: 1.5,
          },

          data: [
            {
              yAxis: 80,
            },
          ],
        },
      },
    ],
  };
});
</script>

<template>
  <section class="chart-card">
    <div class="chart-header">
      <div>
        <h3>Disk 使用率趨勢</h3>
        <p>最近 {{ sortedHistory.length }} 筆效能資料</p>
      </div>

      <span class="chart-unit">%</span>
    </div>

    <div v-if="sortedHistory.length === 0" class="empty-chart">
      目前沒有效能指標歷史資料
    </div>

    <BaseEChart v-else :option="option" height="320px" />
  </section>
</template>

<style scoped>
.chart-card {
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

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.chart-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.chart-header p {
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

.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

@media (max-width: 768px) {
  .chart-card {
    padding: 16px;
    border-radius: 12px;
  }

  .chart-header {
    gap: 12px;
  }

  .chart-header h3 {
    font-size: 16px;
  }

  .chart-header p {
    font-size: 11px;
  }
}
</style>
