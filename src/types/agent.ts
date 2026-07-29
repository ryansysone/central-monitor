/**
 * Agent 完整資料。
 *
 * 對應後端：
 * GET /api/agents
 * GET /api/agents/{agentCode}
 */
export interface AgentDetail {
  id: number;
  agentCode: string;
  hostName: string;
  ipAddress: string;
  osName: string;
  status: string;
  lastSeenAt: string | null;
}

/**
 * Agent 下拉式選單使用的精簡資料。
 *
 * 這不是另一個後端 DTO，
 * 而是前端依照畫面需求整理出的型別。
 */
export interface AgentOption {
  id: number;
  agentCode: string;
  hostName: string;
}
