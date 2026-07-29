import type { LogItem } from "../types/dashboard";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchAgentLogsParams {
  agentId: number;
  keyword?: string;
  logLevel?: string;
  sourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface SearchSystemLogsParams {
  agentId?: number;
  keyword?: string;
  logLevel?: string;
  sourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

const BASE_URL = "http://localhost:9090";

/**
 * 將 Log 搜尋條件轉成 URL query string。
 */
function buildLogSearchQuery(
  params: Omit<SearchAgentLogsParams, "agentId"> | SearchSystemLogsParams,
): URLSearchParams {
  const query = new URLSearchParams();

  if (params.keyword) {
    query.append("keyword", params.keyword);
  }

  if (params.logLevel) {
    query.append("logLevel", params.logLevel);
  }

  if (params.sourceType) {
    query.append("sourceType", params.sourceType);
  }

  if (params.startDate) {
    query.append("startDate", params.startDate);
  }

  if (params.endDate) {
    query.append("endDate", params.endDate);
  }

  query.append("page", String(params.page ?? 0));
  query.append("size", String(params.size ?? 20));

  return query;
}

/**
 * 查詢指定 Agent 的 Logs。
 */
export async function searchAgentLogs(
  params: SearchAgentLogsParams,
): Promise<PageResponse<LogItem>> {
  const query = buildLogSearchQuery(params);

  const response = await fetch(
    `${BASE_URL}/api/logs/agent/${params.agentId}/search?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to search agent logs");
  }

  const result: ApiResponse<PageResponse<LogItem>> = await response.json();

  return result.data;
}

/**
 * 查詢全系統 Logs。
 *
 * agentId 沒有值時查詢全部 Agent；
 * agentId 有值時只查詢指定 Agent。
 */
export async function searchSystemLogs(
  params: SearchSystemLogsParams,
): Promise<PageResponse<LogItem>> {
  const query = buildLogSearchQuery(params);

  if (params.agentId !== undefined) {
    query.append("agentId", String(params.agentId));
  }

  const response = await fetch(`${BASE_URL}/api/logs/search?${query.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to search system logs");
  }

  const result: ApiResponse<PageResponse<LogItem>> = await response.json();

  return result.data;
}
