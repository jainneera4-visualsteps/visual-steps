import { apiFetch, safeJson } from './api';

export interface ProgressReportPayload {
  kid: any;
  activities: any[];
  history: any[];
  purchases: any[];
  quizResults: any[];
  gameResults: any[];
}

const CACHE_DURATION_MS = 30_000;
const cache = new Map<string, { payload: ProgressReportPayload; savedAt: number }>();
const pending = new Map<string, Promise<ProgressReportPayload>>();
const revisions = new Map<string, number>();

export const getCachedProgressReport = (kidId: string) => cache.get(kidId)?.payload || null;

export const invalidateProgressReport = (kidId: string) => {
  cache.delete(kidId);
  pending.delete(kidId);
  revisions.set(kidId, (revisions.get(kidId) || 0) + 1);
};

export const loadProgressReport = (kidId: string, force = false) => {
  const cached = cache.get(kidId);
  if (!force && cached && Date.now() - cached.savedAt < CACHE_DURATION_MS) return Promise.resolve(cached.payload);
  const existing = pending.get(kidId);
  if (existing) return existing;

  const requestRevision = revisions.get(kidId) || 0;
  const request = apiFetch(`/api/kids/${encodeURIComponent(kidId)}/progress-report`)
    .then(async response => {
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data?.error || 'Unable to load progress report');
      const payload: ProgressReportPayload = {
        kid: data.kid || null,
        activities: data.activities || [],
        history: data.history || [],
        purchases: data.purchases || [],
        quizResults: data.quizResults || [],
        gameResults: data.gameResults || [],
      };
      if ((revisions.get(kidId) || 0) === requestRevision) cache.set(kidId, { payload, savedAt: Date.now() });
      return payload;
    })
    .finally(() => { if (pending.get(kidId) === request) pending.delete(kidId); });
  pending.set(kidId, request);
  return request;
};

export const prefetchProgressReport = (kidId: string) => {
  void loadProgressReport(kidId).catch(() => undefined);
};
