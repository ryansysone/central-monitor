export interface DashboardSummary {
  totalAgents: number;
  onlineAgents: number;
  offlineAgents: number;
  errorCount: number;
}

export interface AgentDashboardItem {
  agentCode: string;
  hostName: string;
  status: string;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  databaseStatus?: string | null;
  ftpStatus?: string | null;
  applicationStatus: string | null;
}

export interface LogItem {
  id: number;
  agentCode: string;
  hostName: string;
  logLevel: string;
  sourceType: string;
  message: string;
  loggedAt: string;
  createdAt: string;
}

export interface HostDetail {
  agentCode: string;
  hostName: string;
  status: string;

  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;

  databaseStatus: string | null;
  ftpStatus: string | null;
  applicationStatus: string | null;
}

export interface MetricHistory {
  id?: number;
  agentCode?: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  collectedAt: string;
}

export interface ServiceHistory {
  id?: number;
  agentCode: string;
  databaseStatus: "UP" | "DOWN" | "UNKNOWN";
  ftpStatus: "UP" | "DOWN" | "UNKNOWN";
  applicationStatus: "UP" | "DOWN" | "UNKNOWN";
  collectedAt: string;
}
