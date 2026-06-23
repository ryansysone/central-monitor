import { createRouter, createWebHistory } from "vue-router";
import MainLayout from "../layouts/MainLayout.vue";
import HostsView from "../views/HostsView.vue";
import AlertsView from "../views/AlertsView.vue";
import LogsView from "../views/LogsView.vue";
import SettingsView from "../views/SettingsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: MainLayout,
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("../views/DashboardView.vue"),
        },
        {
          path: "host/:agentCode",
          name: "host-detail",
          component: () => import("../views/HostDetailView.vue"),
          props: true,
        },
        {
          path: "hosts",
          component: HostsView,
        },
        {
          path: "alerts",
          component: AlertsView,
        },
        {
          path: "logs",
          component: LogsView,
        },
        {
          path: "settings",
          component: SettingsView,
        },
      ],
    },
  ],
});

export default router;
