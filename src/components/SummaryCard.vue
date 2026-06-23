<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  title: string;
  value: string | number;
}>();

const cardClass = computed(() => {
  switch (props.title) {
    case "在線":
      return "online";

    case "離線":
      return "offline";

    case "異常":
      return "error";

    default:
      return "default";
  }
});
</script>

<template>
  <div class="summary-card" :class="cardClass">
    <div class="summary-title">
      {{ title }}
    </div>

    <div class="summary-value">
      {{ value }}
    </div>
  </div>
</template>

<style scoped>
.summary-card {
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-title {
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--text-muted);
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-main);
}

/* Default */
.summary-card.default {
  border-left: 5px solid #64748b;
}

/* Online */
.summary-card.online {
  border-left: 5px solid #22c55e;
}

.summary-card.online .summary-value {
  color: #15803d;
}

/* Offline */
.summary-card.offline {
  border-left: 5px solid #ef4444;
}

.summary-card.offline .summary-value {
  color: #b91c1c;
}

/* Error */
.summary-card.error {
  border-left: 5px solid #f59e0b;
}

.summary-card.error .summary-value {
  color: #b45309;
}
</style>
