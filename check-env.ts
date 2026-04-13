
import dotenv from 'dotenv';
dotenv.config();

console.log('--- Environment Variables ---');
for (const key in process.env) {
  if (key.includes('GEMINI') || key.includes('GOOGLE') || key.includes('KEY')) {
    const val = process.env[key] || '';
    console.log(`${key}: length=${val.length}, prefix=${val.substring(0, 5)}`);
  }
}
