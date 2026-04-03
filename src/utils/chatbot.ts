export interface ChatbotSettings {
  name: string;
  gender: string;
  personality: string;
  tone: string;
  speakingSpeed: number;
  maxSentences: number;
  languageComplexity: 'simple' | 'medium' | 'complex';
}
