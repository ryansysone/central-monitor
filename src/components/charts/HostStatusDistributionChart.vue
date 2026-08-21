<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import type { EChartsOption } from "echarts";

import type { AgentDashboardItem } from "../../types/dashboard";

const props = defineProps<{
  hosts: AgentDashboardItem[];
}>();

const statusNameMap: Record<string, string> = {
  ONLINE: "正常",
  OFFLINE: "異常",
  UNKNOWN: "未知",
};

const statusColorMap: Record<string, string> = {
  ONLINE: "#16a34a",
  OFFLINE: "#dc2626",
  UNKNOWN: "#94a3b8",
};

/*
 * 主機狀態分布
 *
 * 固定狀態排序：
 * 正常 → 異常 → 未知
 *
 * 避免資料順序改變時，
 * Chart legend / pie 順序跟著跳動。
 */
const statusDistribution = computed(() => {
  const distribution =
    props.hosts.reduce<Record<string, number>>(
      (accumulator, host) => {
        const status =
          host.status || "UNKNOWN";

        accumulator[status] =
          (accumulator[status] ?? 0) + 1;

        return accumulator;
      },
      {}
    );

  const statusOrder = [
    "ONLINE",
    "OFFLINE",
    "UNKNOWN",
  ];

  return statusOrder
    .map((status) => ({
      status,

      name:
        statusNameMap[status] ??
        status,

      value:
        distribution[status] ?? 0,
    }))
    .filter((item) => item.value > 0);
});

/*
 * 主機總數
 */
const totalHosts = computed(() => {
  return props.hosts.length;
});

/*
 * 正常主機數
 */
const onlineHosts = computed(() => {
  return props.hosts.filter(
    (host) => host.status === "ONLINE"
  ).length;
});

/*
 * 異常主機數
 */
const offlineHosts = computed(() => {
  return props.hosts.filter(
    (host) => host.status === "OFFLINE"
  ).length;
});

/*
 * 未知主機數
 */
const unknownHosts = computed(() => {
  return props.hosts.filter(
    (host) =>
      !host.status ||
      host.status === "UNKNOWN"
  ).length;
});

/*
 * ONLINE 比率
 */
const onlineRate = computed(() => {
  if (totalHosts.value === 0) {
    return 0;
  }

  return Math.round(
    (onlineHosts.value /
      totalHosts.value) *
    100
  );
});

/*
 * ECharts 設定
 */
const chartOption = computed<EChartsOption>(() => ({
  animationDuration: 450,

  animationDurationUpdate: 350,

  animationEasing: "cubicOut",

  animationEasingUpdate: "cubicOut",

  tooltip: {
    trigger: "item",

    backgroundColor:
      "rgba(15, 23, 42, 0.96)",

    borderColor:
      "rgba(148, 163, 184, 0.18)",

    borderWidth: 1,

    padding: [10, 12],

    textStyle: {
      color: "#f8fafc",
      fontSize: 12,
    },

    extraCssText:
      "border-radius: 8px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);",

    /*
     * 不手動指定 CallbackDataParams，
     * 交給 EChartsOption contextual typing。
     */
    formatter: (params) => {
      const item = Array.isArray(params)
        ? params[0]
        : params;

      if (!item) {
        return "";
      }

      const name = String(
        item.name ?? ""
      );

      const rawValue =
        Array.isArray(item.value)
          ? item.value[0]
          : item.value;

      const value = Number(
        rawValue ?? 0
      );

      const percentage =
        totalHosts.value > 0
          ? (
            (value /
              totalHosts.value) *
            100
          ).toFixed(1)
          : "0.0";

      return `
        <div style="min-width: 140px;">
          <div style="
            margin-bottom: 5px;
            color: #ffffff;
            font-weight: 700;
          ">
            ${name}
          </div>

          <div style="
            color: #cbd5e1;
            line-height: 1.6;
          ">
            主機數量

            <strong style="
              margin-left: 6px;
              color: #ffffff;
              font-size: 13px;
            ">
              ${value}
            </strong>
          </div>

          <div style="
            color: #cbd5e1;
            line-height: 1.6;
          ">
            佔比

            <strong style="
              margin-left: 6px;
              color: #ffffff;
              font-size: 13px;
            ">
              ${percentage}%
            </strong>
          </div>
        </div>
      `;
    },
  },

  legend: {
    bottom: 0,

    left: "center",

    itemWidth: 8,

    itemHeight: 8,

    itemGap: 16,

    icon: "circle",

    textStyle: {
      color: "#64748b",
      fontSize: 10,
    },
  },

  series: [
    {
      name: "主機狀態",

      type: "pie",

      center: ["50%", "43%"],

      radius: ["54%", "72%"],

      avoidLabelOverlap: true,

      padAngle: 2,

      itemStyle: {
        borderColor: "transparent",
        borderRadius: 4,
      },

      label: {
        show: false,
      },

      labelLine: {
        show: false,
      },

      emphasis: {
        scale: true,

        scaleSize: 5,

        label: {
          show: false,
        },
      },

      data:
        statusDistribution.value.map(
          (item) => ({
            name: item.name,

            value: item.value,

            itemStyle: {
              color:
                statusColorMap[
                item.status
                ] ?? "#94a3b8",
            },
          })
        ),
    },
  ],
}));
</script>

<template>
  <article class="chart-card">
    <div class="chart-header">
      <div class="chart-title-group">
        <span class="chart-eyebrow">
          HOST STATUS
        </span>

        <h3>
          主機狀態分布
        </h3>

        <p>
          查看目前所有 Agent 的連線狀態
        </p>
      </div>

      <span v-if="totalHosts > 0" class="host-count">
        {{ totalHosts }} 台
      </span>
    </div>

    <!-- 沒有主機資料 -->
    <div v-if="totalHosts === 0" class="empty-state">
      <span class="empty-state-dot" aria-hidden="true"></span>

      <span>
        目前沒有主機資料
      </span>
    </div>

    <!-- 主機狀態圖 -->
    <template v-else>
      <div class="chart-container">
        <VChart class="chart" :option="chartOption" autoresize />

        <div class="chart-center" aria-hidden="true">
          <strong :class="{
            good: onlineRate >= 90,
            warning:
              onlineRate >= 70 &&
              onlineRate < 90,
            critical: onlineRate < 70,
          }">
            {{ onlineRate }}%
          </strong>

          <span>
            ONLINE
          </span>
        </div>
      </div>

      <div class="status-summary">
        <div class="status-summary-item">
          <span class="status-dot online" aria-hidden="true"></span>

          <span>
            正常
          </span>

          <strong>
            {{ onlineHosts }}
          </strong>
        </div>

        <span class="summary-divider" aria-hidden="true">
          ·
        </span>

        <div class="status-summary-item">
          <span class="status-dot offline" aria-hidden="true"></span>

          <span>
            異常
          </span>

          <strong>
            {{ offlineHosts }}
          </strong>
        </div>

        <template v-if="unknownHosts > 0">
          <span class="summary-divider" aria-hidden="true">
            ·
          </span>

          <div class="status-summary-item">
            <span class="status-dot unknown" aria-hidden="true"></span>

            <span>
              未知
            </span>

            <strong>
              {{ unknownHosts }}
            </strong>
          </div>
        </template>
      </div>
    </template>
  </article>
</template>

<style scoped>
.chart-card {
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

.chart-card:hover {
  border-color:
    rgba(148, 163, 184, 0.28);

  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 6px 18px rgba(15, 23, 42, 0.045);
}

/* Header */

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
  margin-bottom: 8px;
}

.chart-title-group {
  min-width: 0;
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

.chart-header p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.45;
}

/* Host Count */

.host-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 8px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 999px;
  background:
    rgba(37, 99, 235, 0.05);
  color: #2563eb;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric:
    tabular-nums;
}

/* Chart */

.chart-container {
  position: relative;
  width: 100%;
  height: 270px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-center {
  position: absolute;
  top: 43%;
  left: 50%;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.chart-center strong {
  font-size: 27px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.chart-center strong.good {
  color: #16a34a;
}

.chart-center strong.warning {
  color: #d97706;
}

.chart-center strong.critical {
  color: #dc2626;
}

.chart-center span {
  margin-top: 7px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* Status Summary */

.status-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 7px;
  min-height: 28px;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10px;
  font-variant-numeric:
    tabular-nums;
}

.status-summary-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-summary-item strong {
  color: var(--text-main);
  font-weight: 700;
}

.status-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
}

.status-dot.online {
  background: #16a34a;
}

.status-dot.offline {
  background: #dc2626;
}

.status-dot.unknown {
  background: #94a3b8;
}

.summary-divider {
  color: var(--border-color);
}

/* Empty State */

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 300px;
  box-sizing: border-box;
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

/* Responsive */

@media (max-width: 600px) {
  .chart-card {
    padding: 16px;
    border-radius: 14px;
  }

  .chart-container {
    height: 260px;
  }

  .empty-state {
    height: 280px;
  }
}

/* Accessibility */

@media (prefers-reduced-motion: reduce) {
  .chart-card {
    transition: none;
  }
}
</style>
