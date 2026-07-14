<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import type { ServiceHistory } from "../../types/dashboard";
import BaseEChart from "./BaseEChart.vue";

const props = defineProps<{
  history: ServiceHistory[];
}>();


const option = computed<EChartsOption>(() => {
  const databaseData: number[][] = [];
  const ftpData: number[][] = [];
  const applicationData: number[][] = [];

  props.history.forEach((item, index) => {
    if (item.databaseStatus === "UP") {
      databaseData.push([index, 2]);
    }

    if (item.ftpStatus === "UP") {
      ftpData.push([index, 1]);
    }

    if (item.applicationStatus === "UP") {
      applicationData.push([index, 0]);
    }
  });

  return {
    tooltip: {
      trigger: "item",
    },

    xAxis: {
      type: "category",
      data: props.history.map((item) =>
        new Date(item.collectedAt).toLocaleTimeString()
      ),
    },

    yAxis: {
      type: "category",
      data: ["Application", "FTP", "Database"],
    },

    series: [
      {
        name: "Database",
        type: "scatter",
        data: databaseData,
      },
      {
        name: "FTP",
        type: "scatter",
        data: ftpData,
      },
      {
        name: "Application",
        type: "scatter",
        data: applicationData,
      },
    ],
  };
});
</script>

<template>
  <BaseEChart :option="option" height="320px" />
</template>
