<script setup lang="ts">
import type { AgentDashboardItem } from "../types/dashboard";

defineProps<{
  items: AgentDashboardItem[];
}>();

const emit = defineEmits<{
  (e: "select-agent", agentCode: string): void;
}>();

function getServiceDisplay(value: string | null | undefined): string {
  if (!value) return "UNKNOWN";

  if (value === "UP") return "🟢 UP";
  if (value === "DOWN") return "🔴 DOWN";
  if (value === "UNKNOWN") return "UNKNOWN";

  return value;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${value.toFixed(2)}%`;
}

function getServiceClass(value: string | null | undefined) {
  if (!value) return "service-badge unknown";

  const v = value.toLowerCase();

  if (v === "up") return "service-badge up";
  if (v === "down") return "service-badge down";

  return "service-badge unknown";
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <h2 class="panel-title">主機狀態</h2>

      <span class="record-count">
        {{ items.length }} Host(s)
      </span>
    </div>

    <table class="status-table">
      <thead>
        <tr>
          <th>主機</th>
          <th>狀態</th>
          <th>CPU 使用率</th>
          <th>記憶體使用率</th>
          <th>磁碟使用率</th>
          <th>DB</th>
          <th>FTP</th>
          <th>APP</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="items.length === 0">
          <td colspan="8" class="empty-cell">
            No agent data
          </td>
        </tr>

        <tr v-for="item in items" :key="item.agentCode">
          <td>
            <button class="agent-link" @click="emit('select-agent', item.agentCode)">
              <div class="agent-code">
                {{ item.agentCode }}
              </div>

              <div class="host-name">
                {{ item.hostName }}
              </div>
            </button>
          </td>

          <td>
            <span :class="['status-badge', item.status.toLowerCase()]">
              {{ item.status === "ONLINE" ? "🟢 ONLINE" : "🔴 OFFLINE" }}
            </span>
          </td>

          <td>{{ formatPercent(item.cpuUsage) }}</td>
          <td>{{ formatPercent(item.memoryUsage) }}</td>
          <td>{{ formatPercent(item.diskUsage) }}</td>

          <td>
            <span :class="getServiceClass(item.databaseStatus)">
              {{ getServiceDisplay(item.databaseStatus) }}
            </span>
          </td>

          <td>
            <span :class="getServiceClass(item.ftpStatus)">
              {{ getServiceDisplay(item.ftpStatus) }}
            </span>
          </td>

          <td>
            <span :class="getServiceClass(item.applicationStatus)">
              {{ getServiceDisplay(item.applicationStatus) }}
            </span>
          </td>
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

.status-table {
  width: 100%;
  border-collapse: collapse;
}

.status-table th,
.status-table td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  vertical-align: middle;
  color: var(--text-main);
}

.status-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.empty-cell {
  text-align: center;
  color: var(--text-muted);
}

.agent-link {
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  padding: 0;
}

.agent-link:hover .agent-code {
  color: var(--primary-color);
  text-decoration: underline;
}

.status-badge,
.service-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-badge.online {
  background: #dcfce7;
  color: #166534;
}

.status-badge.offline {
  background: #fee2e2;
  color: #991b1b;
}

.service-badge.up {
  background: #dcfce7;
  color: #166534;
}

.service-badge.down {
  background: #fee2e2;
  color: #991b1b;
}

.service-badge.unknown {
  background: #e5e7eb;
  color: #374151;
}

.agent-code {
  font-weight: 700;
  color: var(--text-main);
}

.host-name {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
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
