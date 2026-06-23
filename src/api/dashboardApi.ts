import type {
  AgentDashboardItem,
  DashboardSummary,
  LogItem,
  HostDetail,
  MetricHistory,
  ServiceHistory,
} from "../types/dashboard";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const BASE_URL = "http://localhost:9090";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${BASE_URL}/api/dashboard/summary`);

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard summary");
  }

  const result: ApiResponse<Partial<DashboardSummary>> = await response.json();

  return {
    totalAgents: result.data?.totalAgents ?? 0,
    onlineAgents: result.data?.onlineAgents ?? 0,
    offlineAgents: result.data?.offlineAgents ?? 0,
    errorCount: result.data?.errorCount ?? 0,
  };
}

export async function fetchDashboardAgents(): Promise<AgentDashboardItem[]> {
  const response = await fetch(`${BASE_URL}/api/dashboard/agents`);

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard agents");
  }

  const result: ApiResponse<AgentDashboardItem[]> = await response.json();

  return result.data ?? [];
}

export async function fetchRecentLogs(limit = 15): Promise<LogItem[]> {
  const response = await fetch(`${BASE_URL}/api/logs/recent?limit=${limit}`);

  if (!response.ok) {
    throw new Error("Failed to fetch recent logs");
  }

  const result: ApiResponse<LogItem[]> = await response.json();

  return result.data ?? [];
}

export async function fetchHostDetail(agentCode: string): Promise<HostDetail> {
  const response = await fetch(`${BASE_URL}/api/dashboard/hosts/${agentCode}`);

  if (!response.ok) {
    throw new Error("Failed to fetch host detail");
  }

  const result: ApiResponse<HostDetail> = await response.json();

  return result.data;
}

export async function fetchMetricHistory(agentCode: string): Promise<MetricHistory[]> {
  const response = await fetch(`${BASE_URL}/api/dashboard/history/${agentCode}`);

  if (!response.ok) {
    throw new Error("Failed to fetch metric history");
  }

  const result: ApiResponse<MetricHistory[]> = await response.json();

  return result.data ?? [];
}

interface RawServiceHistoryItem {
  serviceName: "DATABASE" | "FTP" | "APPLICATION";
  status: "UP" | "DOWN" | "UNKNOWN";
  responseTimeMs: number | null;
  message: string;
  checkedAt: string;
}

export async function fetchServiceHistory(agentCode: string): Promise<ServiceHistory[]> {
  const response = await fetch(`${BASE_URL}/api/dashboard/service-history/${agentCode}`);

  if (!response.ok) {
    throw new Error("Failed to fetch service history");
  }

  const result: ApiResponse<RawServiceHistoryItem[]> = await response.json();

  const grouped = new Map<string, ServiceHistory>();

  for (const item of result.data ?? []) {
    const key = item.checkedAt.slice(0, 19);

    if (!grouped.has(key)) {
      grouped.set(key, {
        agentCode,
        databaseStatus: "UNKNOWN",
        ftpStatus: "UNKNOWN",
        applicationStatus: "UNKNOWN",
        collectedAt: key,
      });
    }

    const row = grouped.get(key)!;

    switch (item.serviceName) {
      case "DATABASE":
        row.databaseStatus = item.status;
        break;

      case "FTP":
        row.ftpStatus = item.status;
        break;

      case "APPLICATION":
        row.applicationStatus = item.status;
        break;
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
  );
}
