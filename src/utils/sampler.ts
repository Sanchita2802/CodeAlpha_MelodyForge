/**
 * MelodyForge – Stochastic Sampler & Note Event Generator (Section F)
 * Temperature-controlled probability sampling using float32 tensors,
 * numerical stability via max subtraction, UNK token suppression,
 * and random baseline sequence generation.
 */
import * as tf from '@tensorflow/tfjs';
import { NoteEvent } from '../types';
import { midiToPitch, pitchToMidi } from './sampleData';

export interface GenerationProgress {
  step: number;
  total: number;
  latestToken: string;
}

/**
 * Section F: Apply temperature sampling in plain JavaScript.
 * Take log of probs (add 1e-8 to avoid log(0)), divide by temperature,
 * subtract max for numerical stability, exponentiate, normalize, and sample.
 */
export function sampleWithTemperature(
  probabilities: Float32Array | Int32Array | Uint8Array | number[],
  temperature = 0.9,
  unkIndex = 0
): number {
  const T = Math.max(0.1, Math.min(2.0, temperature));
  const n = probabilities.length;

  // 1. Convert to array and set <UNK> probability to 0
  const logits: number[] = new Array(n);
  let maxLogit = -Infinity;

  for (let i = 0; i < n; i++) {
    let p = probabilities[i];
    if (i === unkIndex || p <= 0 || isNaN(p)) {
      p = 0;
      logits[i] = -1e9;
    } else {
      const logit = Math.log(p + 1e-8) / T;
      logits[i] = logit;
      if (logit > maxLogit) {
        maxLogit = logit;
      }
    }
  }

  // 2. Subtract max for numerical stability & exponentiate
  const expScores: number[] = new Array(n);
  let sumExp = 0;

  for (let i = 0; i < n; i++) {
    if (logits[i] <= -1e8) {
      expScores[i] = 0;
    } else {
      const val = Math.exp(logits[i] - maxLogit);
      expScores[i] = val;
      sumExp += val;
    }
  }

  if (sumExp === 0) {
    // Fallback if all scores underflowed: pick uniform non-UNK
    const fallbackIdx = Math.floor(Math.random() * (n - 1)) + 1;
    return fallbackIdx;
  }

  // 3. Sample from normalized cumulative distribution
  const rand = Math.random() * sumExp;
  let cumulative = 0;

  for (let i = 0; i < n; i++) {
    cumulative += expScores[i];
    if (rand <= cumulative) {
      if (i === unkIndex && n > 1) {
        return (i + 1) % n;
      }
      return i;
    }
  }

  return Math.min(n - 1, unkIndex === n - 1 ? 0 : n - 1);
}

/**
 * Section F: Neural sequence generation loop with float32 tensors and tensor disposal
 */
export async function generateSequence(
  model: tf.LayersModel,
  seedIndices: number[],
  sequenceLength: number,
  notesToGenerate: number,
  temperature: number,
  vocab: string[],
  onProgress?: (progress: GenerationProgress) => void
): Promise<string[]> {
  const generatedTokens: string[] = [];
  const vocabSize = vocab.length;
  const unkIndex = vocab.indexOf('<UNK>');

  // Ensure current window has exactly sequenceLength tokens and all are valid indices < vocabSize
  let currentWindow: number[] = seedIndices.map((idx) =>
    Math.max(0, Math.min(vocabSize - 1, Math.floor(idx)))
  );

  while (currentWindow.length < sequenceLength) {
    currentWindow.unshift(currentWindow[0] ?? (vocabSize > 1 ? 1 : 0));
  }
  if (currentWindow.length > sequenceLength) {
    currentWindow = currentWindow.slice(-sequenceLength);
  }

  for (let step = 0; step < notesToGenerate; step++) {
    // FIX: Section F - float32 input tensor and explicit tensor disposal
    const input = tf.tensor2d([currentWindow], [1, sequenceLength], 'float32');
    const output = model.predict(input) as tf.Tensor;
    const probs = await output.data(); // Float32Array of length vocabSize
    input.dispose();
    output.dispose();

    // Sample next token index using plain JavaScript temperature sampling
    const predictedIndex = sampleWithTemperature(probs, temperature, unkIndex);

    let chosenToken = vocab[predictedIndex] || vocab[1] || 'C4|0.5';
    if (chosenToken === '<UNK>') {
      // Resample fallback if <UNK> was somehow selected
      chosenToken = vocab[Math.floor(Math.random() * (vocab.length - 1)) + 1] || 'C4|0.5';
    }

    generatedTokens.push(chosenToken);

    // Slide window forward
    currentWindow.shift();
    currentWindow.push(predictedIndex);

    if (onProgress && (step % 5 === 0 || step === notesToGenerate - 1)) {
      onProgress({
        step: step + 1,
        total: notesToGenerate,
        latestToken: chosenToken,
      });
      await tf.nextFrame();
    }
  }

  return generatedTokens;
}

/**
 * Section 6: Random-notes baseline generator
 * Generates a random melody from the same vocabulary for comparative analysis.
 */
export function generateRandomBaseline(vocab: string[], count: number): string[] {
  const validVocab = vocab.filter((t) => t !== '<UNK>');
  const tokens: string[] = [];
  for (let i = 0; i < count; i++) {
    const randToken = validVocab[Math.floor(Math.random() * validVocab.length)] || 'C4|0.5';
    tokens.push(randToken);
  }
  return tokens;
}

/**
 * Converts token strings (e.g. "C4|0.5" or "C4.E4.G4|1") into timed NoteEvents
 */
export function tokensToNoteEvents(tokens: string[], bpm = 120): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const secondsPerBeat = 60 / bpm;
  let currentBeat = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '<UNK>') continue;

    let pitchPart = token;
    let durBeats = 0.5; // default 0.5 beat per step

    if (token.includes('|')) {
      const parts = token.split('|');
      pitchPart = parts[0];
      const parsedDur = parseFloat(parts[1]);
      if (!isNaN(parsedDur) && parsedDur > 0) {
        durBeats = parsedDur;
      }
    }

    const durSec = durBeats * secondsPerBeat;
    const timeSec = currentBeat * secondsPerBeat;

    // Subtle velocity variation (0.65 to 0.88) for human feel
    const vel = 0.72 + Math.sin(i * 0.6) * 0.12;

    const subPitches = pitchPart.split('.');
    for (const pStr of subPitches) {
      const rawMidi = pitchToMidi(pStr);
      // Clamp between 36 and 96
      const clampedMidi = Math.max(36, Math.min(96, rawMidi));
      const normalizedPitch = midiToPitch(clampedMidi);

      notes.push({
        pitch: normalizedPitch,
        midiNumber: clampedMidi,
        time: timeSec,
        duration: durSec,
        startTimeInBeats: currentBeat,
        durationInBeats: durBeats,
        velocity: Math.max(0.6, Math.min(0.9, vel)),
      });
    }

    currentBeat += durBeats;
  }

  return notes;
}
