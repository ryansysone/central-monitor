<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import BaseEChart from "./BaseEChart.vue";

const props = defineProps<{
  title: string;
  value: number | null;
}>();

const safeValue = computed(() => {
  const value = props.value ?? 0;

  return Math.min(100, Math.max(0, value));
});

const gaugeColor = computed(() => {
  if (safeValue.value >= 90) {
    return "#dc2626";
  }

  if (safeValue.value >= 80) {
    return "#f59e0b";
  }

  return "#16a34a";
});

const statusText = computed(() => {
  if (safeValue.value >= 90) {
    return "異常";
  }

  if (safeValue.value >= 80) {
    return "警告";
  }

  return "正常";
});

const option = computed<EChartsOption>(() => ({
  tooltip: {
    formatter: `${props.title}<br/>使用率：{c}%`,
  },

  series: [
    {
      name: props.title,
      type: "gauge",

      min: 0,
      max: 100,

      center: ["50%", "54%"],
      radius: "88%",

      startAngle: 210,
      endAngle: -30,

      axisLine: {
        roundCap: true,
        lineStyle: {
          width: 12,
          color: [[1, "#e8edf3"]],
        },
      },

      progress: {
        show: true,
        roundCap: true,
        width: 12,
        itemStyle: {
          color: gaugeColor.value,
          shadowBlur: 8,
          shadowColor: gaugeColor.value,
        },
      },

      pointer: {
        show: true,
        length: "48%",
        width: 4,
        itemStyle: {
          color: gaugeColor.value,
        },
      },

      anchor: {
        show: true,
        size: 8,
        itemStyle: {
          color: gaugeColor.value,
          borderColor: "#ffffff",
          borderWidth: 2,
          shadowBlur: 6,
          shadowColor: "rgba(15, 23, 42, 0.18)",
        },
      },

      axisTick: {
        show: false,
      },

      splitLine: {
        show: true,
        distance: -18,
        length: 7,
        lineStyle: {
          width: 1,
          color: "#cbd5e1",
        },
      },

      axisLabel: {
        show: false,
      },

      title: {
        show: true,
        offsetCenter: [0, "70%"],
        fontSize: 13,
        fontWeight: 500,
        color: "#64748b",
      },

      detail: {
        valueAnimation: true,
        formatter: "{value}%",
        offsetCenter: [0, "27%"],
        fontSize: 30,
        fontWeight: 700,
        color: gaugeColor.value,
      },

      data: [
        {
          value: Number(safeValue.value.toFixed(1)),
          name: props.title,
        },
      ],
    },
  ],
}));
</script>

<template>
  <div class="usage-gauge-chart">
    <BaseEChart :option="option" height="260px" />

    <div class="status-text" :style="{ color: gaugeColor }">
      {{ statusText }}
    </div>
  </div>
</template>

<style scoped>
.usage-gauge-chart {
  position: relative;
  width: 100%;
  min-width: 0;
  border-radius: 12px;
}

.status-text {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
</style>
