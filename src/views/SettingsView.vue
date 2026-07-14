<script setup lang="ts">
import { ref } from "vue";

const isDarkMode = ref(document.documentElement.classList.contains("dark"));

const autoRefreshSeconds = ref(
  Number(localStorage.getItem("autoRefreshSeconds") || 30)
);

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;

  if (isDarkMode.value) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

function updateAutoRefreshSeconds() {
  localStorage.setItem("autoRefreshSeconds", String(autoRefreshSeconds.value));
}
</script>

<template>
  <div class="settings-page">
    <h1>系統設定</h1>

    <div class="settings-panel">
      <div class="setting-row">
        <div>
          <h2>主題模式</h2>
          <p>切換淺色或深色介面。</p>
        </div>

        <button class="theme-toggle-button" @click="toggleDarkMode">
          {{ isDarkMode ? "切換為淺色模式" : "切換為深色模式" }}
        </button>
      </div>

      <div class="setting-row">
        <div>
          <h2>自動重新整理</h2>
          <p>設定儀表板自動更新的時間間隔。</p>
        </div>

        <select v-model="autoRefreshSeconds" class="setting-select" @change="updateAutoRefreshSeconds">
          <option :value="10">10 秒</option>
          <option :value="30">30 秒</option>
          <option :value="60">1 分鐘</option>
          <option :value="300">5 分鐘</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  width: 100%;
  color: var(--text-main);
}

.settings-page h1,
.settings-page h2 {
  color: var(--text-main);
}

.settings-panel {
  margin-top: 24px;
  background: var(--panel-bg);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-row:last-child {
  border-bottom: none;
}

.theme-toggle-button {
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.setting-select {
  min-width: 120px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--panel-bg);
  color: var(--text-main);
}

.setting-select:focus {
  outline: none;
  border-color: var(--primary-color);
}
</style>
