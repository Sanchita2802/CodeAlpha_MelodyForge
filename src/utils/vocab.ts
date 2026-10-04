/**
 * MelodyForge – Vocabulary Builder & Sliding-Window Preprocessing
 * Capped vocabulary (up to 300 tokens + <UNK>), transposition data augmentation (-3..+3 semitones),
 * stride-1 sliding window, and strict index range validation.
 */
import { PreprocessConfig, PreprocessedData, TokenStats } from '../types';
import { pitchToMidi, midiToPitch } from './sampleData';

const UNK_TOKEN = '<UNK>';
const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Transposes a token by a given semitone offset.
 * Works on single notes e.g. "C4|0.5" -> "D4|0.5" (+2)
 * and polyphonic chords e.g. "C4.E4.G4|1" -> "D4.F#4.A4|1" (+2).
 */
export function transposeToken(token: string, semitones: number): string {
  if (token === UNK_TOKEN || semitones === 0) return token;

  const [pitchPart, durPart] = token.split('|');
  const subPitches = pitchPart.split('.');

  const transposedPitches = subPitches.map((p) => {
    const midi = pitchToMidi(p);
    const clampedMidi = Math.max(36, Math.min(96, midi + semitones));
    return midiToPitch(clampedMidi);
  });

  // Deduplicate and re-sort
  const uniqueSorted = Array.from(new Set(transposedPitches.map(pitchToMidi)))
    .sort((a, b) => a - b)
    .map(midiToPitch);

  const newPitchPart = uniqueSorted.join('.');
  return durPart ? `${newPitchPart}|${durPart}` : newPitchPart;
}

export function buildVocabularyAndSequences(
  allFileTokens: string[][],
  config: PreprocessConfig,
  totalNotesAcrossFiles: number,
  fileCount: number
): PreprocessedData {
  // FIX: Data augmentation (transposition by -3, -2, -1, +1, +2, +3 semitones)
  const shouldAugment = config.augmentTranspose !== false;
  const transpositionOffsets = shouldAugment ? [-3, -2, -1, 0, 1, 2, 3] : [0];

  const augmentedFileTokens: string[][] = [];

  allFileTokens.forEach((melodyTokens) => {
    if (melodyTokens.length === 0) return;

    transpositionOffsets.forEach((semitones) => {
      if (semitones === 0) {
        augmentedFileTokens.push(melodyTokens);
      } else {
        const transposed = melodyTokens.map((tok) => transposeToken(tok, semitones));
        augmentedFileTokens.push(transposed);
      }
    });
  });

  const flatTokens: string[] = [];
  augmentedFileTokens.forEach((tokensList) => {
    flatTokens.push(...tokensList);
  });

  if (flatTokens.length === 0) {
    return {
      tokens: [],
      vocab: [UNK_TOKEN],
      tokenToIndex: { [UNK_TOKEN]: 0 },
      sequences: [],
      nextTokens: [],
      topTokens: [],
      pitchClassDistribution: PITCH_CLASSES.map((pc) => ({ pitchClass: pc, count: 0 })),
      totalSequences: 0,
      avgNotesPerFile: 0,
      examplePairs: [],
    };
  }

  // 1. Calculate token frequency counts
  const counts: Record<string, number> = {};
  for (const t of flatTokens) {
    counts[t] = (counts[t] || 0) + 1;
  }

  // 2. Sort tokens by frequency
  const sortedTokens = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  // 3. Cap vocabulary at config.vocabCap (default 300)
  const maxTokens = Math.max(10, Math.min(300, config.vocabCap || 300));
  const topSlice = sortedTokens.slice(0, maxTokens - 1); // reserve 1 slot for <UNK>

  // Vocab with <UNK> at index 0
  const vocab: string[] = [UNK_TOKEN, ...topSlice];
  const tokenToIndex: Record<string, number> = {};
  vocab.forEach((tok, idx) => {
    tokenToIndex[tok] = idx;
  });

  // Top 15 tokens for Recharts bar chart
  const topTokens: TokenStats[] = topSlice.slice(0, 15).map((tok) => {
    const rawNote = tok.includes('|') ? tok.split('|')[0] : tok;
    const isChord = rawNote.includes('.');
    const dur = tok.includes('|') ? parseFloat(tok.split('|')[1]) : undefined;

    return {
      token: tok,
      count: counts[tok] || 0,
      isChord,
      duration: dur,
    };
  });

  // 4. Pitch-class histogram (C through B)
  const pitchClassCounts: Record<string, number> = {};
  PITCH_CLASSES.forEach((pc) => (pitchClassCounts[pc] = 0));

  for (const tok of flatTokens) {
    const rawPitches = tok.split('|')[0].split('.');
    for (const p of rawPitches) {
      const midi = pitchToMidi(p);
      const pc = PITCH_CLASSES[midi % 12];
      pitchClassCounts[pc] = (pitchClassCounts[pc] || 0) + 1;
    }
  }

  const pitchClassDistribution = PITCH_CLASSES.map((pc) => ({
    pitchClass: pc,
    count: pitchClassCounts[pc],
  }));

  // 5. FIX: Stride-1 Sliding-window sequence creation
  // Move the window by exactly 1 token at a time: for melody length L and window N, gives L - N samples
  const sequences: number[][] = [];
  const nextTokens: number[] = [];
  const seqLen = config.sequenceLength;
  let skippedMelodiesCount = 0;

  augmentedFileTokens.forEach((melodyTokens, mIdx) => {
    // If a melody has fewer than seqLength + 1 tokens, skip it and log a message
    if (melodyTokens.length < seqLen + 1) {
      console.warn(
        `Melody #${mIdx + 1} has ${melodyTokens.length} tokens, fewer than sequence length + 1 (${seqLen + 1}). Skipping.`
      );
      skippedMelodiesCount++;
      return;
    }

    // Map tokens to integer indices in [0, vocab.length - 1]
    const indices: number[] = melodyTokens.map((t) =>
      tokenToIndex[t] !== undefined ? tokenToIndex[t] : 0
    );

    // Stride 1: move window by 1 token each step
    for (let i = 0; i <= indices.length - seqLen - 1; i++) {
      sequences.push(indices.slice(i, i + seqLen));
      nextTokens.push(indices[i + seqLen]);
    }
  });

  // FIX: Safety check: every token index must satisfy 0 <= index < vocabSize
  for (let i = 0; i < sequences.length; i++) {
    const row = sequences[i];
    for (let j = 0; j < row.length; j++) {
      if (row[j] < 0 || row[j] >= vocab.length) {
        console.error(
          `Offending token index: ${row[j]} at sequence sample ${i}, index ${j} (vocab size: ${vocab.length})`
        );
        throw new Error(
          `Vocabulary mismatch: token index out of range (offending index: ${row[j]}, vocab size ${vocab.length})`
        );
      }
    }
    if (nextTokens[i] < 0 || nextTokens[i] >= vocab.length) {
      console.error(
        `Offending target token index: ${nextTokens[i]} at sample ${i} (vocab size: ${vocab.length})`
      );
      throw new Error(
        `Vocabulary mismatch: token index out of range (offending target index: ${nextTokens[i]}, vocab size ${vocab.length})`
      );
    }
  }

  // 6. Generate 5 example (input sequence -> target) pairs for user inspectability
  const examplePairs: { input: string[]; target: string }[] = [];
  if (sequences.length > 0) {
    const sampleIndices = [
      0,
      Math.floor(sequences.length * 0.25),
      Math.floor(sequences.length * 0.5),
      Math.floor(sequences.length * 0.75),
      sequences.length - 1,
    ];

    sampleIndices.forEach((sIdx) => {
      if (sequences[sIdx]) {
        // Show last 6 tokens of the sliding window
        const inputTokens = sequences[sIdx].slice(-6).map((idx) => vocab[idx] || UNK_TOKEN);
        const targetToken = vocab[nextTokens[sIdx]] || UNK_TOKEN;
        examplePairs.push({
          input: inputTokens,
          target: targetToken,
        });
      }
    });
  }

  const avgNotesPerFile = fileCount > 0 ? Math.round(totalNotesAcrossFiles / fileCount) : 0;

  return {
    tokens: flatTokens,
    vocab,
    tokenToIndex,
    sequences,
    nextTokens,
    topTokens,
    pitchClassDistribution,
    totalSequences: sequences.length,
    avgNotesPerFile,
    examplePairs: examplePairs.slice(0, 5),
    skippedMelodiesCount,
  };
}
