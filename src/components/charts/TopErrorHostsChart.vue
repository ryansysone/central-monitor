<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import VChart from "vue-echarts";
import type { LogItem } from "../../types/dashboard";
import type { CallbackDataParams } from "echarts/types/dist/shared";

const router = useRouter();

const props = defineProps<{
  logs: LogItem[];
  topN?: number;
}>();

const topErrorHosts = computed(() => {
  const errorCountMap = new Map<
    string,
    {
      agentCode: string;
      hostName: string;
      count: number;
    }
  >();

  props.logs
    .filter((log) => log.logLevel === "ERROR")
    .forEach((log) => {
      const current = errorCountMap.get(log.agentCode);

      if (!current) {
        errorCountMap.set(log.agentCode, {
          agentCode: log.agentCode,
          hostName: log.hostName,
          count: 1,
        });

        return;
      }

      current.count += 1;
    });

  return [...errorCountMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, props.topN ?? 5);
});

function handleChartClick(params: CallbackDataParams) {
  const index = params.dataIndex;

  if (
    index == null ||
    index < 0 ||
    index >= topErrorHosts.value.length
  ) {
    return;
  }

  const host = topErrorHosts.value[index];

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
          ERROR 數量：${String(item.value)}<br/>
          點擊查看主機詳細資訊
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
    minInterval: 1,
  },

  yAxis: {
    type: "category",
    inverse: true,
    data: topErrorHosts.value.map(
      (host) => host.hostName || host.agentCode
    ),
  },

  series: [
    {
      name: "異常主機排行",
      type: "bar",
      label: {
        show: true,
        position: "right",
        formatter: (params: CallbackDataParams) => {
          const rank = params.dataIndex + 1;
          const value = String(params.value);

          return `#${rank} ${value}`;
        },
      },
      data: topErrorHosts.value.map((host) => ({
        value: host.count,
        itemStyle: {
          color:
            host.count >= 10
              ? "#dc2626"
              : host.count >= 5
                ? "#f59e0b"
                : "#2563eb",
        },
      })),
      barWidth: 18,
    },
  ],
}));
</script>

<template>
  <div class="top-error-hosts-card">
    <div class="chart-header">
      <h3>異常主機排行</h3>

      <p>依最近日誌中的 ERROR 數量統計</p>
    </div>

    <div v-if="topErrorHosts.length === 0" class="empty-state">
      目前沒有 ERROR 日誌
    </div>

    <VChart v-else class="chart" :option="chartOption" autoresize @click="handleChartClick" />
  </div>
</template>

<style scoped>
.top-error-hosts-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
}

.chart-header h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.chart-header p {
  margin: 0 0 12px;
  color: var(--text-muted);
  font-size: 12px;
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
