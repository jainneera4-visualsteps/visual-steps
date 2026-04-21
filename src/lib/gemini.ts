import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client
// The API key is injected by the platform at runtime
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export const modelNames = {
  flash: 'gemini-3.1-flash-lite-preview',
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
  const { 
    model = modelNames.flash, 
    systemInstruction, 
    prompt, 
    responseMimeType, 
    responseSchema,
    tools
  } = options;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType,
        responseSchema,
        tools,
      },
    });

    return response;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateImage(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: modelNames.image,
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Gemini Image API Error:", error);
    throw error;
  }
}

export { Type };
export default ai;
