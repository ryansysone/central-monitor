<script setup lang="ts">
import type { LogItem } from "../types/dashboard";

defineProps<{
  items: LogItem[];
}>();

function normalizeLevel(
  value: string | null | undefined
): string {
  return value?.toUpperCase() || "UNKNOWN";
}

function getLogLevelClass(
  value: string | null | undefined
): string {
  switch (normalizeLevel(value)) {
    case "ERROR":
      return "error";

    case "WARN":
    case "WARNING":
      return "warning";

    case "INFO":
      return "info";

    case "DEBUG":
      return "debug";

    default:
      return "unknown";
  }
}

function formatTime(
  value: string | null | undefined
): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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
  <section class="logs-panel">
    <div class="table-wrapper">
      <table class="logs-table">
        <thead>
          <tr>
            <th class="level-column">等級</th>
            <th class="host-column">主機</th>
            <th>訊息</th>
            <th class="time-column">時間</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="items.length === 0">
            <td colspan="4" class="empty-cell">
              <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">
                  ≡
                </span>

                <strong>
                  目前沒有日誌資料
                </strong>

                <span>
                  中央監控系統尚未接收到日誌。
                </span>
              </div>
            </td>
          </tr>

          <tr v-for="item in items" :key="item.id" class="log-row">
            <td>
              <span :class="[
                'log-level',
                getLogLevelClass(item.logLevel),
              ]">
                {{ normalizeLevel(item.logLevel) }}
              </span>
            </td>

            <td class="host-cell">
              <span class="agent-code">
                {{ item.agentCode || "--" }}
              </span>

              <span class="host-name">
                {{ item.hostName || "未提供主機名稱" }}
              </span>
            </td>

            <td class="message-cell">
              {{ item.message || "--" }}
            </td>

            <td class="time-cell">
              {{ formatTime(item.loggedAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.logs-panel {
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

.logs-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
  background: var(--panel-bg);
}

.logs-table th,
.logs-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  font-size: 12px;
  text-align: left;
  vertical-align: middle;
}

.logs-table th {
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

.logs-table tbody tr:last-child td {
  border-bottom: none;
}

.log-row {
  transition: background-color 0.16s ease;
}

.log-row:hover {
  background: rgba(148, 163, 184, 0.055);
}

.level-column {
  width: 90px;
}

.host-column {
  min-width: 170px;
}

.time-column {
  min-width: 170px;
}

.log-level {
  display: inline;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.035em;
}

.log-level.error {
  color: #dc2626;
}

.log-level.warning {
  color: #d97706;
}

.log-level.info {
  color: #2563eb;
}

.log-level.debug,
.log-level.unknown {
  color: var(--text-muted);
}

.agent-code {
  display: block;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 750;
}

.host-name {
  display: block;
  max-width: 180px;
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-cell {
  min-width: 300px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.time-cell {
  color: var(--text-muted) !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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

  .logs-table th,
  .logs-table td {
    padding: 12px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .log-row {
    transition: none;
  }
}
</style>
