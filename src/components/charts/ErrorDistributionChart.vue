<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import type { EChartsOption } from "echarts";

import type { LogItem } from "../../types/dashboard";

const props = defineProps<{
  logs: LogItem[];
}>();

const sourceNameMap: Record<string, string> = {
  SYSTEM: "系統",
  AGENT: "Agent",
  SERVICE: "服務",
  APPLICATION: "應用程式",
  DATABASE: "資料庫",
  FTP: "FTP",
  UNKNOWN: "未知",
};

const sourceColorMap: Record<string, string> = {
  SYSTEM: "#475569",
  AGENT: "#2563eb",
  SERVICE: "#f59e0b",
  APPLICATION: "#dc2626",
  DATABASE: "#7c3aed",
  FTP: "#0891b2",
  UNKNOWN: "#94a3b8",
};

/*
 * 只統計 ERROR 等級日誌。
 *
 * 因為這個元件的用途是「異常來源分布」，
 * 所以不應把 INFO / WARNING 一起計算。
 */
const errorDistribution = computed(() => {
  const distribution = props.logs
    .filter((log) => log.logLevel === "ERROR")
    .reduce<Record<string, number>>(
      (accumulator, log) => {
        const sourceType =
          log.sourceType || "UNKNOWN";

        accumulator[sourceType] =
          (accumulator[sourceType] ?? 0) + 1;

        return accumulator;
      },
      {}
    );

  return Object.entries(distribution)
    .map(([sourceType, value]) => ({
      sourceType,

      name:
        sourceNameMap[sourceType] ??
        sourceType,

      value,
    }))
    .sort((a, b) => b.value - a.value);
});

/*
 * ERROR 總數
 */
const totalErrors = computed(() => {
  return errorDistribution.value.reduce(
    (total, item) => total + item.value,
    0
  );
});

/*
 * ERROR 最主要來源
 */
const dominantSource = computed(() => {
  return errorDistribution.value[0] ?? null;
});

/*
 * ECharts 設定
 *
 * 這裡明確指定 EChartsOption，
 * 讓 formatter 參數由 ECharts 自動推導型別。
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

    formatter: (params) => {
      /*
       * ECharts tooltip formatter
       * 在不同 trigger 情況可能收到單一資料或陣列。
       */
      const item = Array.isArray(params)
        ? params[0]
        : params;

      if (!item) {
        return "";
      }

      const name = String(
        item.name ?? ""
      );

      /*
       * Pie chart 正常情況 value 是 number，
       * 但 ECharts 型別允許其他資料型態，
       * 所以這裡安全處理。
       */
      const rawValue = Array.isArray(item.value)
        ? item.value[0]
        : item.value;

      const value = Number(
        rawValue ?? 0
      );

      const percent =
        totalErrors.value > 0
          ? (
            (value /
              totalErrors.value) *
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
            ERROR 數量

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
              ${percent}%
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
      name: "異常來源分布",

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

      data: errorDistribution.value.map(
        (item) => ({
          name: item.name,

          value: item.value,

          itemStyle: {
            color:
              sourceColorMap[
              item.sourceType
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
          ERROR SOURCE
        </span>

        <h3>
          異常來源分布
        </h3>

        <p>
          分析 ERROR 日誌的來源類型與佔比
        </p>
      </div>

      <span v-if="totalErrors > 0" class="error-count">
        {{ totalErrors }} 筆
      </span>
    </div>

    <!-- 沒有 ERROR 資料 -->
    <div v-if="totalErrors === 0" class="empty-state">
      <span class="empty-state-dot" aria-hidden="true"></span>

      <span>
        目前沒有 ERROR 日誌
      </span>
    </div>

    <!-- ERROR 分布圖 -->
    <template v-else>
      <div class="chart-container">
        <VChart class="chart" :option="chartOption" autoresize />

        <div class="chart-center" aria-hidden="true">
          <strong>
            {{ totalErrors }}
          </strong>

          <span>
            ERROR
          </span>
        </div>
      </div>

      <div v-if="dominantSource" class="distribution-summary">
        <span>
          主要來源
        </span>

        <strong>
          {{ dominantSource.name }}
        </strong>

        <span class="summary-divider" aria-hidden="true">
          ·
        </span>

        <span>
          {{ dominantSource.value }} 筆
        </span>
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

/* ERROR Count */

.error-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 8px;
  border: 1px solid rgba(220, 38, 38, 0.16);
  border-radius: 999px;
  background:
    rgba(220, 38, 38, 0.05);
  color: #dc2626;
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
  color: var(--text-main);
  font-size: 28px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.chart-center span {
  margin-top: 7px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* Bottom Summary */

.distribution-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 28px;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10px;
  font-variant-numeric:
    tabular-nums;
}

.distribution-summary strong {
  color: var(--text-main);
  font-weight: 700;
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
  background: #22c55e;
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
