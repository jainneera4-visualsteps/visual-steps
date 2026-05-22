import { useState, useEffect, useCallback } from 'react';
import { apiFetch, safeJson } from '../utils/api';
import { io } from 'socket.io-client';

/**
 * Tool to format dates consistently for your son's dashboard
 */
export const formatKidDate = (date, options = {}) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (!d || isNaN(d.getTime())) return '';

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...options
    }).format(d);
  } catch (e) {
    console.error('Formatting error:', e);
    return String(date);
  }
};

/**
 * The main "Brain" that fetches all data for the Visual Steps app
 */
export const useAssignedActivities = (kidId) => {
  const [activities, setActivities] = useState([]);
  const [historyActivities, setHistoryActivities] = useState([]);
  const [kid, setKid] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);

  const fetchData = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!kidId) return;
    
    if (!silent) setIsLoading(true);

    try {
      // 1. Fetch Kid Details
      const kidRes = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}`);
      if (kidRes.ok) {
        const kidData = await safeJson(kidRes);
        setKid(kidData.kid);
      }

      // 2. Fetch Active Activities
      const now = new Date();
      const localDate = now.toISOString().split('T')[0];
      const localTime = now.getHours() * 60 + now.getMinutes();
      
      const actRes = await apiFetch(
        `/api/kids/${encodeURIComponent(kidId)}/activities?mode=parent&localDate=${localDate}&localTime=${localTime}`
      );
      
      if (actRes.ok) {
        const actData = await safeJson(actRes);
        const sorted = (actData.activities || []).sort((a, b) => {
          if (a.due_date !== b.due_date) return (a.due_date || '').localeCompare(b.due_date || '');
          const timeOrder = { 'Morning': 1, 'Afternoon': 2, 'Evening': 3, 'Any time': 4 };
          return (timeOrder[a.time_of_day] || 5) - (timeOrder[b.time_of_day] || 5);
        });
        setActivities(sorted);
      }

      // 3. Fetch History
      const histRes = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activity-history`);
      if (histRes.ok) {
        const histData = await safeJson(histRes);
        setHistoryActivities(histData.history || []);
      }
    } catch (error) {
      console.error('Error fetching data in logic file:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [kidId]);

  // Initial load and Socket.io setup
  useEffect(() => {
    fetchData();

    const socket = io(window.location.origin);
    if (kidId) socket.emit('join_kid_room', kidId);

    socket.on('data_updated', (data) => {
      if (data.kidId === kidId) fetchData({ silent: true });
    });

    return () => {
      socket.disconnect();
    };
  }, [kidId, fetchData]);

  // Everything the component needs to "see"
  return {
    kid,
    activities,
    historyActivities,
    isLoading,
    fetchData,
    formatKidDate // We include this tool here too!
  };
};