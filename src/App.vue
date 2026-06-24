<script setup lang="ts">
import { onMounted } from "vue";
import NotificationToast from "./components/NotificationToast.vue";
import { useThemeStore } from "./stores/theme";

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.initializeTheme();
});
</script>

<template>
  <RouterView />

  <NotificationToast />
</template>
