import { FormEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Bot, Check, Flag, Send, Sparkles, Trash2, X } from 'lucide-react';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from './Button';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceQuestion?: string;
};

type AssistantCapability = { area: string; routes: string[] };

type AssistantAllowance = {
  used: number;
  remaining: number;
  dailyLimit: number;
  resetsAt: string;
};

const suggestions = [
  'How do I assign an activity?',
  'What is waiting for verification?',
  'Summarize my children’s recent progress.',
  'Suggest an activity using my child’s interests.',
];

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! I’m your Visual Steps assistant. I can explain how the app works, summarize your children’s Visual Steps activity, and suggest practical next steps. What would you like help with?',
};

export function ParentAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [allowance, setAllowance] = useState<AssistantAllowance | null>(null);
  const [isAllowanceLoading, setIsAllowanceLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<AssistantCapability[]>([]);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [reportedMessageIds, setReportedMessageIds] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 100);
      setIsAllowanceLoading(true);
      apiFetch('/api/parent-assistant/usage')
        .then(async response => {
          const payload = await safeJson(response);
          if (!response.ok) throw new Error(payload?.error || 'Unable to load allowance');
          setAllowance(payload.allowance);
        })
        .catch(() => setAllowance(null))
        .finally(() => setIsAllowanceLoading(false));
      apiFetch('/api/parent-assistant/capabilities')
        .then(async response => {
          const payload = await safeJson(response);
          if (response.ok && Array.isArray(payload?.capabilities)) setCapabilities(payload.capabilities);
        })
        .catch(() => undefined);
    }
  }, [isOpen]);

  const askQuestion = async (value: string) => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion || isSending) return;

    const previousMessages = messages.filter(message => message.id !== 'welcome');
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmedQuestion };
    setMessages(current => [...current, userMessage]);
    setQuestion('');
    setError('');
    setIsSending(true);

    try {
      const response = await apiFetch('/api/parent-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmedQuestion,
          messages: previousMessages.slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = await safeJson(response);
      if (payload?.allowance) setAllowance(payload.allowance);
      if (!response.ok) throw new Error(payload?.error || 'The assistant could not answer right now.');
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: payload.answer,
        sourceQuestion: trimmedQuestion,
      }]);
    } catch (requestError: any) {
      setError(requestError?.message || 'The assistant could not answer right now.');
    } finally {
      setIsSending(false);
    }
  };

  const reportMissingInfo = async (message: ChatMessage) => {
    if (!message.sourceQuestion || reportedMessageIds.has(message.id)) return;
    setError('');
    try {
      const response = await apiFetch('/api/parent-assistant/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: message.sourceQuestion,
          assistantResponse: message.content,
          pagePath: window.location.pathname,
        }),
      });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to report this answer.');
      setReportedMessageIds(current => new Set(current).add(message.id));
    } catch (requestError: any) {
      setError(requestError?.message || 'Unable to report this answer.');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void askQuestion(question);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-3 right-3 z-[70] flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-br from-blue-600 to-emerald-500 p-0 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${isOpen ? 'pointer-events-none opacity-0' : ''}`}
        aria-label="Open parent AI assistant"
        title="Ask Visual Steps"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      {isOpen && (
        <section className="fixed inset-0 z-[90] flex flex-col bg-white shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(720px,calc(100vh-40px))] sm:w-[430px] sm:rounded-3xl sm:border sm:border-blue-100" role="dialog" aria-modal="true" aria-labelledby="parent-assistant-title">
          <header className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><Bot className="h-6 w-6" /></div>
              <div><h2 id="parent-assistant-title" className="font-black">Visual Steps Assistant</h2><p className="text-xs font-semibold text-blue-50">App help and your family’s progress</p></div>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => setShowCapabilities(current => !current)} className="rounded-full p-2 hover:bg-white/20" aria-label="Show what the assistant can help with"><BookOpen className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setMessages([welcomeMessage]); setError(''); }} className="rounded-full p-2 hover:bg-white/20" aria-label="Clear conversation"><Trash2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 hover:bg-white/20" aria-label="Close assistant"><X className="h-5 w-5" /></button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
            {showCapabilities && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-slate-700 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-black text-blue-900">What I can help with</h3><button type="button" onClick={() => setShowCapabilities(false)} className="text-xs font-bold text-blue-700">Hide</button></div>
                <p className="mb-3 text-xs leading-5">These are the app areas in my verified guide. I can also explain your children’s activity, quiz, reward, and progress data.</p>
                <div className="flex flex-wrap gap-1.5">{capabilities.map(capability => <span key={capability.area} className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-bold">{capability.area}</span>)}</div>
              </div>
            )}
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === 'user' ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'}`}>
                  {message.role === 'assistant' ? (
                    <div className="space-y-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:m-0 [&_strong]:font-black [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                  ) : message.content}
                  {message.role === 'assistant' && message.sourceQuestion && (
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <button type="button" onClick={() => void reportMissingInfo(message)} disabled={reportedMessageIds.has(message.id)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-700 disabled:text-emerald-700">
                        {reportedMessageIds.has(message.id) ? <><Check className="h-3 w-3" /> Added to review list</> : <><Flag className="h-3 w-3" /> Report missing info</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="grid gap-2">
                {suggestions.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => void askQuestion(suggestion)} className="rounded-xl border border-blue-100 bg-white p-3 text-left text-xs font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {isSending && <div className="w-fit rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><span className="animate-pulse">Thinking…</span></div>}
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3 sm:rounded-b-3xl">
            <div className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${allowance && allowance.remaining <= 5 ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
              <span>{isAllowanceLoading ? 'Checking today’s allowance…' : allowance ? `${allowance.remaining} of ${allowance.dailyLimit} questions left today` : 'Daily allowance unavailable'}</span>
              {allowance?.resetsAt && <span className="font-semibold opacity-75">Resets {new Date(allowance.resetsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <textarea
                ref={inputRef}
                value={question}
                onChange={event => setQuestion(event.target.value.slice(0, 1200))}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void askQuestion(question);
                  }
                }}
                rows={2}
                placeholder="Ask about Visual Steps or your children’s progress…"
                className="max-h-28 flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm outline-none"
                disabled={isSending || allowance?.remaining === 0}
              />
              <Button type="submit" size="sm" disabled={!question.trim() || isSending || allowance?.remaining === 0} className="h-10 w-10 rounded-xl p-0" aria-label="Send question"><Send className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">AI can make mistakes. Review important decisions and seek qualified help for clinical concerns.</p>
          </form>
        </section>
      )}
    </>
  );
}
