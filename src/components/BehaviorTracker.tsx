
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { 
  Clock, 
  Plus, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  X
} from 'lucide-react';
import { apiFetch, safeJson } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface BehaviorDefinition {
  id: string;
  name: string;
  type: 'desired' | 'undesired';
  token_reward: number;
  icon?: string;
}

interface BehaviorLog {
  id: string;
  kid_id: string;
  definition_id: string | null;
  type: 'desired' | 'undesired';
  description: string;
  date: string;
  hour: number;
  token_change: number;
  created_at: string;
  behavior_definitions?: BehaviorDefinition;
}

interface BehaviorTrackerProps {
  kidId: string;
  kidName: string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

export function BehaviorTracker({ kidId, kidName }: BehaviorTrackerProps) {
  const [definitions, setDefinitions] = useState<BehaviorDefinition[]>([]);
  const [logs, setLogs] = useState<BehaviorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [kidId, currentDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [defsRes, logsRes] = await Promise.all([
        apiFetch(`/api/kids/${kidId}/behavior-definitions`),
        apiFetch(`/api/kids/${kidId}/behaviors?date=${currentDate}`)
      ]);

      if (defsRes.ok) {
        const data = await safeJson(defsRes);
        setDefinitions(data.definitions || []);
      }

      if (logsRes.ok) {
        const data = await safeJson(logsRes);
        setLogs(data.behaviors || []);
      }
    } catch (err) {
      console.error('Error fetching behavior data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogBehavior = async (definition: BehaviorDefinition) => {
    if (selectedHour === null) return;

    try {
      const res = await apiFetch(`/api/kids/${kidId}/behaviors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition_id: definition.id,
          hour: selectedHour,
          date: currentDate,
          type: definition.type,
          description: definition.name,
          token_change: definition.token_reward
        })
      });

      if (res.ok) {
        fetchData();
        setShowPicker(false);
        setSelectedHour(null);
      }
    } catch (err) {
      console.error('Error logging behavior:', err);
    }
  };

  const getLogForHour = (hour: number) => {
    return logs.find(log => log.hour === hour);
  };

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h} ${ampm}`;
  };

  return (
    <Card className="w-full shadow-sm border-slate-200 overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Behavior Tracker</CardTitle>
              <p className="text-xs text-slate-500 font-medium">Daily Hourly Log</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() - 1);
                setCurrentDate(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold px-2 text-slate-700">
              {new Date(currentDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() + 1);
                setCurrentDate(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Hourly Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {HOURS.map(hour => {
            const log = getLogForHour(hour);
            return (
              <button
                key={hour}
                onClick={() => {
                  setSelectedHour(hour);
                  setShowPicker(true);
                }}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                  h-20 touch-manipulation
                  ${log 
                    ? log.type === 'desired'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'bg-white border-slate-100 hover:border-blue-200 text-slate-400'
                  }
                `}
              >
                <span className="text-[10px] font-bold uppercase tracking-tighter mb-1 opacity-70">
                  {formatHour(hour)}
                </span>
                {log ? (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-0.5">
                      {log.behavior_definitions?.icon || (log.type === 'desired' ? '⭐' : '⚠️')}
                    </span>
                    <span className="text-[8px] font-black uppercase truncate max-w-full px-1">
                      {log.description}
                    </span>
                  </div>
                ) : (
                  <Plus className="h-5 w-5 opacity-20" />
                )}
              </button>
            );
          })}
        </div>

        {/* History Log */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <History className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Today's History</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4 italic">No behaviors logged for this day.</p>
            ) : (
              [...logs].sort((a, b) => b.hour - a.hour).map(log => (
                <div 
                  key={log.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    log.type === 'desired' ? 'bg-green-50/30 border-green-100' : 'bg-orange-50/30 border-orange-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{log.behavior_definitions?.icon || (log.type === 'desired' ? '⭐' : '⚠️')}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {formatHour(log.hour)}: {log.description}
                      </p>
                      <p className={`text-[10px] font-bold uppercase ${log.type === 'desired' ? 'text-green-600' : 'text-orange-600'}`}>
                        {log.type === 'desired' ? 'Desired Behavior' : 'Undesired Behavior'}
                      </p>
                    </div>
                  </div>
                  {log.token_change !== 0 && (
                    <span className={`text-xs font-black px-2 py-1 rounded-full ${
                      log.token_change > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {log.token_change > 0 ? '+' : ''}{log.token_change}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>

      {/* Behavior Picker Modal */}
      <AnimatePresence>
        {showPicker && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Log Behavior</h3>
                  <p className="text-sm text-slate-500 font-medium">Time: {selectedHour !== null ? formatHour(selectedHour) : ''}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowPicker(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Desired Behaviors */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Desired Behaviors (+1 Point)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {definitions.filter(d => d.type === 'desired').map(def => (
                      <button
                        key={def.id}
                        onClick={() => handleLogBehavior(def)}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-green-50 bg-green-50/30 hover:bg-green-100 hover:border-green-200 transition-all active:scale-95"
                      >
                        <span className="text-3xl">{def.icon || '⭐'}</span>
                        <span className="text-xs font-bold text-green-800 text-center leading-tight">{def.name}</span>
                      </button>
                    ))}
                    {definitions.filter(d => d.type === 'desired').length === 0 && (
                      <p className="col-span-2 text-xs text-slate-400 italic text-center py-4">No desired behaviors defined.</p>
                    )}
                  </div>
                </div>

                {/* Undesired Behaviors */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Undesired Behaviors (0 Points)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {definitions.filter(d => d.type === 'undesired').map(def => (
                      <button
                        key={def.id}
                        onClick={() => handleLogBehavior(def)}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-orange-50 bg-orange-50/30 hover:bg-orange-100 hover:border-orange-200 transition-all active:scale-95"
                      >
                        <span className="text-3xl">{def.icon || '⚠️'}</span>
                        <span className="text-xs font-bold text-orange-800 text-center leading-tight">{def.name}</span>
                      </button>
                    ))}
                    {definitions.filter(d => d.type === 'undesired').length === 0 && (
                      <p className="col-span-2 text-xs text-slate-400 italic text-center py-4">No undesired behaviors defined.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <Button variant="outline" className="w-full h-12 rounded-xl font-bold" onClick={() => setShowPicker(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}
