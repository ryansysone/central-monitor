<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import BaseEChart from "./BaseEChart.vue";

const props = defineProps<{
  title: string;
  value: number | null;
}>();

const safeValue = computed(() => props.value ?? 0);

const option = computed<EChartsOption>(() => ({
  tooltip: {
    formatter: "{a}<br/>使用率：{c}%",
  },

  series: [
    {
      name: props.title,
      type: "gauge",
      min: 0,
      max: 100,
      progress: {
        show: true,
      },
      detail: {
        valueAnimation: true,
        formatter: "{value}%",
        fontSize: 22,
      },
      data: [
        {
          value: safeValue.value,
          name: props.title,
        },
      ],
    },
  ],
}));
</script>

<template>
  <BaseEChart :option="option" height="240px" />
</template>
