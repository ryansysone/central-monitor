import type { AgentDetail, AgentOption } from "../types/agent";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const BASE_URL = "http://localhost:9090";

/**
 * 取得全部 Agent。
 *
 * 使用情境：
 * - System Logs 的 Agent 下拉式選單
 * - 其他需要選擇 Agent 的頁面
 *
 * 後端 API：
 * GET /api/agents
 */
export async function fetchAgentOptions(): Promise<AgentOption[]> {
  const response = await fetch(`${BASE_URL}/api/agents`);

  if (!response.ok) {
    throw new Error("Failed to fetch agent options");
  }

  const result: ApiResponse<AgentDetail[]> = await response.json();

  return (result.data ?? []).map((agent) => ({
    id: agent.id,
    agentCode: agent.agentCode,
    hostName: agent.hostName,
  }));
}

/**
 * 根據 Agent Code 取得指定 Agent。
 *
 * 後端 API：
 * GET /api/agents/{agentCode}
 */
export async function fetchAgentByCode(agentCode: string): Promise<AgentDetail> {
  const response = await fetch(`${BASE_URL}/api/agents/${encodeURIComponent(agentCode)}`);

  if (!response.ok) {
    throw new Error("Failed to fetch agent");
  }

  const result: ApiResponse<AgentDetail> = await response.json();

  return result.data;
}
