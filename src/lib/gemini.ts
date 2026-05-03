import { GoogleGenAI } from "@google/genai";

// Initialization according to skill guidelines
// The platform injects GEMINI_API_KEY into process.env for the frontend
const apiKey = (process.env.GEMINI_API_KEY || "").trim();
const isKeyPlaceholder = !apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 10;
const ai = new GoogleGenAI({ apiKey: isKeyPlaceholder ? 'unused-key' : apiKey });

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
    if (isKeyPlaceholder) {
      throw new Error("No valid API key in frontend");
    }

    const modelName = options.model || modelNames.flash;
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: Array.isArray(options.prompt) ? options.prompt : [{ role: 'user', parts: [{ text: options.prompt }] }],
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType,
        responseSchema: options.responseSchema,
        tools: options.tools,
      },
    });

    // Return in a way that matches what existing code expects
    // Existing code seems to expect a structure similar to the proxy return
    return {
      text: response.text,
      response: response
    };
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    // Fallback to proxy if SDK fails (e.g. if API key is not available in frontend but is in backend)
    // Though the skill says never call from backend, sometimes environment setup varies
    try {
        console.log("Attempting proxy fallback...");
        const { apiFetch } = await import("../utils/api");
        const proxyResponse = await apiFetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        if (!proxyResponse.ok) {
          const errorData = await proxyResponse.json();
          throw new Error(errorData.error || 'AI generation failed');
        }

        return await proxyResponse.json();
    } catch (proxyError: any) {
        throw new Error(error.message || proxyError.message || 'AI generation failed');
    }
  }
}

export async function generateImage(prompt: string) {
  try {
    if (isKeyPlaceholder) {
      throw new Error("No valid API key in frontend");
    }

    const response = await ai.models.generateContent({
      model: modelNames.image,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    // Fallback search in parts for any text that looks like base64
    const text = response.text;
    if (text && text.length > 100 && !text.includes(' ')) {
        return `data:image/png;base64,${text}`;
    }

    return null;
  } catch (error: any) {
    console.error("Gemini Image SDK Error:", error);
    // Proxy fallback for images
    try {
        const { apiFetch } = await import("../utils/api");
        const proxyResponse = await apiFetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelNames.image,
            prompt: prompt
          }),
        });

        if (proxyResponse.ok) {
            const data = await proxyResponse.json();
            return data.text;
        }
    } catch (e) {}
    throw error;
  }
}

const gemini = {
    models: {
        generateContent: async (options: any) => generateContent(options)
    }
};

export default gemini;

