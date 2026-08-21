<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import VChart from "vue-echarts";

import type { EChartsOption } from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import type { AgentDashboardItem } from "../../types/dashboard";

const router = useRouter();

const props = defineProps<{
  title: string;
  hosts: AgentDashboardItem[];
  metricKey: "cpuUsage" | "memoryUsage" | "diskUsage";
  topN?: number;
  emptyText?: string;
}>();

const topHosts = computed(() =>
  [...props.hosts]
    .filter(
      (host) =>
        host[props.metricKey] !== null &&
        host[props.metricKey] !== undefined
    )
    .sort(
      (a, b) =>
        Number(b[props.metricKey]) -
        Number(a[props.metricKey])
    )
    .slice(0, props.topN ?? 5)
);

function handleChartClick(
  params: CallbackDataParams
): void {
  const index = params.dataIndex;

  if (
    index == null ||
    index < 0 ||
    index >= topHosts.value.length
  ) {
    return;
  }

  const host = topHosts.value[index];

  if (!host) {
    return;
  }

  router.push(`/host/${host.agentCode}`);
}

const chartOption = computed<EChartsOption>(() => ({
  animationDuration: 450,
  animationDurationUpdate: 350,
  animationEasing: "cubicOut",
  animationEasingUpdate: "cubicOut",

  tooltip: {
    trigger: "axis",

    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderColor: "rgba(148, 163, 184, 0.18)",
    borderWidth: 1,

    padding: [10, 12],

    textStyle: {
      color: "#f8fafc",
      fontSize: 12,
    },

    extraCssText:
      "border-radius: 8px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);",

    axisPointer: {
      type: "shadow",

      shadowStyle: {
        color: "rgba(148, 163, 184, 0.08)",
      },
    },

    formatter: (
      params: CallbackDataParams | CallbackDataParams[]
    ) => {
      const item = Array.isArray(params)
        ? params[0]
        : params;

      if (!item) {
        return "";
      }

      return `
        <div style="min-width: 130px;">
          <div style="
            margin-bottom: 5px;
            font-weight: 700;
            color: #ffffff;
          ">
            ${String(item.name)}
          </div>

          <div style="
            color: #cbd5e1;
            line-height: 1.6;
          ">
            使用率
            <strong style="
              margin-left: 6px;
              color: #ffffff;
              font-size: 13px;
            ">
              ${String(item.value)}%
            </strong>
          </div>

          <div style="
            margin-top: 5px;
            color: #94a3b8;
            font-size: 10px;
          ">
            點擊查看主機詳細資訊
          </div>
        </div>
      `;
    },
  },

  grid: {
    left: 96,
    right: 52,
    top: 18,
    bottom: 30,
  },

  xAxis: {
    type: "value",
    min: 0,
    max: 100,

    axisLine: {
      show: false,
    },

    axisTick: {
      show: false,
    },

    axisLabel: {
      color: "#94a3b8",
      fontSize: 10,
      formatter: "{value}%",
    },

    splitLine: {
      show: true,

      lineStyle: {
        color: "rgba(148, 163, 184, 0.14)",
        width: 1,
        type: "dashed",
      },
    },
  },

  yAxis: {
    type: "category",
    inverse: true,

    data: topHosts.value.map(
      (host) =>
        host.hostName || host.agentCode
    ),

    axisLine: {
      show: false,
    },

    axisTick: {
      show: false,
    },

    axisLabel: {
      color: "#64748b",
      fontSize: 11,
      fontWeight: 600,
      width: 80,
      overflow: "truncate",
    },
  },

  series: [
    {
      name: props.title,
      type: "bar",

      barWidth: 14,
      barMaxWidth: 14,

      showBackground: true,

      backgroundStyle: {
        color: "rgba(148, 163, 184, 0.08)",
        borderRadius: 4,
      },

      label: {
        show: true,
        position: "right",
        distance: 8,

        color: "#64748b",
        fontSize: 10,
        fontWeight: 600,

        formatter: (
          params: CallbackDataParams
        ) => `${String(params.value)}%`,
      },

      emphasis: {
        focus: "series",
      },

      data: topHosts.value.map((host) => {
        const value = Number(
          host[props.metricKey] ?? 0
        );

        return {
          value,

          itemStyle: {
            borderRadius: [0, 4, 4, 0],

            color:
              value >= 90
                ? "#dc2626"
                : value >= 75
                  ? "#d97706"
                  : "#2563eb",
          },
        };
      }),
    },
  ],
}));
</script>

<template>
  <article class="top-hosts-card">
    <div class="chart-header">
      <div>
        <span class="chart-eyebrow">
          RESOURCE USAGE
        </span>

        <h3>
          {{ title }}
        </h3>
      </div>

      <div class="threshold-legend">
        <span>
          <i class="legend-dot normal"></i>
          &lt; 75%
        </span>

        <span>
          <i class="legend-dot warning"></i>
          ≥ 75%
        </span>

        <span>
          <i class="legend-dot critical"></i>
          ≥ 90%
        </span>
      </div>
    </div>

    <div v-if="topHosts.length === 0" class="empty-state">
      <span class="empty-state-dot"></span>

      {{ emptyText ?? "目前沒有資料" }}
    </div>

    <VChart v-else class="chart" :option="chartOption" autoresize @click="handleChartClick" />
  </article>
</template>

<style scoped>
.top-hosts-card {
  min-width: 0;
  box-sizing: border-box;
  padding: 18px 20px 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 4px 14px rgba(15, 23, 42, 0.035);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.top-hosts-card:hover {
  border-color: rgba(148, 163, 184, 0.28);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 6px 18px rgba(15, 23, 42, 0.045);
}

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
  margin-bottom: 8px;
}

.chart-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.12em;
}

.chart-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.threshold-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 2px;
  color: var(--text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.threshold-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
}

.legend-dot.normal {
  background: #2563eb;
}

.legend-dot.warning {
  background: #d97706;
}

.legend-dot.critical {
  background: #dc2626;
}

.chart {
  width: 100%;
  height: 300px;
  cursor: pointer;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 300px;
  color: var(--text-muted);
  font-size: 12px;
}

.empty-state-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #94a3b8;
}

@media (max-width: 1280px) {
  .chart-header {
    flex-direction: column;
    gap: 10px;
  }

  .threshold-legend {
    justify-content: flex-start;
  }
}

@media (max-width: 600px) {
  .top-hosts-card {
    padding: 16px;
    border-radius: 14px;
  }

  .chart {
    height: 280px;
  }

  .empty-state {
    height: 280px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .top-hosts-card {
    transition: none;
  }
}
</style>
