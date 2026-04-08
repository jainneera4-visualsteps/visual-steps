import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "fake" });
try {
  ai.models.generateContent({
    model: undefined as any,
    contents: undefined as any,
    config: undefined
  });
  console.log("Success");
} catch (e) {
  console.error(e);
}
