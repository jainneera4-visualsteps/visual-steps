import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { availableEnglishVoices, createFriendlyUtterance, saveSelectedVoiceId, selectedVoiceId } from '../utils/friendlySpeech';

export function DeviceVoiceSelector({ onChange, compact = false }: { onChange?: () => void; compact?: boolean }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selected, setSelected] = useState(selectedVoiceId);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => setVoices(availableEnglishVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const changeVoice = (value: string) => {
    window.speechSynthesis?.cancel();
    saveSelectedVoiceId(value);
    setSelected(value);
    onChange?.();
    if ('speechSynthesis' in window) window.setTimeout(() => {
      const preview = createFriendlyUtterance('Hello, I am your Visual Steps narration voice.');
      window.speechSynthesis.speak(preview);
    }, 80);
  };

  if (!('speechSynthesis' in window)) return null;

  return <label className={`device-voice-selector ${compact ? 'is-compact' : ''}`}>
    <Volume2 className="h-4 w-4" aria-hidden="true" />
    <span className={compact ? 'sr-only' : ''}>Narration voice</span>
    <select value={selected} onChange={event => changeVoice(event.target.value)} aria-label="Choose narration voice">
      <option value="">Automatic warm voice</option>
      {voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
    </select>
  </label>;
}
