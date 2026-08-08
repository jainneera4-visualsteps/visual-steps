import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper function to recursively collect code files
function getSourceFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getSourceFiles(fullPath, arrayOfFiles);
    } else if (/\.(js|jsx|ts|tsx|json)$/.test(file)) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function run() {
  // 1. Gather package.json context
  const packageJson = fs.existsSync('package.json')
    ? fs.readFileSync('package.json', 'utf8')
    : 'No package.json found';

  // 2. Gather file tree & code context from src/
  const srcFiles = getSourceFiles('src');
  const fileListText = srcFiles.length > 0 
    ? srcFiles.join('\n') 
    : 'No files found in src/';

  const prompt = `You are an expert developer assistant. 
Review the following project details and generate an updated, concise .github/copilot-instructions.md file for this codebase.

Project dependencies (package.json):
${packageJson}

Project structure in src/:
${fileListText}

Provide ONLY the markdown content for copilot-instructions.md without extra conversational text.`;

  // 3. Generate updated instructions using Gemini
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  // 4. Save to .github/copilot-instructions.md
  const outputPath = path.join('.github', 'copilot-instructions.md');
  fs.writeFileSync(outputPath, response.text, 'utf8');
  console.log('✅ copilot-instructions.md updated successfully using src/ context!');
}

run().catch((err) => {
  console.error('❌ Error updating instructions:', err);
  process.exit(1);
});