import { defineStore } from "pinia";
import { fetchDashboardAgents, fetchDashboardSummary, fetchRecentLogs } from "../api/dashboardApi";
import { useNotificationStore } from "./notification";

import type { AgentDashboardItem, DashboardSummary, LogItem } from "../types/dashboard";

type WebSocketConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface DashboardState {
  summary: DashboardSummary;
  agents: AgentDashboardItem[];
  logs: LogItem[];
  loading: boolean;
  refreshing: boolean;
  initialized: boolean;
  lastUpdated: Date | null;
  error: string;
  websocket: WebSocket | null;
  connectionStatus: WebSocketConnectionStatus;
}

export const useDashboardStore = defineStore("dashboard", {
  state: (): DashboardState => ({
    summary: {
      totalAgents: 0,
      onlineAgents: 0,
      offlineAgents: 0,
      errorCount: 0,
    },

    agents: [],
    logs: [],

    loading: false,
    refreshing: false,
    initialized: false,
    lastUpdated: null,
    error: "",

    websocket: null,
    connectionStatus: "disconnected",
  }),

  actions: {
    /*
     * 根據 Agent 最新資源使用率同步警示。
     *
     * Warning：80% ～ 89.9%
     * Critical：90% 以上
     */
    syncResourceAlerts(agents: AgentDashboardItem[]) {
      const notificationStore = useNotificationStore();

      agents.forEach((agent) => {
        const agentCode = agent.agentCode;
        const hostName = agent.hostName || agentCode;

        const metrics = [
          {
            name: "CPU",
            value: agent.cpuUsage,
            key: "cpu",
          },
          {
            name: "Memory",
            value: agent.memoryUsage,
            key: "memory",
          },
          {
            name: "Disk",
            value: agent.diskUsage,
            key: "disk",
          },
        ];

        metrics.forEach((metric) => {
          const warningKey = `resource-warning:${agentCode}:${metric.key}`;

          const criticalKey = `resource-critical:${agentCode}:${metric.key}`;

          /*
           * 沒有監控資料：
           * 不產生警示，並解除既有警示狀態。
           */
          if (metric.value === null || metric.value === undefined) {
            notificationStore.resolveNotification(warningKey);
            notificationStore.resolveNotification(criticalKey);
            return;
          }

          /*
           * Critical：90% 以上
           */
          if (metric.value >= 90) {
            notificationStore.resolveNotification(warningKey);

            notificationStore.pushNotification({
              type: "error",
              title: `${metric.name} 使用率過高`,
              message: `${hostName} ${metric.name} 使用率為 ` + `${metric.value.toFixed(1)}%`,
              dedupeKey: criticalKey,
            });

            return;
          }

          /*
           * Warning：80% ～ 89.9%
           */
          if (metric.value >= 80) {
            notificationStore.resolveNotification(criticalKey);

            notificationStore.pushNotification({
              type: "warning",
              title: `${metric.name} 使用率偏高`,
              message: `${hostName} ${metric.name} 使用率為 ` + `${metric.value.toFixed(1)}%`,
              dedupeKey: warningKey,
            });

            return;
          }

          /*
           * Normal：80% 以下
           */
          notificationStore.resolveNotification(warningKey);
          notificationStore.resolveNotification(criticalKey);
        });
      });
    },

    syncHostAlerts(agents: AgentDashboardItem[]) {
      const notificationStore = useNotificationStore();

      agents.forEach((agent) => {
        const agentCode = agent.agentCode;
        const hostName = agent.hostName || agentCode;

        const offlineKey = `host-offline:${agentCode}`;

        if (agent.status === "OFFLINE") {
          notificationStore.pushNotification({
            type: "error",
            title: "主機離線",
            message: `${hostName} 目前處於離線狀態`,
            dedupeKey: offlineKey,
          });

          return;
        }

        notificationStore.resolveNotification(offlineKey);
      });
    },

    syncServiceAlerts(agents: AgentDashboardItem[]) {
      const notificationStore = useNotificationStore();

      agents.forEach((agent) => {
        const agentCode = agent.agentCode;
        const hostName = agent.hostName || agentCode;

        const services = [
          {
            name: "Database",
            status: agent.databaseStatus,
            key: "database",
          },
          {
            name: "FTP",
            status: agent.ftpStatus,
            key: "ftp",
          },
          {
            name: "Application",
            status: agent.applicationStatus,
            key: "application",
          },
        ];

        services.forEach((service) => {
          const alertKey = `service-down:${agentCode}:${service.key}`;

          if (service.status === "DOWN") {
            notificationStore.pushNotification({
              type: "error",
              title: `${service.name} 服務異常`,
              message: `${hostName} 的 ${service.name} 服務目前為 DOWN`,
              dedupeKey: alertKey,
            });

            return;
          }

          notificationStore.resolveNotification(alertKey);
        });
      });
    },

    /*
     * 載入 Dashboard 最新資料。
     */
    async loadDashboard() {
      /*
       * 防止 Auto Refresh、手動 Refresh、
       * WebSocket 同時重複發送請求。
       */
      if (this.loading || this.refreshing) {
        return;
      }

      const isInitialLoad = !this.initialized;

      if (isInitialLoad) {
        this.loading = true;
      } else {
        this.refreshing = true;
      }

      this.error = "";

      try {
        const [summaryData, agentsData, logsData] = await Promise.all([
          fetchDashboardSummary(),
          fetchDashboardAgents(),
          fetchRecentLogs(50),
        ]);

        this.summary = summaryData;
        this.agents = agentsData;
        this.logs = logsData;

        /*
         * 根據最新 Agent 資料同步資源警示。
         */
        this.syncResourceAlerts(agentsData);

        /*
         * 根據最新 Agent 狀態同步離線警示。
         */
        this.syncHostAlerts(agentsData);

        this.syncServiceAlerts(agentsData);

        this.initialized = true;
        this.lastUpdated = new Date();
      } catch (error) {
        console.error("Failed to load dashboard data:", error);

        /*
         * 更新失敗時保留上一次成功取得的資料。
         */
        this.error = "儀表板資料更新失敗，目前顯示上一次成功取得的資料";
      } finally {
        this.loading = false;
        this.refreshing = false;
      }
    },

    /*
     * 建立 Dashboard WebSocket 連線。
     */
    connectWebSocket() {
      if (this.websocket) {
        return;
      }

      this.connectionStatus = "connecting";

      const ws = new WebSocket("ws://localhost:9090/ws/dashboard");

      ws.onopen = () => {
        console.log("Dashboard websocket connected");

        this.connectionStatus = "connected";
      };

      /*
       * 後端有新資料時會送出：
       *
       * dashboard-updated
       *
       * 前端收到後重新取得 Dashboard 最新資料。
       */
      ws.onmessage = (message) => {
        console.log("Dashboard websocket update", message.data);

        if (message.data === "dashboard-updated") {
          void this.loadDashboard();
        }
      };

      ws.onerror = (error) => {
        console.error("Dashboard websocket error", error);

        this.connectionStatus = "error";
      };

      ws.onclose = () => {
        console.log("Dashboard websocket disconnected");

        this.connectionStatus = "disconnected";
        this.websocket = null;
      };

      this.websocket = ws;
    },

    /*
     * 主動關閉 Dashboard WebSocket。
     */
    disconnectWebSocket() {
      if (!this.websocket) {
        return;
      }

      this.websocket.close();
      this.websocket = null;
      this.connectionStatus = "disconnected";
    },
  },
});
