<script setup lang="ts">
import { useNotificationStore } from "../stores/notification";

const notificationStore = useNotificationStore();
</script>

<template>
  <div v-if="notificationStore.items.length" class="toast-container">
    <div v-for="item in notificationStore.items.slice(0, 3)" :key="item.id" :class="['toast-item', item.type]">
      <div>
        <div class="toast-title">
          {{ item.title }}
        </div>

        <div class="toast-message">
          {{ item.message }}
        </div>
      </div>

      <button class="toast-close" @click="notificationStore.removeNotification(item.id)">
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 360px;
  max-width: calc(100vw - 48px);
}

.toast-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
}

.toast-item.info {
  border-color: #bfdbfe;
}

.toast-item.success {
  border-color: #bbf7d0;
}

.toast-item.warning {
  border-color: #fed7aa;
}

.toast-item.error {
  border-color: #fecaca;
}

.toast-title {
  margin-bottom: 4px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 800;
}

.toast-message {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.4;
}

.toast-close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
</style>
