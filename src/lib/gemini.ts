import { GoogleGenAI } from "@google/genai";

// Initialization according to skill guidelines
// The platform injects GEMINI_API_KEY into process.env for the frontend
const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
const isKeyPlaceholder = !apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 10;

// Lazy initialization of the SDK
let genAI: any = null;
function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: isKeyPlaceholder ? 'unused-key' : apiKey });
  }
  return genAI;
}

export const modelNames = {
  flash: 'gemini-1.5-flash',
  pro: 'gemini-1.5-pro',
  image: 'gemini-2.0-flash-exp',
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
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ 
      model: modelName,
      systemInstruction: options.systemInstruction as any,
    });
    
    const response = await model.generateContent({
      contents: Array.isArray(options.prompt) ? options.prompt : [{ role: 'user', parts: [{ text: options.prompt }] }],
      generationConfig: {
        responseMimeType: options.responseMimeType,
        responseSchema: options.responseSchema,
      },
    });

    const result = response.response;
    return {
      text: result.text(),
      response: result
    };
  } catch (error: any) {
    console.warn("Gemini Frontend SDK failed or bypassed:", error.message);
    
    try {
        console.log("Attempting proxy fallback...");
        const { apiFetch } = await import("../utils/api");
        const proxyResponse = await apiFetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        const data = await proxyResponse.json();
        if (!proxyResponse.ok) {
          throw new Error(data.error || 'AI generation failed');
        }

        return data;
    } catch (proxyError: any) {
        const isFrontendKeyError = error.message === "No valid API key in frontend";
        const finalMessage = isFrontendKeyError ? (proxyError.message || error.message) : (error.message || proxyError.message);
        throw new Error(finalMessage || 'AI generation failed');
    }
  }
}

export async function generateImage(prompt: string) {
  try {
    if (isKeyPlaceholder) {
      throw new Error("No valid API key in frontend");
    }

    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: modelNames.image });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const result = response.response;
    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    const text = result.text();
    if (text && text.length > 100 && !text.includes(' ')) {
        return `data:image/png;base64,${text}`;
    }

    return null;
  } catch (error: any) {
    console.warn("Gemini Image SDK failed or bypassed:", error.message);
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

