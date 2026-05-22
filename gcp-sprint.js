import { GoogleGenAI } from "@google/genai";
import fs from "fs";

// This tells the unified SDK to connect directly to your $300 GCP credit balance
const ai = new GoogleGenAI({
  apiKey: process.env.VERTEX_API_KEY, 
  vertexai: true,
  project: process.env.GCP_PROJECT_ID,
  location: "us-central1"
});

async function runCodeAudit() {
  try {
    console.log("⏳ Sending codebase analysis to Gemini Pro using your GCP credits...");
    
    // CHANGE THIS: Replace 'src/App.js' with the path to any file you want to review!
    const targetFile = "src/App.js"; 
    const fileContent = fs.readFileSync(targetFile, "utf8");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", // The deep reasoning Pro model
      contents: `You are an expert software architect. Review this application file. Rewrite it to optimize the layout structure, fix any state tracking bugs, and ensure seamless modern component interactions:\n\n${fileContent}`,
    });

    console.log("\n🚀 Refactor Complete! Here is your optimized code:\n");
    console.log(response.text);
    
  } catch (error) {
    console.error("❌ Sprint connection failed:", error.message);
  }
}

runCodeAudit();