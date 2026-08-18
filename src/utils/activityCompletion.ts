export type CompletableActivity = {
  status?: string | null;
  completion_date?: string | null;
};

export const getDateInTimeZone = (value: string, timeZone?: string | null): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const part = (type: string) => parts.find(item => item.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return null;
  }
};

export const countActivitiesCompletedOnDate = (
  activities: CompletableActivity[],
  targetDate: string,
  timeZone?: string | null,
): number => activities.filter(activity => (
  activity.status === 'completed'
  && Boolean(activity.completion_date)
  && getDateInTimeZone(activity.completion_date as string, timeZone) === targetDate
)).length;
