import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "fake" });
try {
  ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "test",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          pages: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING" }
              },
              required: ["text"]
            }
          }
        },
        required: ["title", "pages"]
      }
    }
  });
  console.log("Success");
} catch (e) {
  console.error(e);
}
