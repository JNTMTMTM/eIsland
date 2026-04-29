export interface ThinkEventPayload {
  text?: unknown;
  index?: unknown;
  done?: unknown;
}

export interface MetaEventPayload {
  thinkingEnabled?: unknown;
  reasoningEffort?: unknown;
}

export interface FinalEventPayload {
  traceId?: unknown;
  traceid?: unknown;
  trace_id?: unknown;
}

export interface ToolEventPayload {
  turn?: unknown;
  tool?: unknown;
  arguments?: unknown;
  success?: unknown;
  error?: unknown;
  result?: unknown;
}

export interface ToolCallRequestPayload {
  turn?: unknown;
  requestId?: unknown;
  tool?: unknown;
  purpose?: unknown;
  arguments?: unknown;
  riskLevel?: unknown;
  authorizationRequired?: unknown;
  message?: unknown;
}

export interface ToolCallResultPayload {
  turn?: unknown;
  requestId?: unknown;
  tool?: unknown;
  success?: unknown;
  error?: unknown;
  result?: unknown;
  durationMs?: unknown;
}

export type AiLocalToolAccessPrompt = {
  sessionId: string;
  requestId: string;
  tool: string;
  purpose: string;
  argumentsPayload: Record<string, unknown>;
  riskLevel: string;
  message: string;
};
