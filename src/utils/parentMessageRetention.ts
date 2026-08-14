export const DEFAULT_PARENT_MESSAGE_RETENTION_DAYS = 20;

export const normalizeParentMessageRetentionDays = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PARENT_MESSAGE_RETENTION_DAYS;
  }
  return Math.floor(parsed);
};

export const getParentMessageCutoff = (
  retentionDays: number,
  now: Date | number = Date.now()
): string => {
  const normalizedDays = normalizeParentMessageRetentionDays(retentionDays);
  const timestamp = now instanceof Date ? now.getTime() : now;
  return new Date(timestamp - normalizedDays * 24 * 60 * 60 * 1000).toISOString();
};

export const isParentMessageExpired = (
  createdAt: string | Date,
  retentionDays: number,
  now: Date | number = Date.now()
): boolean => {
  const createdTimestamp = createdAt instanceof Date
    ? createdAt.getTime()
    : new Date(createdAt).getTime();

  if (!Number.isFinite(createdTimestamp)) return true;
  return createdTimestamp < new Date(getParentMessageCutoff(retentionDays, now)).getTime();
};
