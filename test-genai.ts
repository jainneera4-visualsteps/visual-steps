import { GoogleGenAI } from "@google/genai";

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Create a social story about: Going to the dentist.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "An interesting and engaging title for the story" },
            pages: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  text: { type: "STRING", description: "Friendly, interactive text for the page, consisting of exactly 2-3 sentences." }
                },
                required: ["text"]
              }
            }
          },
          required: ["title", "pages"]
        }
      }
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
test();
