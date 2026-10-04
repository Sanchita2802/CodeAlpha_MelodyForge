/**
 * MelodyForge – Generated Compositions Gallery
 * Cards with mini piano-roll preview, metadata, replay button, and MIDI/WAV download
 */
import React from 'react';
import { Play, Download, Trash2, Music, Sparkles } from 'lucide-react';
import { GeneratedSong } from '../types';
import { PianoRollCanvas } from './PianoRollCanvas';
import { exportNotesToMidiBlob, triggerDownload } from '../utils/exporter';
import { AudioEngine } from '../utils/audioEngine';

interface GalleryProps {
  songs: GeneratedSong[];
  onPlaySong: (song: GeneratedSong) => void;
  onDeleteSong: (id: string) => void;
  onClearGallery: () => void;
  theme?: 'dark' | 'light';
}

export const Gallery: React.FC<GalleryProps> = ({
  songs,
  onPlaySong,
  onDeleteSong,
  onClearGallery,
  theme = 'dark',
}) => {
  if (songs.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-2">
        <Music className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-300">No Saved Compositions Yet</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Generate melodies in Step 5 and click "Save to Gallery" to build your offline library of AI-composed tracks.
        </p>
      </div>
    );
  }

  const handleDownloadMidi = (song: GeneratedSong) => {
    const blob = exportNotesToMidiBlob(song.notes, song.title, song.bpm);
    triggerDownload(blob, `${song.title.toLowerCase().replace(/\s+/g, '-')}.mid`);
  };

  const handleDownloadWav = async (song: GeneratedSong) => {
    const audioEngine = AudioEngine.getInstance();
    const blob = await audioEngine.renderWav(song.notes, song.bpm, song.instrument);
    triggerDownload(blob, `${song.title.toLowerCase().replace(/\s+/g, '-')}.wav`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Generated Compositions Gallery ({songs.length})
          </h3>
          <p className="text-xs text-slate-400">Stored offline in browser localStorage</p>
        </div>

        <button
          onClick={onClearGallery}
          className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs.map((song) => (
          <div
            key={song.id}
            className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-cyan-500/40 transition-all space-y-3 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white font-display">{song.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>{song.genre}</span>
                    <span>•</span>
                    <span>T={song.temperature}</span>
                    <span>•</span>
                    <span>{song.bpm} BPM</span>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteSong(song.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                  aria-label="Delete song"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mini Piano Roll preview */}
              <div className="mt-3">
                <PianoRollCanvas
                  notes={song.notes}
                  height={85}
                  interactive={false}
                  theme={theme}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                {song.notes.length} notes • {song.durationSeconds}s
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDownloadMidi(song)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
                  title="Download .mid file"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-mono">.mid</span>
                </button>

                <button
                  onClick={() => handleDownloadWav(song)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
                  title="Download rendered .wav audio"
                >
                  <Download className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[10px] font-mono">.wav</span>
                </button>

                <button
                  onClick={() => onPlaySong(song)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
