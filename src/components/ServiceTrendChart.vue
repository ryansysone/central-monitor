<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseEChart from "./charts/BaseEChart.vue";
import type { ServiceHistory } from "../types/dashboard";

const props = withDefaults(
  defineProps<{
    history?: ServiceHistory[];
  }>(),
  {
    history: () => [],
  }
);

const sortedHistory = computed<ServiceHistory[]>(() => {
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

function statusToValue(
  status: string | null | undefined
): number {
  switch (status) {
    case "UP":
      return 1;

    case "DOWN":
      return 0;

    default:
      return 0.5;
  }
}

function valueToStatus(value: unknown): string {
  const numericValue = Number(value);

  if (numericValue === 1) {
    return "正常";
  }

  if (numericValue === 0) {
    return "異常";
  }

  return "未知";
}

const option = computed<EChartsOption>(() => {
  const labels = sortedHistory.value.map((item) =>
    formatChartTime(item.collectedAt)
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

        const rows = items.map((item) => {
          const rawValue = Array.isArray(item.value)
            ? item.value[1]
            : item.value;

          const marker =
            typeof item.marker === "string"
              ? item.marker
              : "";

          return `${marker}${item.seriesName}：${valueToStatus(
            rawValue
          )}`;
        });

        return [
          `<strong>${formatChartTime(
            historyItem.collectedAt
          )}</strong>`,
          ...rows,
        ].join("<br/>");
      },
    },

    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        color: "#64748b",
        fontSize: 12,
      },
    },

    grid: {
      top: 54,
      right: 24,
      bottom: 46,
      left: 76,
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
      max: 1,
      interval: 0.5,

      axisLine: {
        show: false,
      },

      axisTick: {
        show: false,
      },

      axisLabel: {
        color: "#64748b",
        fontSize: 11,
        formatter: (value: number) => {
          if (value === 1) {
            return "正常";
          }

          if (value === 0.5) {
            return "未知";
          }

          if (value === 0) {
            return "異常";
          }

          return "";
        },
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
        name: "Database",
        type: "line",

        data: sortedHistory.value.map((item) =>
          statusToValue(item.databaseStatus)
        ),

        smooth: false,
        step: "end",
        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,

        lineStyle: {
          width: 3,
          color: "#16a34a",
        },

        itemStyle: {
          color: "#16a34a",
          borderColor: "#ffffff",
          borderWidth: 2,
        },

        emphasis: {
          focus: "series",
          scale: true,
        },
      },

      {
        name: "FTP",
        type: "line",

        data: sortedHistory.value.map((item) =>
          statusToValue(item.ftpStatus)
        ),

        smooth: false,
        step: "end",
        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,

        lineStyle: {
          width: 3,
          color: "#2563eb",
        },

        itemStyle: {
          color: "#2563eb",
          borderColor: "#ffffff",
          borderWidth: 2,
        },

        emphasis: {
          focus: "series",
          scale: true,
        },
      },

      {
        name: "應用程式",
        type: "line",

        data: sortedHistory.value.map((item) =>
          statusToValue(item.applicationStatus)
        ),

        smooth: false,
        step: "end",
        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,

        lineStyle: {
          width: 3,
          color: "#7c3aed",
        },

        itemStyle: {
          color: "#7c3aed",
          borderColor: "#ffffff",
          borderWidth: 2,
        },

        emphasis: {
          focus: "series",
          scale: true,
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
        <h3>服務狀態趨勢</h3>

        <p>
          最近 {{ sortedHistory.length }} 筆服務狀態資料
        </p>
      </div>

      <span class="chart-unit">STATUS</span>
    </div>

    <div v-if="sortedHistory.length === 0" class="empty-chart">
      目前沒有服務狀態歷史資料
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
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
