<script setup lang="ts">
import { computed, ref } from "vue";

/*
 * 支援的自動重新整理秒數。
 *
 * 這裡與目前系統既有選項保持一致：
 * 10 秒 / 30 秒 / 1 分鐘 / 5 分鐘
 */
const refreshOptions = [
  {
    value: 10,
    label: "10 秒",
    description: "適合需要較即時監控的情境",
  },
  {
    value: 30,
    label: "30 秒",
    description: "建議設定，兼顧即時性與請求頻率",
  },
  {
    value: 60,
    label: "1 分鐘",
    description: "降低更新頻率與系統請求量",
  },
  {
    value: 300,
    label: "5 分鐘",
    description: "適合不需要頻繁更新的監控環境",
  },
] as const;

type RefreshSeconds =
  (typeof refreshOptions)[number]["value"];

/*
 * 目前主題狀態。
 *
 * 實際 Theme class 仍然由
 * document.documentElement 控制。
 */
const isDarkMode = ref(
  document.documentElement.classList.contains("dark")
);

/*
 * 從 localStorage 取得自動重新整理設定。
 *
 * 若 localStorage 中的值不存在或不是允許值，
 * 預設使用 30 秒。
 */
function getInitialAutoRefreshSeconds(): RefreshSeconds {
  const storedValue = Number(
    localStorage.getItem("autoRefreshSeconds")
  );

  const isValid = refreshOptions.some(
    (option) => option.value === storedValue
  );

  if (isValid) {
    return storedValue as RefreshSeconds;
  }

  return 30;
}

const autoRefreshSeconds = ref<RefreshSeconds>(
  getInitialAutoRefreshSeconds()
);

/*
 * 目前選擇的重新整理設定資訊。
 */
const selectedRefreshOption = computed(() => {
  return (
    refreshOptions.find(
      (option) =>
        option.value === autoRefreshSeconds.value
    ) ?? refreshOptions[1]
  );
});

/*
 * 目前主題顯示文字。
 */
const currentThemeLabel = computed(() => {
  return isDarkMode.value
    ? "深色模式"
    : "淺色模式";
});

/*
 * 切換淺色 / 深色模式。
 *
 * 同時：
 * 1. 更新 HTML root class
 * 2. 寫入 localStorage
 */
function toggleDarkMode(): void {
  isDarkMode.value = !isDarkMode.value;

  document.documentElement.classList.toggle(
    "dark",
    isDarkMode.value
  );

  localStorage.setItem(
    "theme",
    isDarkMode.value
      ? "dark"
      : "light"
  );
}

/*
 * 儲存自動重新整理間隔。
 */
function updateAutoRefreshSeconds(): void {
  localStorage.setItem(
    "autoRefreshSeconds",
    String(autoRefreshSeconds.value)
  );
}
</script>

<template>
  <div class="settings-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-main">
        <div class="header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" stroke="currentColor" stroke-width="1.7" />

            <path
              d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.09a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <div class="header-copy">
          <h1>
            系統設定
          </h1>

          <p>
            管理監控系統的介面與自動更新設定
          </p>
        </div>
      </div>
    </header>

    <!-- Settings -->
    <section class="settings-section">
      <div class="section-header">
        <div>
          <h2>
            一般設定
          </h2>

          <p>
            調整系統介面與資料更新方式
          </p>
        </div>
      </div>

      <div class="settings-list">
        <!-- Theme -->
        <article class="setting-item">
          <div class="setting-main">
            <div class="setting-icon theme-icon" aria-hidden="true">
              <!-- Moon -->
              <svg v-if="!isDarkMode" viewBox="0 0 24 24" width="21" height="21" fill="none">
                <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" stroke="currentColor"
                  stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>

              <!-- Sun -->
              <svg v-else viewBox="0 0 24 24" width="21" height="21" fill="none">
                <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7" />

                <path
                  d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </div>

            <div class="setting-copy">
              <div class="setting-title-row">
                <h3>
                  主題模式
                </h3>

                <span class="setting-status">
                  {{ currentThemeLabel }}
                </span>
              </div>

              <p>
                切換系統的淺色或深色介面。
              </p>
            </div>
          </div>

          <div class="setting-control">
            <button type="button" class="theme-switch" :class="{
              active: isDarkMode,
            }" role="switch" :aria-checked="isDarkMode" :aria-label="isDarkMode
              ? '切換為淺色模式'
              : '切換為深色模式'
              " @click="toggleDarkMode">
              <span class="switch-track">
                <span class="switch-thumb"></span>
              </span>

              <span class="switch-label">
                {{
                  isDarkMode
                    ? "深色"
                    : "淺色"
                }}
              </span>
            </button>
          </div>
        </article>

        <!-- Auto Refresh -->
        <article class="setting-item">
          <div class="setting-main">
            <div class="setting-icon refresh-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
                <path d="M20 6v5h-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
                  stroke-linejoin="round" />

                <path d="M4 18v-5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
                  stroke-linejoin="round" />

                <path d="M6.1 9A7 7 0 0 1 18.8 6.8L20 11M4 13l1.2 4.2A7 7 0 0 0 17.9 15" stroke="currentColor"
                  stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <div class="setting-copy">
              <div class="setting-title-row">
                <h3>
                  自動重新整理
                </h3>

                <span class="setting-status">
                  每
                  {{ selectedRefreshOption.label }}
                </span>
              </div>

              <p>
                設定儀表板自動取得最新監控資料的時間間隔。
              </p>

              <span class="setting-description">
                {{
                  selectedRefreshOption.description
                }}
              </span>
            </div>
          </div>

          <div class="setting-control">
            <label class="sr-only" for="auto-refresh-select">
              自動重新整理時間
            </label>

            <select id="auto-refresh-select" v-model="autoRefreshSeconds" class="setting-select"
              @change="updateAutoRefreshSeconds">
              <option v-for="option in refreshOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </article>
      </div>
    </section>

    <!-- Information -->
    <section class="settings-info">
      <div class="info-icon" aria-hidden="true">
        i
      </div>

      <div>
        <strong>
          設定會儲存在目前瀏覽器
        </strong>

        <p>
          主題模式與自動重新整理設定會保存在瀏覽器中，
          下次開啟系統時會繼續使用目前設定。
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-page {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  color: var(--text-main);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

/* =========================
   Page Header
   ========================= */

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding: 22px 24px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 10px 30px rgba(15, 23, 42, 0.05);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 16px;
  background:
    linear-gradient(145deg,
      rgba(124, 58, 237, 0.14),
      rgba(124, 58, 237, 0.05));
  color: #7c3aed;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 8px 20px rgba(124, 58, 237, 0.08);
}

.header-copy {
  min-width: 0;
}

.header-copy h1 {
  margin: 0;
  color: var(--text-main);
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.header-copy p {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.5;
}

/* =========================
   Settings Section
   ========================= */

.settings-section {
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 20px;
  border-bottom: 1px solid var(--border-color);
}

.section-header h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.4;
}

.section-header p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

/* =========================
   Setting Item
   ========================= */

.settings-list {
  width: 100%;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  transition:
    background-color 0.18s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  background:
    rgba(148, 163, 184, 0.035);
}

.setting-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.setting-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  box-sizing: border-box;
  border-radius: 12px;
}

.theme-icon {
  background:
    rgba(124, 58, 237, 0.09);
  color: #7c3aed;
}

.refresh-icon {
  background:
    rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.setting-copy {
  min-width: 0;
}

.setting-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.setting-title-row h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 750;
  line-height: 1.4;
}

.setting-status {
  display: inline-flex;
  align-items: center;
  min-height: 25px;
  box-sizing: border-box;
  padding: 0 9px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.setting-copy p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.55;
}

.setting-description {
  display: block;
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
  opacity: 0.8;
}

.setting-control {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* =========================
   Theme Switch
   ========================= */

.theme-switch {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  outline: none;
  background: var(--panel-bg);
  color: var(--text-main);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.theme-switch:hover {
  border-color: #7c3aed;
}

.theme-switch:focus-visible {
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.12);
}

.switch-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 34px;
  height: 20px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 2px;
  border-radius: 999px;
  background:
    rgba(148, 163, 184, 0.35);
  transition:
    background-color 0.2s ease;
}

.switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.25);
  transform: translateX(0);
  transition:
    transform 0.2s ease;
}

.theme-switch.active .switch-track {
  background: #7c3aed;
}

.theme-switch.active .switch-thumb {
  transform: translateX(14px);
}

.switch-label {
  min-width: 28px;
  font-size: 14px;
  font-weight: 700;
}

/* =========================
   Select
   ========================= */

.setting-select {
  min-width: 135px;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 34px 0 11px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  outline: none;
  background: var(--panel-bg);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.setting-select:hover {
  border-color:
    rgba(37, 99, 235, 0.5);
}

.setting-select:focus {
  border-color: var(--primary-color);
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* =========================
   Information
   ========================= */

.settings-info {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 12px;
  background:
    rgba(37, 99, 235, 0.035);
}

.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
  flex-shrink: 0;
  border-radius: 50%;
  background:
    rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.settings-info strong {
  display: block;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.settings-info p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

/* =========================
   Accessibility
   ========================= */

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 720px) {
  .page-header {
    padding: 18px;
    border-radius: 14px;
  }

  .header-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
  }

  .header-copy h1 {
    font-size: 22px;
  }

  .settings-section {
    border-radius: 14px;
  }

  .setting-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    padding: 17px;
  }

  .setting-control {
    width: 100%;
    padding-left: 56px;
  }

  .theme-switch,
  .setting-select {
    width: 100%;
  }

  .theme-switch {
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .header-main {
    align-items: flex-start;
    gap: 12px;
  }

  .header-icon {
    width: 42px;
    height: 42px;
  }

  .header-copy h1 {
    font-size: 20px;
  }

  .header-copy p {
    font-size: 13px;
  }

  .section-header {
    padding: 15px 16px;
  }

  .setting-main {
    gap: 11px;
  }

  .setting-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
  }

  .setting-control {
    padding-left: 49px;
  }

  .settings-info {
    padding: 13px;
  }
}

/* =========================
   Reduced Motion
   ========================= */

@media (prefers-reduced-motion: reduce) {

  .setting-item,
  .theme-switch,
  .switch-track,
  .switch-thumb,
  .setting-select {
    transition: none;
  }
}
</style>
