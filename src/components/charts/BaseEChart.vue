<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import type { EChartsOption } from "echarts";

const props = defineProps<{
  option: EChartsOption;
  height?: string;
}>();

const chartStyle = computed(() => ({
  width: "100%",
  height: props.height ?? "320px",
}));
</script>

<template>
  <VChart :option="option" autoresize :style="chartStyle" />
</template>
