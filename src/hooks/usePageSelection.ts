import { useMemo, useState } from 'react';

export function usePageSelection(pageIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedSet.has(id));
  const somePageSelected = pageIds.some(id => selectedSet.has(id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds(current => checked
      ? Array.from(new Set([...current, id]))
      : current.filter(value => value !== id));
  };

  const togglePage = (checked: boolean) => {
    // A header checkbox always represents the currently displayed page.
    // Replacing the selection prevents a later delete from including rows
    // that were selected on a different, hidden page.
    setSelectedIds(checked ? [...pageIds] : []);
  };

  const removeSelected = (ids: string[]) => {
    const removed = new Set(ids);
    setSelectedIds(current => current.filter(id => !removed.has(id)));
  };

  return { selectedIds, selectedSet, allPageSelected, somePageSelected, toggleOne, togglePage, removeSelected, clearSelection: () => setSelectedIds([]) };
}
