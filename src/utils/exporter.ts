/**
 * MelodyForge – MIDI & WAV Exporter
 * Creates standard .mid files via @tonejs/midi and handles file downloads
 */
import { Midi } from '@tonejs/midi';
import { NoteEvent } from '../types';

export function exportNotesToMidiBlob(
  notes: NoteEvent[],
  songTitle = 'melodyforge-ai-composition',
  bpm = 120
): Blob {
  const midi = new Midi();
  midi.header.name = songTitle;
  midi.header.setTempo(bpm);

  const track = midi.addTrack();
  track.name = 'MelodyForge AI Melody';
  track.channel = 0;

  for (const n of notes) {
    track.addNote({
      midi: Math.max(36, Math.min(96, n.midiNumber)),
      time: n.time,
      duration: Math.max(0.08, n.duration),
      velocity: Math.max(0.4, Math.min(1.0, n.velocity || 0.8)),
    });
  }

  const uint8 = midi.toArray();
  const copy = new Uint8Array(uint8);
  return new Blob([copy.buffer as ArrayBuffer], { type: 'audio/midi' });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
