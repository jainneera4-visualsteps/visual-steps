import { useEffect, useState } from 'react';
import { Pause, Volume2 } from 'lucide-react';
import { createFriendlyUtterance, plainTextForSpeech } from '../utils/friendlySpeech';
import { DeviceVoiceSelector } from './DeviceVoiceSelector';

export function ListenToContentButton({ text, label = 'Listen to this article' }: { text: string; label?: string }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    return () => window.speechSynthesis?.cancel();
  }, [text]);

  const toggle = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = createFriendlyUtterance(plainTextForSpeech(text));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return <span className="inline-flex flex-wrap items-center gap-2">
    <button type="button" onClick={toggle} className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-bold text-brand-800 shadow-sm hover:bg-brand-50" aria-label={speaking ? 'Stop listening' : label}>
      {speaking ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {speaking ? 'Stop listening' : 'Listen'}
    </button>
    <DeviceVoiceSelector compact onChange={() => setSpeaking(false)} />
  </span>;
}
