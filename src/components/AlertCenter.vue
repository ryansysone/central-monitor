<script setup lang="ts">
import { computed, ref } from "vue";
import { useNotificationStore } from "../stores/notification";

const notificationStore = useNotificationStore();

const isOpen = ref(false);

const unreadCount = computed(
  () => notificationStore.items.filter((item) => !item.read).length
);

function toggleAlertCenter() {
  isOpen.value = !isOpen.value;

  if (isOpen.value) {
    notificationStore.markAllAsRead();
  }
}
</script>

<template>
  <div class="alert-center">
    <button class="alert-center-button" @click="toggleAlertCenter">
      Alerts
      <span v-if="unreadCount > 0" class="alert-badge">
        {{ unreadCount }}
      </span>
    </button>

    <div v-if="isOpen" class="alert-panel">
      <div class="alert-panel-header">
        <h3>Alert Center</h3>

        <button @click="notificationStore.clearNotifications">
          Clear
        </button>
      </div>

      <div v-if="notificationStore.items.length === 0" class="alert-empty">
        No alerts
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

          <button class="alert-remove" @click="notificationStore.removeNotification(item.id)">
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
  background: #dc2626;
  color: #ffffff;
  font-size: 12px;
  line-height: 20px;
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
</style>
