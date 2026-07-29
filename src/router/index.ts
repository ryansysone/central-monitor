import { createRouter, createWebHistory } from "vue-router";
import MainLayout from "../layouts/MainLayout.vue";
import HostsView from "../views/HostsView.vue";
import AlertsView from "../views/AlertsView.vue";
import SystemLogsView from "../views/SystemLogsView.vue";
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
          path: "host/:agentCode/logs",
          name: "agent-logs",
          component: () => import("../views/AgentLogsView.vue"),
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
          name: "system-logs",
          component: SystemLogsView,
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
