import { apiFetch, safeJson } from './api';
import { invalidateProgressReport } from './progressReportData';

export interface GameAttemptDetails {
  prompt: string;
  learnerAnswer: string;
  correctAnswer: string;
  skill: string;
  explanation?: string;
}

const sessions = new Map<string, { id: string; startedAt: number }>();

export async function recordGameResult(gameKey: string, level: number, correct: boolean, kidId?: string | null, attempt?: GameAttemptDetails) {
  if (!kidId) return;
  const sessionKey = `${kidId}:${gameKey}`;
  let session = sessions.get(sessionKey);
  if (!session) {
    session = { id: crypto.randomUUID(), startedAt: Date.now() };
    sessions.set(sessionKey, session);
  }
  try {
    const response = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/game-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameKey,
        level,
        correct,
        sessionId: session.id,
        startedAt: new Date(session.startedAt).toISOString(),
        durationSeconds: Math.max(0, Math.round((Date.now() - session.startedAt) / 1000)),
        attempt,
      }),
    });
    if (!response.ok) {
      const data = await safeJson(response);
      throw new Error(data?.error || 'Unable to save game progress');
    }
    invalidateProgressReport(kidId);
  } catch (error) {
    console.warn('Unable to record game result:', error);
  }
}
