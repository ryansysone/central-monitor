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
    async loadDashboard() {
      if (this.loading || this.refreshing) {
        return;
      }
      const isInitialLoad = !this.initialized;

      if (isInitialLoad) {
        this.loading = true;
      } else {
        this.refreshing = true;
      }

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
        this.initialized = true;
        this.lastUpdated = new Date();
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        this.error = "儀表板資料更新失敗，目前顯示上一次成功取得的資料";
      } finally {
        this.loading = false;
        this.refreshing = false;
      }
    },

    connectWebSocket() {
      const notificationStore = useNotificationStore();

      if (this.websocket) return;

      this.connectionStatus = "connecting";

      const ws = new WebSocket("ws://localhost:9090/ws/dashboard");

      ws.onopen = () => {
        console.log("Dashboard websocket connected");

        this.connectionStatus = "connected";
      };

      ws.onmessage = (message) => {
        console.log("Dashboard websocket update", message.data);

        if (message.data === "dashboard-updated") {
          this.loadDashboard();
          return;
        }

        try {
          const event = JSON.parse(message.data);

          switch (event.type) {
            case "summary:update":
              this.summary = event.payload;
              break;

            case "agents:update":
              this.agents = event.payload;
              break;

            case "logs:new":
              this.logs = [event.payload, ...this.logs].slice(0, 20);

              if (event.payload.logLevel === "ERROR") {
                notificationStore.pushNotification({
                  type: "error",
                  title: "New Error Detected",
                  message: `${event.payload.hostName || event.payload.agentCode}: ${event.payload.message}`,
                });
              }

              break;

            default:
              this.loadDashboard();
              break;
          }
        } catch {
          this.loadDashboard();
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

    disconnectWebSocket() {
      if (!this.websocket) return;

      this.websocket.close();
      this.websocket = null;
      this.connectionStatus = "disconnected";
    },
  },
});
