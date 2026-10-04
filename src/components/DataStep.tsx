/**
 * MelodyForge – Step 1: Collect MIDI Data
 * File dropzone, 48 varied sample melodies with 1-click Audio Previews,
 * dataset metrics summary, genre tag chips, and external MIDI dataset links.
 */
import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Music,
  FileText,
  Trash2,
  Plus,
  Sparkles,
  Play,
  Square,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { MidiFileData } from '../types';
import { parseUploadedMidiFile } from '../utils/midiParser';
import { GENRE_METADATA, getFullSampleDataset } from '../utils/sampleData';
import { AudioEngine } from '../utils/audioEngine';

interface DataStepProps {
  midiFiles: MidiFileData[];
  onAddFiles: (files: MidiFileData[]) => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  selectedGenres: string[];
  onToggleGenreTag: (genre: string) => void;
  onProceed: () => void;
  onShowToast: (title: string, message?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const DataStep: React.FC<DataStepProps> = ({
  midiFiles,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  selectedGenres,
  onToggleGenreTag,
  onProceed,
  onShowToast,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [previewingGenreId, setPreviewingGenreId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const audioEngine = AudioEngine.getInstance();

  // Summary calculations
  const totalNotes = midiFiles.reduce((acc, f) => acc + f.totalNotes, 0);
  const totalDuration = midiFiles.reduce((acc, f) => acc + f.durationSeconds, 0);

  const detectedInstruments = Array.from(
    new Set(midiFiles.flatMap((f) => f.tracks.map((t) => t.instrument)))
  ).filter(Boolean);

  const keyCounts: Record<string, number> = {};
  midiFiles.forEach((f) => {
    if (f.keySignature) {
      keyCounts[f.keySignature] = (keyCounts[f.keySignature] || 0) + 1;
    }
  });
  const mostCommonKey = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'C Major';

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingUpload(true);

    const parsedList: MidiFileData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
        errors.push(`${file.name}: Not a .mid or .midi file`);
        continue;
      }

      try {
        const parsed = await parseUploadedMidiFile(file);
        if (parsed.totalNotes === 0) {
          errors.push(`${file.name}: No notes detected in file`);
        } else {
          parsedList.push(parsed);
        }
      } catch (err) {
        errors.push(`${file.name}: Parse error (${(err as Error).message})`);
      }
    }

    if (parsedList.length > 0) {
      onAddFiles(parsedList);
      onShowToast(
        `Imported ${parsedList.length} MIDI File${parsedList.length > 1 ? 's' : ''}`,
        `Extracted ${parsedList.reduce((acc, f) => acc + f.totalNotes, 0)} notes across tracks`,
        'success'
      );
    }

    if (errors.length > 0) {
      onShowToast('Import Notice', errors.join('; '), 'warning');
    }

    setIsProcessingUpload(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleLoadGenre = (genreId: string) => {
    const meta = GENRE_METADATA.find((g) => g.id === genreId);
    if (!meta) return;
    const melodies = meta.getMelodies();
    onAddFiles(melodies);
    onShowToast(
      `Loaded ${melodies.length} ${meta.genre} Melodies`,
      `Added ${melodies.reduce((acc, f) => acc + f.totalNotes, 0)} notes across varied keys & tempos`,
      'success'
    );
  };

  const handleLoadAllSamples = () => {
    const all = getFullSampleDataset();
    onAddFiles(all);
    onShowToast(
      'Loaded Full Sample Dataset (48 Melodies)',
      `Added 48 authentic tracks across Classical, Jazz, Blues, and Folk (${all.reduce((acc, f) => acc + f.totalNotes, 0)} total notes)`,
      'success'
    );
  };

  // Section 9.6: Preview a sample melody immediately to test audio without training
  const handleTogglePreviewGenre = async (genreId: string) => {
    if (previewingGenreId === genreId) {
      audioEngine.stop();
      setPreviewingGenreId(null);
      return;
    }

    const meta = GENRE_METADATA.find((g) => g.id === genreId);
    if (!meta) return;
    const melodies = meta.getMelodies();
    if (melodies.length === 0) return;

    const firstMelody = melodies[0];
    setPreviewingGenreId(genreId);

    onShowToast(`Auditioning ${meta.genre} Sample`, `Playing "${firstMelody.name}" at ${meta.bpm} BPM`, 'info');

    await audioEngine.playSequence(
      firstMelody.allNotes,
      meta.bpm,
      undefined,
      () => setPreviewingGenreId(null)
    );
  };

  const allGenresList = ['Classical', 'Jazz', 'Blues', 'Folk', 'Chopin', 'Bach', 'Ragtime'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-violet-400 font-mono text-xs uppercase tracking-wider">
            <span>Step 1 of 5</span>
            <span>•</span>
            <span>Input Dataset</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 font-display">Collect & Curate MIDI Files</h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload custom MIDI files or load 48 built-in authentic classical, jazz, blues, and folk compositions.
          </p>
        </div>

        {midiFiles.length > 0 && (
          <button
            onClick={onProceed}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <span>Preprocess Notes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dataset Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-xs text-slate-400">Total Files</span>
          <div className="text-2xl font-bold text-white font-display mt-1">{midiFiles.length}</div>
          <span className="text-[11px] text-violet-400 font-mono">.mid compositions</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-xs text-slate-400">Total Notes</span>
          <div className="text-2xl font-bold text-cyan-400 font-display mt-1">{totalNotes.toLocaleString()}</div>
          <span className="text-[11px] text-cyan-300/70 font-mono">polyphonic events</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-xs text-slate-400">Duration</span>
          <div className="text-2xl font-bold text-white font-display mt-1">
            {Math.floor(totalDuration / 60)}m {Math.round(totalDuration % 60)}s
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{totalDuration.toFixed(1)}s audio</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-xs text-slate-400">Detected Key</span>
          <div className="text-xl font-bold text-amber-300 font-display mt-1 truncate">{mostCommonKey}</div>
          <span className="text-[11px] text-slate-400 font-mono">tonal center</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-xs text-slate-400">Instruments</span>
          <div className="text-xl font-bold text-emerald-400 font-display mt-1 truncate">
            {detectedInstruments.length || 1} Types
          </div>
          <span className="text-[11px] text-slate-400 font-mono truncate block">
            {detectedInstruments[0] || 'Acoustic Piano'}
          </span>
        </div>
      </div>

      {/* Main Grid: Upload Dropzone & Sample Datasets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Drag and Drop Upload */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            Upload Custom MIDI Files
          </h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[190px] ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20 shadow-xl shadow-cyan-500/10'
                : 'border-white/15 bg-slate-900/40 hover:bg-slate-900/70 hover:border-purple-500/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".mid,.midi"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm font-medium text-white">
              {isProcessingUpload ? 'Parsing MIDI files...' : 'Drag & drop .mid or .midi files here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">or click to browse your computer</p>
            <p className="text-[11px] text-violet-300/80 mt-3 font-mono">
              Extracts melody track, chords & durations automatically
            </p>
          </div>

          {/* Genre Tag Chips */}
          <div className="pt-1">
            <span className="text-xs text-slate-400 font-mono block mb-2">Dataset Genre Labels:</span>
            <div className="flex flex-wrap gap-1.5">
              {allGenresList.map((g) => {
                const isSelected = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => onToggleGenreTag(g)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    #{g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* External MIDI Datasets References */}
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/5 space-y-1.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 font-mono flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              Recommended Free MIDI Datasets:
            </span>
            <ul className="space-y-1 text-[11px] text-slate-400 pl-1 list-disc list-inside">
              <li>
                <strong className="text-slate-300">Nottingham Folk Dataset:</strong> Over 1,000 British & American folk tunes.
              </li>
              <li>
                <strong className="text-slate-300">Lakh MIDI Dataset:</strong> 176,581 unique multi-track songs.
              </li>
              <li>
                <strong className="text-slate-300">Kaggle Classical Piano MIDI:</strong> High-quality Chopin, Bach, and Mozart.
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Load Built-in Sample Datasets */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Built-in Datasets (48 Varied Compositions)
            </h3>
            <button
              onClick={handleLoadAllSamples}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3 h-3" />
              Load All 48 Tracks
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GENRE_METADATA.map((card) => {
              const isPreviewing = previewingGenreId === card.id;

              return (
                <div
                  key={card.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-white/10 hover:border-violet-500/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">{card.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-cyan-300 shrink-0">
                        {card.count} Melodies
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 leading-snug">{card.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    {/* Section 9.6: 1-click preview of melody before training */}
                    <button
                      onClick={() => handleTogglePreviewGenre(card.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isPreviewing
                          ? 'bg-rose-600/40 border-rose-500 text-rose-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-white/10'
                      }`}
                      title="Preview sample melody with live audio synthesis"
                    >
                      {isPreviewing ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      <span>{isPreviewing ? 'Stop' : 'Preview'}</span>
                    </button>

                    <button
                      onClick={() => handleLoadGenre(card.id)}
                      className="px-3 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-xs font-semibold text-violet-200 transition-colors"
                    >
                      + Add 12 Tracks
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* File List Table */}
      {midiFiles.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Loaded Compositions ({midiFiles.length} files)
            </h3>
            <button
              onClick={onClearFiles}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Files
            </button>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-900/60">
            <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
              {midiFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-semibold text-white truncate">{file.name}</h5>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{file.totalNotes} notes</span>
                        <span>•</span>
                        <span>{file.durationSeconds}s</span>
                        <span>•</span>
                        <span className="text-cyan-400">{file.keySignature}</span>
                        <span>•</span>
                        <span className="text-violet-300 font-mono">{file.genre}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => audioEngine.playSequence(file.allNotes, 120)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                      title="Play melody audio preview"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
