export const VOICE_PREFERENCE_KEY = 'visual-steps-narration-voice';

export function availableEnglishVoices() {
  const voices = window.speechSynthesis?.getVoices() || [];
  return voices.filter(voice => voice.lang.toLowerCase().startsWith('en'));
}

export function selectedVoiceId() {
  try { return window.localStorage.getItem(VOICE_PREFERENCE_KEY) || ''; }
  catch { return ''; }
}

export function saveSelectedVoiceId(value: string) {
  try {
    if (value) window.localStorage.setItem(VOICE_PREFERENCE_KEY, value);
    else window.localStorage.removeItem(VOICE_PREFERENCE_KEY);
  } catch { /* Narration still works when browser storage is unavailable. */ }
}

export function chooseWarmFriendlyVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  const english = availableEnglishVoices();
  const selected = selectedVoiceId();
  const savedVoice = selected && english.find(voice => voice.voiceURI === selected || voice.name === selected);
  if (savedVoice) return savedVoice;
  const preferred = [
    /samantha/i,
    /ava/i,
    /serena/i,
    /karen/i,
    /google uk english female/i,
    /victoria/i,
    /moira/i,
    /zira/i,
  ];
  for (const pattern of preferred) {
    const match = english.find(voice => pattern.test(voice.name));
    if (match) return match;
  }
  return english.find(voice => /female|natural|premium/i.test(voice.name)) || english[0] || voices[0];
}

export function createFriendlyUtterance(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = chooseWarmFriendlyVoice() || null;
  utterance.rate = 0.72;
  utterance.pitch = 1.06;
  utterance.volume = 1;
  return utterance;
}

export function plainTextForSpeech(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
