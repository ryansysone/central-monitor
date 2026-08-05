<script setup lang="ts">
import type { AgentDashboardItem } from "../types/dashboard";

defineProps<{
  items: AgentDashboardItem[];
}>();

const emit = defineEmits<{
  (e: "select-agent", agentCode: string): void;
}>();

function normalizeStatus(
  value: string | null | undefined
): string {
  return value?.toUpperCase() || "UNKNOWN";
}

function getServiceLabel(
  value: string | null | undefined
): string {
  switch (normalizeStatus(value)) {
    case "UP":
      return "正常";

    case "DOWN":
      return "異常";

    default:
      return "未知";
  }
}

function getServiceClass(
  value: string | null | undefined
): string {
  switch (normalizeStatus(value)) {
    case "UP":
      return "up";

    case "DOWN":
      return "down";

    default:
      return "unknown";
  }
}

function getHostStatusLabel(
  status: string | null | undefined
): string {
  switch (normalizeStatus(status)) {
    case "ONLINE":
      return "正常";

    case "OFFLINE":
      return "異常";

    default:
      return "未知";
  }
}

function getHostStatusClass(
  status: string | null | undefined
): string {
  switch (normalizeStatus(status)) {
    case "ONLINE":
      return "online";

    case "OFFLINE":
      return "offline";

    default:
      return "unknown";
  }
}

function formatPercent(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${value.toFixed(1)}%`;
}

function getMetricLevel(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return "unknown";
  }

  if (value >= 90) {
    return "critical";
  }

  if (value >= 80) {
    return "warning";
  }

  return "normal";
}

function selectAgent(agentCode: string): void {
  emit("select-agent", agentCode);
}
</script>

<template>
  <section class="agent-panel">
    <div class="table-wrapper">
      <table class="status-table">
        <thead>
          <tr>
            <th class="host-column">主機</th>
            <th>狀態</th>
            <th class="metric-column">CPU</th>
            <th class="metric-column">Memory</th>
            <th class="metric-column">Disk</th>
            <th>Database</th>
            <th>FTP</th>
            <th>Application</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="items.length === 0">
            <td colspan="8" class="empty-cell">
              <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">
                  ◫
                </span>

                <strong>
                  目前沒有主機資料
                </strong>

                <span>
                  中央監控系統尚未收到 Agent 資訊。
                </span>
              </div>
            </td>
          </tr>

          <tr v-for="item in items" :key="item.agentCode" class="agent-row">
            <td class="host-cell">
              <button class="agent-link" type="button" :aria-label="`查看 ${item.agentCode} 主機詳細資訊`"
                @click="selectAgent(item.agentCode)">
                <span class="agent-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
                    <path
                      d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-13C4.67 16 4 15.33 4 14.5v-9Z"
                      stroke="currentColor" stroke-width="1.7" />

                    <path d="M9 20h6M12 16v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                  </svg>
                </span>

                <span class="agent-information">
                  <span class="agent-code">
                    {{ item.agentCode }}
                  </span>

                  <span class="host-name">
                    {{ item.hostName || "未提供主機名稱" }}
                  </span>
                </span>

                <span class="agent-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            </td>

            <td>
              <span :class="[
                'status-badge',
                getHostStatusClass(item.status),
              ]">
                <span class="badge-dot"></span>

                {{ getHostStatusLabel(item.status) }}
              </span>
            </td>

            <td class="metric-cell">
              <span :class="[
                'metric-value',
                getMetricLevel(item.cpuUsage),
              ]">
                {{ formatPercent(item.cpuUsage) }}
              </span>
            </td>

            <td class="metric-cell">
              <span :class="[
                'metric-value',
                getMetricLevel(item.memoryUsage),
              ]">
                {{ formatPercent(item.memoryUsage) }}
              </span>
            </td>

            <td class="metric-cell">
              <span :class="[
                'metric-value',
                getMetricLevel(item.diskUsage),
              ]">
                {{ formatPercent(item.diskUsage) }}
              </span>
            </td>

            <td>
              <span :class="[
                'service-badge',
                getServiceClass(item.databaseStatus),
              ]">
                <span class="badge-dot"></span>

                {{ getServiceLabel(item.databaseStatus) }}
              </span>
            </td>

            <td>
              <span :class="[
                'service-badge',
                getServiceClass(item.ftpStatus),
              ]">
                <span class="badge-dot"></span>

                {{ getServiceLabel(item.ftpStatus) }}
              </span>
            </td>

            <td>
              <span :class="[
                'service-badge',
                getServiceClass(item.applicationStatus),
              ]">
                <span class="badge-dot"></span>

                {{ getServiceLabel(item.applicationStatus) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.agent-panel {
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 8px 24px rgba(15, 23, 42, 0.04);
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.status-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  background: var(--panel-bg);
}

.status-table th,
.status-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  font-size: 12px;
  text-align: left;
  vertical-align: middle;
}

.status-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background:
    color-mix(in srgb,
      var(--panel-bg) 94%,
      var(--text-muted));
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.035em;
  white-space: nowrap;
}

.status-table tbody tr:last-child td {
  border-bottom: none;
}

.agent-row {
  transition:
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.agent-row:hover {
  background: rgba(148, 163, 184, 0.055);
}

.host-column {
  min-width: 230px;
}

.metric-column {
  min-width: 92px;
  text-align: right !important;
}

.host-cell {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.agent-link {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 5px 6px;
  border: none;
  border-radius: 10px;
  outline: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.agent-link:hover {
  background: rgba(59, 130, 246, 0.07);
}

.agent-link:focus-visible {
  box-shadow:
    0 0 0 2px var(--primary-color);
}

.agent-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 11px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--primary-color);
}

.agent-information {
  min-width: 0;
  margin-left: 11px;
}

.agent-code {
  display: block;
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-name {
  display: block;
  max-width: 170px;
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-arrow {
  margin-left: auto;
  padding-left: 10px;
  color: var(--text-muted);
  font-size: 19px;
  line-height: 1;
  transition:
    color 0.16s ease,
    transform 0.16s ease;
}

.agent-link:hover .agent-code,
.agent-link:hover .agent-arrow {
  color: var(--primary-color);
}

.agent-link:hover .agent-arrow {
  transform: translateX(2px);
}

.status-badge,
.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 27px;
  box-sizing: border-box;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.badge-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.status-badge.online,
.service-badge.up {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.status-badge.online .badge-dot,
.service-badge.up .badge-dot {
  background: #22c55e;
}

.status-badge.offline,
.service-badge.down {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.status-badge.offline .badge-dot,
.service-badge.down .badge-dot {
  background: #ef4444;
}

.status-badge.unknown,
.service-badge.unknown {
  border-color: rgba(148, 163, 184, 0.25);
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
}

.status-badge.unknown .badge-dot,
.service-badge.unknown .badge-dot {
  background: #94a3b8;
}

.metric-cell {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

.metric-value {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 58px;
  font-size: 12px;
  font-weight: 750;
}

.metric-value.normal {
  color: var(--text-main);
}

.metric-value.warning {
  color: #d97706;
}

.metric-value.critical {
  color: #dc2626;
}

.metric-value.unknown {
  color: var(--text-muted);
}

.empty-cell {
  padding: 0 !important;
}

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 220px;
  padding: 30px;
  color: var(--text-muted);
  text-align: center;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  margin-bottom: 13px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-muted);
  font-size: 22px;
}

.empty-state strong {
  color: var(--text-main);
  font-size: 14px;
}

.empty-state span:last-child {
  margin-top: 6px;
  font-size: 12px;
}

@media (max-width: 768px) {

  .status-table th,
  .status-table td {
    padding: 12px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {

  .agent-row,
  .agent-link,
  .agent-arrow {
    transition: none;
  }
}
</style>
