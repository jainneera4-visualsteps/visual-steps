import { Type } from "@google/genai";
import { apiFetch } from "../utils/api";

// This file is now a proxy to our server-side AI endpoints to keep keys secure
// and avoid browser-side SDK initialization errors.

export const modelNames = {
  flash: 'gemini-flash-latest',
  pro: 'gemini-3.1-pro-preview',
  image: 'gemini-2.5-flash-image',
};

export async function generateContent(options: {
  model?: string;
  systemInstruction?: string;
  prompt: string | any[];
  responseMimeType?: string;
  responseSchema?: any;
  tools?: any[];
}) {
  try {
    const response = await apiFetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI generation failed');
    }

    const data = await response.json();
    
    // Transform back to expected response structure if needed
    // The server returns { text, response: { candidates: [...] } }
    return data.response || { candidates: [{ content: { parts: [{ text: data.text }] } }] };
  } catch (error: any) {
    console.error("Gemini Proxy API Error:", error);
    throw error;
  }
}

export async function generateImage(prompt: string) {
  try {
    const response = await apiFetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelNames.image,
        prompt: prompt
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Image generation failed');
    }

    const data = await response.json();
    
    // The server returns { text } where text is the base64 data for images
    if (data.text && data.text.startsWith('data:image')) {
        return data.text;
    }
    
    // If it's just base64
    if (data.text && !data.text.includes(' ') && data.text.length > 100) {
        return `data:image/png;base64,${data.text}`;
    }
    
    return null;
  } catch (error: any) {
    console.error("Gemini Image Proxy API Error:", error);
    throw error;
  }
}

// Dummy object for backward compatibility if any imports use it directly
const ai = {
    models: {
        generateContent: async (options: any) => generateContent(options)
    }
};

export { Type };
export default ai;

