import { apiFetch, safeJson } from '../utils/api';
import { normalizeImageSource } from '../utils/imageSource';

export const modelNames = {
  flash: 'gemini-3-flash-preview',
  pro: 'gemini-3.1-pro-preview',
  image: 'gemini-2.5-flash-image',
} as const;

type GenerateContentOptions = {
  model?: string;
  systemInstruction?: string;
  prompt: string | unknown[];
  responseMimeType?: string;
  responseSchema?: unknown;
  tools?: unknown[];
  generationPurpose?: 'quiz' | 'worksheet' | 'social_story';
  onAllowance?: (allowance: GenerationAllowance) => void;
};

export interface GenerationAllowance {
  used: number;
  remaining: number;
  dailyLimit: number;
  resetsAt: string;
}

const requestGeneration = async (body: Record<string, unknown>) => {
  const response = await apiFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await safeJson(response);

  if (!response.ok) {
    const error = new Error(data?.error || 'AI generation failed') as Error & { allowance?: GenerationAllowance };
    if (data?.allowance) error.allowance = data.allowance;
    throw error;
  }

  return data;
};

export const generateContent = async (options: GenerateContentOptions) => {
  const data = await requestGeneration({
    ...options,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    model: options.model || modelNames.flash,
  });
  if (data?.allowance && options.onAllowance) options.onAllowance(data.allowance as GenerationAllowance);
  return data;
};

export interface ImageGenerationAllowance {
  used: number;
  remaining: number;
  dailyLimit: number;
  resetsAt: string;
}

export const generateImage = async (prompt: string, onAllowance?: (allowance: ImageGenerationAllowance) => void): Promise<string | null> => {
  const data = await requestGeneration({
    model: modelNames.image,
    prompt,
  });
  if (data?.allowance && onAllowance) onAllowance(data.allowance as ImageGenerationAllowance);

  if (typeof data?.text !== 'string' || data.text.length === 0) return null;
  const imageSource = normalizeImageSource(data.text);
  if (imageSource.startsWith('data:image/') || imageSource.startsWith('http')) {
    return imageSource;
  }

  throw new Error('AI image response was not a valid image');
};

const gemini = {
  models: {
    generateContent: async (options: GenerateContentOptions) => generateContent(options),
  },
};

export default gemini;
