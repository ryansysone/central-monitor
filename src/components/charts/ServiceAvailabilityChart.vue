<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import BaseEChart from "./BaseEChart.vue";

const props = defineProps<{
  database: number;
  ftp: number;
  application: number;
}>();

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: "axis",
  },

  xAxis: {
    type: "category",
    data: ["Database", "FTP", "應用程式"],
  },

  yAxis: {
    type: "value",
    min: 0,
    max: 100,
    axisLabel: {
      formatter: "{value}%",
    },
  },

  series: [
    {
      name: "可用率",
      type: "bar",
      data: [
        props.database,
        props.ftp,
        props.application,
      ],
    },
  ],
}));
</script>

<template>
  <BaseEChart :option="option" height="320px" />
</template>
