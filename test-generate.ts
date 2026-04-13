
import { apiFetch } from './src/utils/api'; // This won't work easily due to environment.

// I'll just use fetch directly, assuming I have the URL.
// The app runs on port 3000.
const url = 'http://localhost:3000/api/generate';

async function testGenerate() {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_TOKEN}` // Need a token
    },
    body: JSON.stringify({
      model: "gemini-3-flash-preview",
      contents: "Generate a quiz about cats.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING" },
                  options: { type: "ARRAY", items: { type: "STRING" } },
                  correctAnswerIndex: { type: "INTEGER" },
                  explanation: { type: "STRING" }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
              }
            }
          },
          required: ["title", "description", "questions"]
        }
      }
    })
  });
  
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Data:', JSON.stringify(data, null, 2));
}

// testGenerate(); // Can't easily run this without a token.
