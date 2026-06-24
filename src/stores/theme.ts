import { defineStore } from "pinia";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
}

export const useThemeStore = defineStore("theme", {
  state: (): ThemeState => ({
    mode: (localStorage.getItem("theme") as ThemeMode) || "light",
  }),

  actions: {
    toggleTheme() {
      this.mode = this.mode === "light" ? "dark" : "light";

      localStorage.setItem("theme", this.mode);

      document.documentElement.classList.toggle("dark", this.mode === "dark");
    },

    initializeTheme() {
      document.documentElement.classList.toggle("dark", this.mode === "dark");
    },
  },
});
