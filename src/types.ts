/**
 * MelodyForge – AI Music Generator
 * Core TypeScript Definitions & Interfaces
 */

export interface NoteEvent {
  pitch: string; // e.g. "C4", "G#3"
  midiNumber: number; // 36 - 96 clamped
  time: number; // seconds
  duration: number; // seconds
  velocity: number; // 0.6 - 0.9
  startTimeInBeats?: number;
  durationInBeats?: number;
}

export interface ParsedTrack {
  name: string;
  instrument: string;
  notesCount: number;
  notes: NoteEvent[];
}

export interface MidiFileData {
  id: string;
  name: string;
  sizeBytes: number;
  durationSeconds: number;
  genre: string;
  totalNotes: number;
  tracks: ParsedTrack[];
  allNotes: NoteEvent[];
  tokens: string[]; // extracted token sequence
  keySignature: string;
  timeSignature?: string;
}

export interface TokenStats {
  token: string;
  count: number;
  isChord: boolean;
  duration?: number;
}

export interface PreprocessConfig {
  sequenceLength: number; // default 32
  includeDuration: boolean; // default true
  mergeAllTracks: boolean; // default false (pick melody track with most notes)
  vocabCap: number; // default 300
  augmentTranspose: boolean; // default true: transpose -3 to +3 semitones
}

export interface PreprocessedData {
  tokens: string[];
  vocab: string[]; // index -> token, capped at vocabCap with <UNK>
  tokenToIndex: Record<string, number>;
  sequences: number[][]; // [numSamples, sequenceLength]
  nextTokens: number[]; // [numSamples] integer target
  topTokens: TokenStats[];
  pitchClassDistribution: { pitchClass: string; count: number }[];
  totalSequences: number;
  avgNotesPerFile: number;
  examplePairs: { input: string[]; target: string }[];
  skippedMelodiesCount?: number;
}

export type ModelType = 'LSTM' | 'GRU';

export interface ModelHyperparams {
  architecture: ModelType;
  layers: number; // 1 - 3
  units: number; // 64, 128, 256
  dropout: number; // 0.0 - 0.5
  embeddingDim: number; // 32, 64, 128
  denseUnits: number; // 32, 64, 128
}

export interface TrainingHyperparams {
  epochs: number; // 1 - 100
  batchSize: number; // 32, 64, 128
  learningRate: number; // 0.001 - 0.01
  validationSplit: number; // 0.0 - 0.2
}

export interface EpochLog {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss?: number;
  valAccuracy?: number;
  timestamp: number;
}

export type InstrumentType =
  | 'piano'
  | 'electricPiano'
  | 'synthLead'
  | 'musicBox'
  | 'pluck'
  | 'pad';

export interface GenerateConfig {
  notesCount: number; // 50 - 500
  temperature: number; // 0.2 - 1.5, default 0.9
  tempo: number; // 60 - 180 BPM
  instrument: InstrumentType;
  seedChoice: 'random' | 'first' | 'tonic';
}

export interface GeneratedSong {
  id: string;
  title: string;
  genre: string;
  createdAt: number;
  temperature: number;
  bpm: number;
  instrument: InstrumentType;
  tokens: string[];
  notes: NoteEvent[];
  durationSeconds: number;
  wavBlobUrl?: string;
}

export type StepState = 'locked' | 'ready' | 'active' | 'completed';

export interface StepInfo {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  state: StepState;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}

export interface AudioDebugInfo {
  contextState: string;
  sampleRate: number;
  destinationVolumeDb: number;
  currentInstrument: string;
  levelDb: number;
  isUnlocked: boolean;
  transportState: string;
  scheduledEventsCount: number;
  usingFallback: boolean;
}
