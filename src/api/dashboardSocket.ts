import type { DashboardSummary, AgentDashboardItem, LogItem } from "@/types/dashboard";

export type DashboardSocketEvent =
  | {
      type: "summary:update";
      payload: DashboardSummary;
    }
  | {
      type: "agents:update";
      payload: AgentDashboardItem[];
    }
  | {
      type: "logs:new";
      payload: LogItem;
    };

type Handler = (event: DashboardSocketEvent) => void;

let socket: WebSocket | null = null;

export function connectDashboardSocket(handler: Handler) {
  if (socket) return;

  socket = new WebSocket(import.meta.env.VITE_WS_URL);

  socket.onopen = () => {
    console.log("Dashboard WebSocket connected");
  };

  socket.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as DashboardSocketEvent;
      handler(event);
    } catch (error) {
      console.error("Invalid WebSocket message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("Dashboard WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Dashboard WebSocket disconnected");
    socket = null;
  };
}

export function disconnectDashboardSocket() {
  socket?.close();
  socket = null;
}
