/**
 * MelodyForge – MIDI Parser
 * Uses @tonejs/midi to parse .mid/.midi files, extract melody or merged tracks,
 * cluster chords within 30ms, and quantize durations.
 */
import { Midi } from '@tonejs/midi';
import { MidiFileData, NoteEvent, ParsedTrack } from '../types';
import { midiToPitch, quantizeDurationBeats } from './sampleData';

const NOTE_CHORD_TIME_THRESHOLD_SEC = 0.03; // 30ms chord window

export async function parseUploadedMidiFile(file: File): Promise<MidiFileData> {
  const arrayBuffer = await file.arrayBuffer();
  return parseMidiBuffer(arrayBuffer, file.name, file.size);
}

export function parseMidiBuffer(
  buffer: ArrayBuffer,
  fileName = 'imported.mid',
  fileSize = buffer.byteLength,
  mergeAllTracks = false,
  includeDurations = true
): MidiFileData {
  const midi = new Midi(buffer);
  const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
  const secondsPerBeat = 60 / bpm;

  const parsedTracks: ParsedTrack[] = [];
  const allNotes: NoteEvent[] = [];

  midi.tracks.forEach((track, idx) => {
    if (track.notes.length === 0) return;

    const trackNotes: NoteEvent[] = track.notes.map((n) => {
      // Clamp MIDI pitch between 36 and 96
      const clampedMidi = Math.max(36, Math.min(96, n.midi));
      const pitchStr = midiToPitch(clampedMidi);
      const durBeats = quantizeDurationBeats(n.duration / secondsPerBeat);

      return {
        pitch: pitchStr,
        midiNumber: clampedMidi,
        time: n.time,
        duration: n.duration,
        startTimeInBeats: n.time / secondsPerBeat,
        durationInBeats: durBeats,
        velocity: Math.max(0.6, Math.min(0.9, n.velocity || 0.8)),
      };
    });

    parsedTracks.push({
      name: track.name || `Track ${idx + 1} (${track.instrument.family || 'Melody'})`,
      instrument: track.instrument.name || track.instrument.family || 'Acoustic Piano',
      notesCount: trackNotes.length,
      notes: trackNotes,
    });

    allNotes.push(...trackNotes);
  });

  // Decide melody track vs merge all tracks
  let activeNotes: NoteEvent[] = [];
  if (mergeAllTracks || parsedTracks.length <= 1) {
    activeNotes = allNotes;
  } else {
    // Pick the track with the most notes as the melody track
    const bestTrack = [...parsedTracks].sort((a, b) => b.notesCount - a.notesCount)[0];
    activeNotes = bestTrack ? bestTrack.notes : allNotes;
  }

  // Sort chronologically
  activeNotes.sort((a, b) => a.time - b.time);

  // Extract tokens
  const tokens = extractTokensFromNotes(activeNotes, includeDurations, secondsPerBeat);

  // Key signature estimation
  const keySignature = estimateKeySignature(activeNotes);

  const totalDuration = midi.duration || (activeNotes.length > 0 ? activeNotes[activeNotes.length - 1].time + 0.5 : 0);

  return {
    id: `midi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: fileName,
    sizeBytes: fileSize,
    durationSeconds: Math.round(totalDuration * 10) / 10,
    genre: 'Custom Upload',
    totalNotes: activeNotes.length,
    tracks: parsedTracks,
    allNotes: activeNotes,
    tokens,
    keySignature,
  };
}

/**
 * Groups notes starting within 30ms into chords,
 * and quantizes duration to 0.25, 0.5, 1, 2, 4 beats if includeDurations is true.
 */
export function extractTokensFromNotes(
  notes: NoteEvent[],
  includeDurations = true,
  secondsPerBeat = 0.5
): string[] {
  if (notes.length === 0) return [];

  const tokens: string[] = [];
  let i = 0;

  while (i < notes.length) {
    const currentNote = notes[i];
    const group: NoteEvent[] = [currentNote];
    let j = i + 1;

    while (
      j < notes.length &&
      Math.abs(notes[j].time - currentNote.time) <= NOTE_CHORD_TIME_THRESHOLD_SEC
    ) {
      group.push(notes[j]);
      j++;
    }

    // Quantized duration from current note
    const durBeats = currentNote.durationInBeats ?? quantizeDurationBeats(currentNote.duration / secondsPerBeat);

    let tokenBase = '';
    if (group.length === 1) {
      tokenBase = currentNote.pitch;
    } else {
      // Deduplicate and sort pitches
      const uniquePitches = Array.from(new Set(group.map((n) => n.midiNumber))).sort((a, b) => a - b);
      tokenBase = uniquePitches.map(midiToPitch).join('.');
    }

    if (includeDurations) {
      tokens.push(`${tokenBase}|${durBeats}`);
    } else {
      tokens.push(tokenBase);
    }

    i = j;
  }

  return tokens;
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function estimateKeySignature(notes: NoteEvent[]): string {
  if (notes.length === 0) return 'C Major';

  const counts = new Array(12).fill(0);
  for (const n of notes) {
    counts[n.midiNumber % 12] += 1;
  }

  const majorTemplate = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorTemplate = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  let bestKey = 'C Major';
  let bestScore = -Infinity;

  for (let root = 0; root < 12; root++) {
    let majorScore = 0;
    let minorScore = 0;
    for (let i = 0; i < 12; i++) {
      const idx = (root + i) % 12;
      majorScore += counts[idx] * majorTemplate[i];
      minorScore += counts[idx] * minorTemplate[i];
    }

    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestKey = `${PITCH_CLASSES[root]} Major`;
    }
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestKey = `${PITCH_CLASSES[root]} Minor`;
    }
  }

  return bestKey;
}
