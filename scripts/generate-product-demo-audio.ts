import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { demoNarrationText, demoScenes } from '../src/components/ProductDemoVideo';

const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Leda';
const INSTRUCTIONS = `Read the transcript exactly as written.

Use a warm, down-to-earth explainer voice. Sound like a friendly educator making an unfamiliar idea feel simple to a neighbor. Keep a light conversational energy and a subtle smile. Let short sentences breathe, pause naturally when the visual focus changes, and emphasize one idea at a time. Use a steady, unhurried pace and clear everyday language. Avoid sounding like an advertisement, a formal lecture, a dramatic performance, or a robotic announcement.`;
const outputDirectory = path.resolve('public/demo-audio');
const manifestPath = path.join(outputDirectory, 'manifest.json');
const requestedScene = process.argv.find(argument => argument.startsWith('--scene='))?.split('=')[1];
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
const confirmed = process.argv.includes('--confirm-generation');

type Manifest = {
  model: string;
  voice: string;
  disclosure: string;
  generatedAt?: string;
  scenes: Record<string, { url: string; scriptHash: string }>;
};

async function existingManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  } catch {
    return { model: MODEL, voice: VOICE, disclosure: 'AI-generated narration', scenes: {} };
  }
}

function scriptHash(input: string) {
  return createHash('sha256').update(JSON.stringify({ model: MODEL, voice: VOICE, instructions: INSTRUCTIONS, input })).digest('hex');
}

async function generateSpeech(input: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is required. Add it to .env locally; never add the key to browser code.');
  const client = new GoogleGenAI({ apiKey });
  const interaction = await client.interactions.create({
    model: MODEL,
    input: `${INSTRUCTIONS}\n\nTranscript:\n${input}`,
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: VOICE }] },
  });
  const encodedAudio = interaction.output_audio?.data;
  if (!encodedAudio) throw new Error('Gemini returned no narration audio. No clip was saved.');
  return pcmToWave(Buffer.from(encodedAudio, 'base64'));
}

function pcmToWave(pcm: Buffer, channels = 1, sampleRate = 24000, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const bytesPerSample = bitsPerSample / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  if (!dryRun && !confirmed) {
    throw new Error('No audio generated. Review `npm run audio:demo:check`, then rerun with `npm run audio:demo -- --confirm-generation`.');
  }
  await mkdir(outputDirectory, { recursive: true });
  const manifest = await existingManifest();
  const selectedScenes = demoScenes.map((scene, index) => ({ scene, index })).filter(({ scene }) => !requestedScene || scene.id === requestedScene);
  if (!selectedScenes.length) throw new Error(`Unknown scene "${requestedScene}".`);

  let generated = 0;
  for (const { scene, index } of selectedScenes) {
    const input = demoNarrationText(index);
    const hash = scriptHash(input);
    const current = manifest.scenes[scene.id];
    if (!force && current?.scriptHash === hash) {
      console.log(`Unchanged: ${scene.id}`);
      continue;
    }
    if (dryRun) {
      console.log(`Would generate: ${scene.id} (${input.length} characters)`);
      continue;
    }
    console.log(`Generating ${scene.id} with ${VOICE}...`);
    const audio = await generateSpeech(input);
    const finalPath = path.join(outputDirectory, `${scene.id}.wav`);
    const temporaryPath = `${finalPath}.tmp`;
    await writeFile(temporaryPath, audio);
    await rename(temporaryPath, finalPath);
    manifest.scenes[scene.id] = { url: `/demo-audio/${scene.id}.wav`, scriptHash: hash };
    generated += 1;
  }

  if (!dryRun && generated > 0) {
    manifest.model = MODEL;
    manifest.voice = VOICE;
    manifest.disclosure = 'AI-generated narration';
    manifest.generatedAt = new Date().toISOString();
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  console.log(dryRun ? 'Dry run complete; no audio was generated.' : `${generated} clip(s) generated. Existing unchanged clips were reused.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
