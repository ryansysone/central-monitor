<script setup lang="ts">
import type { LogItem } from "../types/dashboard";

defineProps<{
  items: LogItem[];
}>();

function formatTime(value: string | null | undefined): string {
  if (!value) return "--";

  const date = new Date(value);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <h2 class="panel-title">最新日誌</h2>

      <span class="record-count">
        {{ items.length }} Log(s)
      </span>
    </div>

    <table class="logs-table">
      <thead>
        <tr>
          <th>等級</th>
          <th>主機</th>
          <th>訊息</th>
          <th>時間</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td colspan="4" class="empty-cell">No log data</td>
        </tr>

        <tr v-for="item in items" :key="item.id">
          <td>
            <span :class="['log-badge', item.logLevel.toLowerCase()]">
              {{ item.logLevel }}
            </span>
          </td>
          <td>
            {{ item.agentCode }}
            <br>
            <small>{{ item.hostName }}</small>
          </td>
          <td>{{ item.message }}</td>
          <td>{{ formatTime(item.loggedAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.panel {
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.panel-title {
  margin: 0;
  font-size: 20px;
  color: var(--text-main);
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th,
.logs-table td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  vertical-align: middle;
  color: var(--text-main);
}

.logs-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.logs-table small {
  color: var(--text-muted);
}

.empty-cell {
  text-align: center;
  color: var(--text-muted);
}

.log-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.log-badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.log-badge.warn {
  background: #fef3c7;
  color: #92400e;
}

.log-badge.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.log-badge.debug {
  background: #e5e7eb;
  color: #374151;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.record-count {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
}
</style>
