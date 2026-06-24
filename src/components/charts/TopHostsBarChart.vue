<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import VChart from "vue-echarts";
import type { AgentDashboardItem } from "../../types/dashboard";
import type { CallbackDataParams } from "echarts/types/dist/shared";

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

function handleChartClick(params: CallbackDataParams) {
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

const chartOption = computed(() => ({
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
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
        <div>
          <strong>${String(item.name)}</strong><br/>
          Usage: ${String(item.value)}%<br/>
          Click to view host detail
        </div>
      `;
    },
  },

  grid: {
    left: 90,
    right: 24,
    top: 24,
    bottom: 24,
  },

  xAxis: {
    type: "value",
    max: 100,
    axisLabel: {
      formatter: "{value}%",
    },
  },

  yAxis: {
    type: "category",
    inverse: true,
    data: topHosts.value.map(
      (host) => host.hostName || host.agentCode
    ),
  },

  series: [
    {
      name: props.title,
      type: "bar",

      animationDuration: 500,
      animationDurationUpdate: 500,
      animationEasing: "cubicOut",
      animationEasingUpdate: "cubicOut",

      label: {
        show: true,
        position: "right",
        formatter: (params: CallbackDataParams) => {
          const rank = params.dataIndex + 1;
          const value = String(params.value);

          return `#${rank} ${value}%`;
        },
      },

      data: topHosts.value.map((host) => {
        const value = Number(
          host[props.metricKey] ?? 0
        );

        return {
          value,

          itemStyle: {
            color:
              value >= 90
                ? "#dc2626"
                : value >= 75
                  ? "#f59e0b"
                  : "#2563eb",
          },
        };
      }),

      barWidth: 18,
    },
  ],
}));
</script>

<template>
  <div class="top-hosts-card">
    <div class="chart-header">
      <h3>{{ title }}</h3>

      <div class="threshold-legend">
        <span>
          <i class="legend-dot normal"></i>
          Normal &lt; 75%
        </span>

        <span>
          <i class="legend-dot warning"></i>
          Warning ≥ 75%
        </span>

        <span>
          <i class="legend-dot critical"></i>
          Critical ≥ 90%
        </span>
      </div>
    </div>

    <div v-if="topHosts.length === 0" class="empty-state">
      {{ emptyText ?? "No data" }}
    </div>

    <VChart v-else class="chart" :option="chartOption" autoresize @click="handleChartClick" />
  </div>
</template>

<style scoped>
.top-hosts-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
}

.chart-header h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.threshold-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.legend-dot.normal {
  background: #2563eb;
}

.legend-dot.warning {
  background: #f59e0b;
}

.legend-dot.critical {
  background: #dc2626;
}

.chart {
  width: 100%;
  height: 320px;
  cursor: pointer;
}

.empty-state {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
