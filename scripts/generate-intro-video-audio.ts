import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { introNarrationText, introScenes } from '../src/components/IntroVideo';

const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Orus';
const INSTRUCTIONS = `Read the transcript exactly as written.

Present this as one connected, family-focused introduction rather than reading text from a slide. Use a warm, confident, welcoming presenter voice. Speak clearly at a natural conversational pace, carrying the audience smoothly from one idea to the next. Keep pauses brief so the complete ten-part presentation remains under one minute. Sound human and sincere, never theatrical, clinical, sales-focused, or overly excited.`;
const outputDirectory = path.resolve('public/intro-audio');
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

async function main() {
  if (!dryRun && !confirmed) throw new Error('No audio generated. Review `npm run audio:intro:check`, then rerun with `npm run audio:intro -- --confirm-generation`.');
  await mkdir(outputDirectory, { recursive: true });
  const manifest = await existingManifest();
  const selectedScenes = introScenes.map((scene, index) => ({ scene, index })).filter(({ scene }) => !requestedScene || scene.kind === requestedScene);
  if (!selectedScenes.length) throw new Error(`Unknown scene "${requestedScene}".`);

  let generated = 0;
  for (const { scene, index } of selectedScenes) {
    const input = introNarrationText(index);
    const hash = scriptHash(input);
    const current = manifest.scenes[scene.kind];
    if (!force && current?.scriptHash === hash) { console.log(`Unchanged: ${scene.kind}`); continue; }
    if (dryRun) { console.log(`Would generate: ${scene.kind} (${input.length} characters)`); continue; }
    const finalPath = path.join(outputDirectory, `${scene.kind}.wav`);
    if (!force && !current) {
      try {
        await access(finalPath);
        manifest.scenes[scene.kind] = { url: `/intro-audio/${scene.kind}.wav`, scriptHash: hash };
        manifest.model = MODEL;
        manifest.voice = VOICE;
        manifest.disclosure = 'AI-generated narration';
        manifest.generatedAt = new Date().toISOString();
        await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
        console.log(`Adopted existing clip: ${scene.kind}`);
        continue;
      } catch { /* Generate the missing clip below. */ }
    }
    console.log(`Generating ${scene.kind} with ${VOICE}...`);
    const audio = await generateSpeech(input);
    const temporaryPath = `${finalPath}.tmp`;
    await writeFile(temporaryPath, audio);
    await rename(temporaryPath, finalPath);
    manifest.scenes[scene.kind] = { url: `/intro-audio/${scene.kind}.wav`, scriptHash: hash };
    manifest.model = MODEL;
    manifest.voice = VOICE;
    manifest.disclosure = 'AI-generated narration';
    manifest.generatedAt = new Date().toISOString();
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    generated += 1;
  }

  console.log(dryRun ? 'Dry run complete; no audio was generated.' : `${generated} clip(s) generated. Existing unchanged clips were reused.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
