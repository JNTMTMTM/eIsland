import type { AiChatSession, AiWebAccessPrompt } from '../../../../../../store/types';
import type { AiLocalToolAccessPrompt } from './chatTypes';

export type SessionCardState = 'idle' | 'running' | 'awaiting' | 'success' | 'failed';

export function resolveSessionCardState(params: {
  sessionId: string;
  streamingSessionIds: ReadonlySet<string>;
  webAccessPrompt: AiWebAccessPrompt | null;
  localToolAccessPrompt: AiLocalToolAccessPrompt | null;
  sessions: AiChatSession[];
}): SessionCardState {
  const {
    sessionId,
    streamingSessionIds,
    webAccessPrompt,
    localToolAccessPrompt,
    sessions,
  } = params;

  if (streamingSessionIds.has(sessionId)) {
    return 'running';
  }
  if (webAccessPrompt?.sessionId === sessionId || localToolAccessPrompt?.sessionId === sessionId) {
    return 'awaiting';
  }

  const session = sessions.find((item) => item.id === sessionId);
  if (!session || !Array.isArray(session.messages) || session.messages.length === 0) {
    return 'idle';
  }

  const lastAssistant = [...session.messages].reverse().find((message) => message.role === 'assistant');
  if (!lastAssistant) {
    return 'idle';
  }

  const text = typeof lastAssistant.content === 'string' ? lastAssistant.content.trim() : '';
  if (text.startsWith('❌')) {
    return 'failed';
  }
  if (lastAssistant.finalized || text.length > 0) {
    return 'success';
  }
  return 'idle';
}
