<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import { useNotificationStore } from "../stores/notification";

const notificationStore = useNotificationStore();

const isOpen = ref(false);

const alertCenterRef = ref<HTMLElement | null>(null);

const unreadCount = computed(
  () => notificationStore.items.filter((item) => !item.read).length
);

const alertLevel = computed(() => {
  const unreadItems = notificationStore.items.filter(
    (item) => !item.read
  );

  if (unreadItems.some((item) => item.type === "error")) {
    return "error";
  }

  if (unreadItems.some((item) => item.type === "warning")) {
    return "warning";
  }

  return "normal";
});

function toggleAlertCenter() {
  isOpen.value = !isOpen.value;

  if (isOpen.value) {
    notificationStore.markAllAsRead();
  }
}

function handleDocumentClick(event: MouseEvent): void {
  if (!isOpen.value) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  if (!alertCenterRef.value?.contains(target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<template>
  <div ref="alertCenterRef" class="alert-center">

    <button type="button" :class="['alert-center-button', alertLevel]" :aria-expanded="isOpen" aria-label="開啟警示中心"
      @click="toggleAlertCenter">
      警示
      <span v-if="unreadCount > 0" :class="['alert-badge', alertLevel]">
        {{ unreadCount }}
      </span>
    </button>

    <div v-if="isOpen" class="alert-panel">
      <div class="alert-panel-header">
        <h3>警示中心</h3>

        <button type="button" @click="notificationStore.clearNotifications">
          全部清除
        </button>

      </div>

      <div v-if="notificationStore.items.length === 0" class="alert-empty">
        目前沒有警示
      </div>

      <div v-else class="alert-list">
        <div v-for="item in notificationStore.items" :key="item.id"
          :class="['alert-item', item.type, { unread: !item.read }]">
          <div>
            <div class="alert-title">
              {{ item.title }}
            </div>

            <div class="alert-message">
              {{ item.message }}
            </div>

            <div class="alert-time">
              {{ new Date(item.createdAt).toLocaleString() }}
            </div>
          </div>

          <button class="alert-remove" type="button" aria-label="移除警示"
            @click="notificationStore.removeNotification(item.id)">
            ×
          </button>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-center {
  position: relative;
}

.alert-center-button {
  position: relative;
  min-height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: #7c3aed;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.alert-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  line-height: 20px;
}

.alert-badge.normal {
  background: #7c3aed;
}

.alert-badge.warning {
  background: #d97706;
}

.alert-badge.error {
  background: #dc2626;
}

.alert-panel {
  position: absolute;
  top: 46px;
  right: 0;
  z-index: 10000;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: 520px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--panel-bg);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
}

.alert-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.alert-panel-header h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
}

.alert-panel-header button {
  border: none;
  background: transparent;
  color: #dc2626;
  font-weight: 700;
  cursor: pointer;
}

.alert-empty {
  padding: 24px;
  color: var(--text-muted);
  text-align: center;
}

.alert-list {
  max-height: 460px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.alert-item.unread {
  background: rgba(37, 99, 235, 0.08);
}

.alert-title {
  margin-bottom: 4px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 800;
}

.alert-message {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.4;
}

.alert-time {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.alert-remove {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.alert-center-button.warning {
  background: #d97706;
}

.alert-center-button.error {
  background: #dc2626;
  animation: alert-pulse 1.6s ease-in-out infinite;
}

@keyframes alert-pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
  }

  50% {
    box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alert-center-button.error {
    animation: none;
  }
}

.alert-item.warning {
  border-left: 4px solid #f59e0b;
}

.alert-item.error {
  border-left: 4px solid #ef4444;
}

.alert-item.success {
  border-left: 4px solid #22c55e;
}

.alert-item.info {
  border-left: 4px solid #3b82f6;
}
</style>
