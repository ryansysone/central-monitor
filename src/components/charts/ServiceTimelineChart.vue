<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseEChart from "./BaseEChart.vue";
import type { ServiceHistory } from "../../types/dashboard";

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

function statusLabel(
  status: string | null | undefined
): string {
  switch (status) {
    case "UP":
      return "正常";

    case "DOWN":
      return "異常";

    default:
      return "未知";
  }
}

function statusColor(
  status: string | null | undefined
): string {
  switch (status) {
    case "UP":
      return "#16a34a";

    case "DOWN":
      return "#dc2626";

    default:
      return "#94a3b8";
  }
}

const option = computed<EChartsOption>(() => {
  const labels = sortedHistory.value.map((item) =>
    formatChartTime(item.collectedAt)
  );

  const databaseData = sortedHistory.value.map((item) => ({
    value: [formatChartTime(item.collectedAt), 2],
    status: item.databaseStatus,
    itemStyle: {
      color: statusColor(item.databaseStatus),
    },
  }));

  const ftpData = sortedHistory.value.map((item) => ({
    value: [formatChartTime(item.collectedAt), 1],
    status: item.ftpStatus,
    itemStyle: {
      color: statusColor(item.ftpStatus),
    },
  }));

  const applicationData = sortedHistory.value.map((item) => ({
    value: [formatChartTime(item.collectedAt), 0],
    status: item.applicationStatus,
    itemStyle: {
      color: statusColor(item.applicationStatus),
    },
  }));

  return {
    animation: true,
    animationDuration: 500,
    animationEasing: "cubicOut",

    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: "rgba(15, 23, 42, 0.94)",
      borderWidth: 0,
      padding: [10, 12],

      textStyle: {
        color: "#ffffff",
        fontSize: 13,
      },

      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;

        if (!item) {
          return "";
        }

        const data = item.data as {
          value?: [string, number];
          status?: string;
        };

        const time =
          Array.isArray(data?.value) && data.value[0]
            ? String(data.value[0])
            : "";

        const service =
          typeof item.seriesName === "string"
            ? item.seriesName
            : "";

        return [
          `<strong>${time}</strong>`,
          `${service}：${statusLabel(data?.status)}`,
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
      bottom: 48,
      left: 88,
      containLabel: false,
    },

    xAxis: {
      type: "category",
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
      type: "category",
      data: ["應用程式", "FTP", "Database"],

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
        type: "scatter",
        data: databaseData,

        symbol: "roundRect",
        symbolSize: [16, 12],

        emphasis: {
          scale: 1.35,

          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: "rgba(15, 23, 42, 0.25)",
          },
        },
      },

      {
        name: "FTP",
        type: "scatter",
        data: ftpData,

        symbol: "roundRect",
        symbolSize: [16, 12],

        emphasis: {
          scale: 1.35,

          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: "rgba(15, 23, 42, 0.25)",
          },
        },
      },

      {
        name: "應用程式",
        type: "scatter",
        data: applicationData,

        symbol: "roundRect",
        symbolSize: [16, 12],

        emphasis: {
          scale: 1.35,

          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: "rgba(15, 23, 42, 0.25)",
          },
        },
      },
    ],
  };
});
</script>

<template>
  <section class="timeline-card">
    <div class="timeline-header">
      <div>
        <h3>服務狀態時間軸</h3>
        <p>最近 {{ sortedHistory.length }} 筆服務狀態資料</p>
      </div>

      <div class="status-legend">
        <span class="legend-item">
          <span class="legend-dot up"></span>
          正常
        </span>

        <span class="legend-item">
          <span class="legend-dot down"></span>
          異常
        </span>

        <span class="legend-item">
          <span class="legend-dot unknown"></span>
          未知
        </span>
      </div>
    </div>

    <div v-if="sortedHistory.length === 0" class="empty-chart">
      目前沒有服務狀態歷史資料
    </div>

    <BaseEChart v-else :option="option" height="320px" />
  </section>
</template>

<style scoped>
.timeline-card {
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

.timeline-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.timeline-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.timeline-header p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.status-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.up {
  background: #16a34a;
}

.legend-dot.down {
  background: #dc2626;
}

.legend-dot.unknown {
  background: #94a3b8;
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
  .timeline-card {
    padding: 16px;
    border-radius: 12px;
  }

  .timeline-header {
    flex-direction: column;
    gap: 12px;
  }

  .timeline-header h3 {
    font-size: 16px;
  }

  .timeline-header p {
    font-size: 11px;
  }
}
</style>
