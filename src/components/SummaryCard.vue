<script setup lang="ts">
import { computed } from "vue";

type SummaryTone =
  | "default"
  | "online"
  | "offline"
  | "error";

const props = defineProps<{
  title: string;
  value: string | number;
}>();

const cardClass = computed<SummaryTone>(() => {
  switch (props.title) {
    case "正常":
      return "online";

    case "異常":
      return "offline";

    case "錯誤事件":
      return "error";

    default:
      return "default";
  }
});

const iconText = computed(() => {
  switch (cardClass.value) {
    case "online":
      return "✓";

    case "offline":
      return "!";

    case "error":
      return "⚠";

    default:
      return "▣";
  }
});

const description = computed(() => {
  switch (props.title) {
    case "正常":
      return "目前在線主機";

    case "異常":
      return "目前離線主機";

    case "錯誤事件":
      return "偵測到的錯誤紀錄";

    default:
      return "納入監控的主機";
  }
});
</script>

<template>
  <article class="summary-card" :class="cardClass">
    <div class="summary-header">
      <div class="summary-icon" aria-hidden="true">
        {{ iconText }}
      </div>

      <div class="summary-copy">
        <div class="summary-title">
          {{ title }}
        </div>

        <div class="summary-description">
          {{ description }}
        </div>
      </div>
    </div>

    <div class="summary-value">
      {{ value }}
    </div>
  </article>
</template>

<style scoped>
.summary-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 132px;
  box-sizing: border-box;
  overflow: hidden;
  padding: 18px 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 22px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.summary-card::after {
  content: "";
  position: absolute;
  right: 18px;
  bottom: 0;
  left: 18px;
  height: 2px;
  border-radius: 999px 999px 0 0;
  background: #64748b;
}

.summary-card:hover {
  border-color: rgba(148, 163, 184, 0.28);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 10px 24px rgba(15, 23, 42, 0.05);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 11px;
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
  font-size: 15px;
  font-weight: 800;
}

.summary-copy {
  min-width: 0;
}

.summary-title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.summary-description {
  margin-top: 4px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-value {
  margin-top: 18px;
  color: var(--text-main);
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

/* 總主機數 */
.summary-card.default::after {
  background: #2563eb;
}

.summary-card.default .summary-icon {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

/* 正常 */
.summary-card.online::after {
  background: #22c55e;
}

.summary-card.online .summary-icon {
  background: #f0fdf4;
  color: #15803d;
}

/* 異常 */
.summary-card.offline::after {
  background: #ef4444;
}

.summary-card.offline .summary-icon {
  background: #fef2f2;
  color: #b91c1c;
}

/* 錯誤事件 */
.summary-card.error::after {
  background: #f97316;
}

.summary-card.error .summary-icon {
  background: #fff7ed;
  color: #c2410c;
}


@media (max-width: 600px) {
  .summary-card {
    min-height: 124px;
    padding: 16px 18px;
  }

  .summary-value {
    margin-top: 16px;
    font-size: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .summary-card {
    transition: none;
  }
}
</style>
