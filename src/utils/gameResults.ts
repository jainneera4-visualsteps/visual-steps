import { apiFetch } from './api';

export async function recordGameResult(gameKey: string, level: number, correct: boolean, kidId?: string | null) {
  if (!kidId) return;
  try {
    await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/game-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameKey, level, correct }),
    });
  } catch (error) {
    console.warn('Unable to record game result:', error);
  }
}
