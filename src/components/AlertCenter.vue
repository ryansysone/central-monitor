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

const alertCenterRef =
  ref<HTMLElement | null>(null);

/*
 * 未讀警示數量
 */
const unreadCount = computed(() => {
  return notificationStore.items.filter(
    (item) => !item.read
  ).length;
});

/*
 * 目前警示中心最高嚴重程度
 *
 * 優先順序：
 * error > warning > normal
 *
 * 只判斷「未讀」通知，
 * 已讀通知不應持續讓 Header 按鈕維持警告狀態。
 */
const alertLevel = computed(() => {
  const unreadItems =
    notificationStore.items.filter(
      (item) => !item.read
    );

  if (
    unreadItems.some(
      (item) => item.type === "error"
    )
  ) {
    return "error";
  }

  if (
    unreadItems.some(
      (item) => item.type === "warning"
    )
  ) {
    return "warning";
  }

  return "normal";
});

/*
 * 開啟 / 關閉警示中心。
 *
 * 開啟後代表使用者已查看通知，
 * 因此將目前通知標記為已讀。
 */
function toggleAlertCenter(): void {
  isOpen.value = !isOpen.value;

  if (isOpen.value) {
    notificationStore.markAllAsRead();
  }
}

/*
 * 關閉警示中心
 */
function closeAlertCenter(): void {
  isOpen.value = false;
}

/*
 * 點擊元件外部時自動關閉。
 */
function handleDocumentClick(
  event: MouseEvent
): void {
  if (!isOpen.value) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Node)) {
    return;
  }

  if (
    !alertCenterRef.value?.contains(target)
  ) {
    closeAlertCenter();
  }
}

/*
 * Escape 關閉警示中心。
 */
function handleDocumentKeydown(
  event: KeyboardEvent
): void {
  if (
    event.key === "Escape" &&
    isOpen.value
  ) {
    closeAlertCenter();
  }
}

/*
 * 格式化通知時間
 */
function formatNotificationTime(
  createdAt: string | Date
): string {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("zh-TW");
}

/*
 * Notification Type 中文名稱
 */
function getNotificationTypeLabel(
  type: string
): string {
  switch (type) {
    case "error":
      return "嚴重";

    case "warning":
      return "警告";

    case "success":
      return "正常";

    case "info":
      return "資訊";

    default:
      return "通知";
  }
}

onMounted(() => {
  document.addEventListener(
    "click",
    handleDocumentClick
  );

  document.addEventListener(
    "keydown",
    handleDocumentKeydown
  );
});

onUnmounted(() => {
  document.removeEventListener(
    "click",
    handleDocumentClick
  );

  document.removeEventListener(
    "keydown",
    handleDocumentKeydown
  );
});
</script>

<template>
  <div ref="alertCenterRef" class="alert-center">
    <!-- Alert Center Button -->
    <button type="button" :class="[
      'alert-center-button',
      alertLevel,
      {
        active: isOpen,
      },
    ]" :aria-expanded="isOpen" aria-haspopup="true" aria-label="開啟警示中心" @click="toggleAlertCenter">
      <span class="alert-button-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" stroke-width="1.7"
            stroke-linecap="round" stroke-linejoin="round" />

          <path d="M10 21h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
      </span>

      <span class="alert-button-label">
        警示
      </span>

      <span v-if="unreadCount > 0" :class="[
        'alert-badge',
        alertLevel,
      ]" :aria-label="`${unreadCount} 筆未讀警示`">
        {{
          unreadCount > 99
            ? "99+"
            : unreadCount
        }}
      </span>
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="alert-panel" role="dialog" aria-label="警示中心">
      <!-- Header -->
      <div class="alert-panel-header">
        <div class="alert-panel-title-group">
          <div class="alert-panel-title-row">
            <h3>
              警示中心
            </h3>

            <span v-if="
              notificationStore.items.length > 0
            " class="notification-count">
              {{
                notificationStore.items.length
              }}
            </span>
          </div>

          <p>
            系統與主機即時通知
          </p>
        </div>

        <button v-if="
          notificationStore.items.length > 0
        " type="button" class="clear-all-button" @click="
          notificationStore.clearNotifications
        ">
          全部清除
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="
        notificationStore.items.length === 0
      " class="alert-empty">
        <div class="empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="23" height="23" fill="none">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round" />

            <path d="M10 21h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </div>

        <strong>
          目前沒有警示
        </strong>

        <p>
          系統目前沒有新的通知。
        </p>
      </div>

      <!-- Notification List -->
      <div v-else class="alert-list">
        <article v-for="
item in notificationStore.items
          " :key="item.id" :class="[
            'alert-item',
            item.type,
            {
              unread: !item.read,
            },
          ]">
          <!-- Severity Indicator -->
          <div :class="[
            'alert-type-icon',
            item.type,
          ]" aria-hidden="true">
            <span v-if="item.type === 'error'">
              !
            </span>

            <span v-else-if="
              item.type === 'warning'
            ">
              !
            </span>

            <span v-else-if="
              item.type === 'success'
            ">
              ✓
            </span>

            <span v-else>
              i
            </span>
          </div>

          <!-- Content -->
          <div class="alert-content">
            <div class="alert-item-header">
              <span :class="[
                'alert-type-label',
                item.type,
              ]">
                {{
                  getNotificationTypeLabel(
                    item.type
                  )
                }}
              </span>

              <span v-if="!item.read" class="unread-dot" aria-label="未讀"></span>
            </div>

            <div class="alert-title">
              {{ item.title }}
            </div>

            <div class="alert-message">
              {{ item.message }}
            </div>

            <div class="alert-time">
              {{
                formatNotificationTime(
                  item.createdAt
                )
              }}
            </div>
          </div>

          <!-- Remove -->
          <button class="alert-remove" type="button" aria-label="移除警示" title="移除警示" @click="
            notificationStore.removeNotification(
              item.id
            )
            ">
            ×
          </button>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-center {
  position: relative;
  z-index: 10001;
}

/* =========================
   Alert Button
   ========================= */

.alert-center-button {
  position: relative;
  z-index: 1;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  min-height: 38px;
  box-sizing: border-box;
  padding: 0 14px;

  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 999px;
  outline: none;

  background:
    rgba(124, 58, 237, 0.08);

  color: #7c3aed;

  font-size: 14px;
  font-weight: 750;

  cursor: pointer;

  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.alert-center-button:hover {
  border-color:
    rgba(124, 58, 237, 0.3);

  background:
    rgba(124, 58, 237, 0.12);

  transform: translateY(-1px);
}

.alert-center-button:focus-visible {
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.12);
}

.alert-center-button.active {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

.alert-button-icon {
  position: relative;
  z-index: 2;

  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.alert-button-label {
  position: relative;
  z-index: 2;

  line-height: 1;
}

/* =========================
   Warning
   ========================= */

.alert-center-button.warning {
  border-color:
    rgba(217, 119, 6, 0.22);

  background:
    rgba(245, 158, 11, 0.09);

  color: #b45309;
}

.alert-center-button.warning:hover {
  border-color:
    rgba(217, 119, 6, 0.34);

  background:
    rgba(245, 158, 11, 0.14);
}

.alert-center-button.warning.active {
  border-color: #d97706;
  background: #d97706;
  color: #ffffff;
}

/* =========================
   Error
   Premium Aurora Radiance
   ========================= */

.alert-center-button.error {
  border-color:
    rgba(251, 113, 133, 0.55);

  background:
    linear-gradient(135deg,
      rgba(255, 241, 242, 0.22) 0%,
      rgba(254, 202, 202, 0.18) 22%,
      rgba(248, 113, 113, 0.16) 48%,
      rgba(225, 29, 72, 0.12) 72%,
      rgba(190, 24, 93, 0.08) 100%);

  color: #e11d48;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(225, 29, 72, 0.06),
    0 0 5px rgba(255, 228, 230, 0.7),
    0 0 12px rgba(251, 113, 133, 0.3),
    0 0 25px rgba(244, 63, 94, 0.14);

  animation:
    alert-core-radiance 2.8s ease-in-out infinite;
}

/*
 * 第一層：
 * 主要 Aurora 光暈。
 *
 * 使用多個 radial-gradient，
 * 刻意避免形成規則的單一橢圓。
 */
.alert-center-button.error::before {
  content: "";

  position: absolute;

  top: 50%;
  left: 50%;

  z-index: -1;

  width: calc(100% + 76px);
  height: calc(100% + 62px);

  border-radius:
    48% 52% 55% 45% / 55% 43% 57% 45%;

  background:
    radial-gradient(ellipse at 30% 42%,
      rgba(255, 241, 242, 0.72) 0%,
      rgba(254, 202, 202, 0.34) 18%,
      transparent 48%),
    radial-gradient(ellipse at 68% 40%,
      rgba(251, 113, 133, 0.42) 0%,
      rgba(244, 63, 94, 0.2) 30%,
      transparent 62%),
    radial-gradient(ellipse at 50% 67%,
      rgba(225, 29, 72, 0.25) 0%,
      rgba(190, 24, 93, 0.11) 38%,
      transparent 68%),
    radial-gradient(ellipse at center,
      rgba(248, 113, 113, 0.28) 0%,
      rgba(244, 63, 94, 0.16) 38%,
      rgba(219, 39, 119, 0.07) 62%,
      transparent 80%);

  filter: blur(9px);

  opacity: 0.72;

  transform:
    translate(-50%, -50%) scale(0.88) rotate(-2deg);

  pointer-events: none;

  animation:
    alert-aurora-inner 2.8s ease-in-out infinite;
}

/*
 * 第二層：
 * 大範圍、不對稱的外層 Radiance。
 *
 * conic-gradient 讓色彩分布不會
 * 像一般 radial glow 那麼規則。
 */
.alert-center-button.error::after {
  content: "";

  position: absolute;

  top: 50%;
  left: 50%;

  z-index: -2;

  width: calc(100% + 118px);
  height: calc(100% + 94px);

  border-radius:
    53% 47% 44% 56% / 46% 58% 42% 54%;

  background:
    conic-gradient(from 210deg at 50% 50%,
      transparent 0deg,
      rgba(251, 113, 133, 0.06) 34deg,
      rgba(244, 63, 94, 0.18) 82deg,
      rgba(225, 29, 72, 0.11) 126deg,
      rgba(219, 39, 119, 0.12) 174deg,
      rgba(190, 24, 93, 0.07) 218deg,
      rgba(248, 113, 113, 0.15) 274deg,
      rgba(254, 202, 202, 0.1) 322deg,
      transparent 360deg);

  filter: blur(18px);

  opacity: 0.48;

  transform:
    translate(-50%, -50%) scale(0.84) rotate(0deg);

  pointer-events: none;

  animation:
    alert-aurora-outer 7s linear infinite;
}

/* =========================
   Error Hover
   ========================= */

.alert-center-button.error:hover {
  border-color:
    rgba(251, 113, 133, 0.72);

  background:
    linear-gradient(135deg,
      rgba(255, 241, 242, 0.3),
      rgba(254, 202, 202, 0.21),
      rgba(248, 113, 113, 0.18),
      rgba(225, 29, 72, 0.13));

  color: #be123c;
}

/* =========================
   Error Active
   ========================= */

.alert-center-button.error.active {
  border-color: #e11d48;

  background:
    linear-gradient(135deg,
      #ef4444,
      #e11d48);

  color: #ffffff;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 4px 14px rgba(225, 29, 72, 0.18);

  animation: none;
}

.alert-center-button.error.active::before,
.alert-center-button.error.active::after {
  opacity: 0;
  animation: none;
}

/* =========================
   Premium Glow Animations
   ========================= */

@keyframes alert-core-radiance {

  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.42),
      inset 0 -1px 0 rgba(225, 29, 72, 0.05),
      0 0 4px rgba(255, 228, 230, 0.5),
      0 0 10px rgba(251, 113, 133, 0.22),
      0 0 22px rgba(244, 63, 94, 0.1);

    transform: scale(1);
  }

  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.68),
      inset 0 -1px 0 rgba(225, 29, 72, 0.08),
      0 0 6px rgba(255, 241, 242, 0.82),
      0 0 15px rgba(254, 202, 202, 0.48),
      0 0 30px rgba(248, 113, 113, 0.28),
      0 0 48px rgba(244, 63, 94, 0.14);

    transform: scale(1.025);
  }
}

@keyframes alert-aurora-inner {

  0%,
  100% {
    opacity: 0.5;

    border-radius:
      48% 52% 55% 45% / 55% 43% 57% 45%;

    transform:
      translate(-50%, -50%) scale(0.82) rotate(-3deg);
  }

  35% {
    opacity: 0.82;

    border-radius:
      54% 46% 49% 51% / 47% 56% 44% 53%;

    transform:
      translate(-50%, -50%) scale(1.03) rotate(1deg);
  }

  65% {
    opacity: 1;

    border-radius:
      46% 54% 52% 48% / 57% 45% 55% 43%;

    transform:
      translate(-50%, -50%) scale(1.15) rotate(3deg);
  }
}

@keyframes alert-aurora-outer {
  0% {
    opacity: 0.3;

    transform:
      translate(-50%, -50%) scale(0.86) rotate(0deg);
  }

  25% {
    opacity: 0.5;

    transform:
      translate(-50%, -50%) scale(1) rotate(4deg);
  }

  50% {
    opacity: 0.7;

    transform:
      translate(-50%, -50%) scale(1.12) rotate(8deg);
  }

  75% {
    opacity: 0.48;

    transform:
      translate(-50%, -50%) scale(1) rotate(12deg);
  }

  100% {
    opacity: 0.3;

    transform:
      translate(-50%, -50%) scale(0.86) rotate(16deg);
  }
}

/* =========================
   Unread Badge
   ========================= */

.alert-badge {
  position: absolute;
  top: -7px;
  right: -8px;
  z-index: 4;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-width: 21px;
  height: 21px;

  box-sizing: border-box;
  padding: 0 5px;

  border: 2px solid var(--panel-bg);
  border-radius: 999px;

  color: #ffffff;

  font-size: 11px;
  font-weight: 800;
  line-height: 1;

  font-variant-numeric:
    tabular-nums;
}

.alert-badge.normal {
  background: #7c3aed;
}

.alert-badge.warning {
  background: #d97706;
}

.alert-badge.error {
  background:
    linear-gradient(135deg,
      #ef4444,
      #e11d48);

  box-shadow:
    0 0 8px rgba(244, 63, 94, 0.32);
}

/* =========================
   Alert Panel
   ========================= */

.alert-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;

  z-index: 10000;

  width: 410px;
  max-width: calc(100vw - 32px);

  overflow: hidden;

  border:
    1px solid rgba(148, 163, 184, 0.2);

  border-radius: 16px;

  background: var(--panel-bg);

  box-shadow:
    0 4px 12px rgba(15, 23, 42, 0.08),
    0 20px 48px rgba(15, 23, 42, 0.16);
}

/* =========================
   Panel Header
   ========================= */

.alert-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  padding: 17px 18px 15px;

  border-bottom:
    1px solid var(--border-color);
}

.alert-panel-title-group {
  min-width: 0;
}

.alert-panel-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-panel-header h3 {
  margin: 0;

  color: var(--text-main);

  font-size: 17px;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.alert-panel-header p {
  margin: 5px 0 0;

  color: var(--text-muted);

  font-size: 13px;
  line-height: 1.5;
}

.notification-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-width: 23px;
  height: 23px;

  box-sizing: border-box;
  padding: 0 7px;

  border-radius: 999px;

  background:
    rgba(148, 163, 184, 0.12);

  color: var(--text-muted);

  font-size: 12px;
  font-weight: 750;

  font-variant-numeric:
    tabular-nums;
}

.clear-all-button {
  flex-shrink: 0;

  padding: 4px 0;

  border: none;
  outline: none;

  background: transparent;

  color: #dc2626;

  font-size: 12px;
  font-weight: 700;

  cursor: pointer;

  transition:
    opacity 0.18s ease;
}

.clear-all-button:hover {
  opacity: 0.72;
}

.clear-all-button:focus-visible {
  border-radius: 4px;

  box-shadow:
    0 0 0 3px rgba(220, 38, 38, 0.1);
}

/* =========================
   Notification List
   ========================= */

.alert-list {
  max-height: 450px;
  overflow-y: auto;

  overscroll-behavior: contain;
}

.alert-list::-webkit-scrollbar {
  width: 6px;
}

.alert-list::-webkit-scrollbar-track {
  background: transparent;
}

.alert-list::-webkit-scrollbar-thumb {
  border-radius: 999px;

  background:
    rgba(148, 163, 184, 0.35);
}

.alert-list::-webkit-scrollbar-thumb:hover {
  background:
    rgba(148, 163, 184, 0.5);
}

/* =========================
   Notification Item
   ========================= */

.alert-item {
  position: relative;

  display: flex;
  align-items: flex-start;
  gap: 12px;

  padding: 15px 14px 15px 16px;

  border-bottom:
    1px solid var(--border-color);

  background: var(--panel-bg);

  transition:
    background-color 0.18s ease;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-item:hover {
  background:
    rgba(148, 163, 184, 0.045);
}

.alert-item.unread {
  background:
    rgba(37, 99, 235, 0.035);
}

/* =========================
   Severity Left Border
   ========================= */

.alert-item::before {
  content: "";

  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;

  width: 3px;

  background: #94a3b8;
}

.alert-item.error::before {
  background: #ef4444;
}

.alert-item.warning::before {
  background: #f59e0b;
}

.alert-item.success::before {
  background: #22c55e;
}

.alert-item.info::before {
  background: #3b82f6;
}

/* =========================
   Type Icon
   ========================= */

.alert-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;

  flex-shrink: 0;

  box-sizing: border-box;

  border-radius: 9px;

  font-size: 13px;
  font-weight: 800;
}

.alert-type-icon.error {
  background:
    rgba(220, 38, 38, 0.09);

  color: #dc2626;
}

.alert-type-icon.warning {
  background:
    rgba(245, 158, 11, 0.11);

  color: #b45309;
}

.alert-type-icon.success {
  background:
    rgba(34, 197, 94, 0.09);

  color: #15803d;
}

.alert-type-icon.info {
  background:
    rgba(59, 130, 246, 0.09);

  color: #2563eb;
}

/* =========================
   Notification Content
   ========================= */

.alert-content {
  min-width: 0;
  flex: 1;
}

.alert-item-header {
  display: flex;
  align-items: center;
  gap: 7px;

  min-height: 17px;

  margin-bottom: 4px;
}

.alert-type-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.alert-type-label.error {
  color: #dc2626;
}

.alert-type-label.warning {
  color: #b45309;
}

.alert-type-label.success {
  color: #15803d;
}

.alert-type-label.info {
  color: #2563eb;
}

.unread-dot {
  width: 6px;
  height: 6px;

  flex-shrink: 0;

  border-radius: 50%;

  background: var(--primary-color);
}

.alert-title {
  overflow-wrap: anywhere;

  color: var(--text-main);

  font-size: 14px;
  font-weight: 750;
  line-height: 1.45;
}

.alert-message {
  margin-top: 4px;

  overflow-wrap: anywhere;

  color: var(--text-muted);

  font-size: 13px;
  line-height: 1.55;
}

.alert-time {
  margin-top: 7px;

  color: var(--text-muted);

  font-size: 12px;
  line-height: 1.4;

  font-variant-numeric:
    tabular-nums;
}

/* =========================
   Remove Button
   ========================= */

.alert-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 28px;
  height: 28px;

  flex-shrink: 0;

  padding: 0;

  border: none;
  border-radius: 7px;
  outline: none;

  background: transparent;

  color: var(--text-muted);

  font-size: 19px;
  line-height: 1;

  cursor: pointer;

  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.alert-remove:hover {
  background:
    rgba(220, 38, 38, 0.07);

  color: #dc2626;
}

.alert-remove:focus-visible {
  box-shadow:
    0 0 0 3px rgba(220, 38, 38, 0.1);
}

/* =========================
   Empty State
   ========================= */

.alert-empty {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;

  min-height: 220px;

  box-sizing: border-box;
  padding: 30px 20px;

  color: var(--text-muted);

  text-align: center;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 48px;
  height: 48px;

  margin-bottom: 12px;

  border-radius: 14px;

  background:
    rgba(148, 163, 184, 0.1);

  color: var(--text-muted);
}

.alert-empty strong {
  color: var(--text-main);

  font-size: 15px;
  font-weight: 700;
}

.alert-empty p {
  margin: 6px 0 0;

  color: var(--text-muted);

  font-size: 13px;
  line-height: 1.5;
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 600px) {
  .alert-panel {
    width:
      min(380px,
        calc(100vw - 24px));

    max-width:
      calc(100vw - 24px);

    border-radius: 14px;
  }

  .alert-panel-header {
    padding: 15px;
  }

  .alert-list {
    max-height: 410px;
  }

  .alert-item {
    padding:
      14px 12px 14px 14px;
  }

  .alert-button-label {
    display: none;
  }

  .alert-center-button {
    width: 38px;
    padding: 0;
  }

  /*
   * 手機縮小 Aurora 範圍，
   * 避免影響 Header 其他按鈕。
   */
  .alert-center-button.error::before {
    width: calc(100% + 52px);
    height: calc(100% + 52px);
  }

  .alert-center-button.error::after {
    width: calc(100% + 82px);
    height: calc(100% + 82px);
  }
}

/* =========================
   Accessibility
   ========================= */

@media (prefers-reduced-motion: reduce) {

  .alert-center-button,
  .alert-item,
  .alert-remove {
    transition: none;
  }

  .alert-center-button.error {
    animation: none;
  }

  .alert-center-button.error::before,
  .alert-center-button.error::after {
    animation: none;
  }

  .alert-center-button.error::before {
    opacity: 0.68;

    transform:
      translate(-50%, -50%) scale(1);
  }

  .alert-center-button.error::after {
    opacity: 0.38;

    transform:
      translate(-50%, -50%) scale(1);
  }
}
</style>
