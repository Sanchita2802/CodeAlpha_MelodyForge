/**
 * MelodyForge – Step 2: Preprocess into Note Sequences
 * Note & chord extraction (music21-style), duration quantizing, vocabulary capping,
 * sliding-window inspection, Recharts frequency charts, and canvas piano-roll preview.
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Sliders,
  ArrowRight,
  Play,
  CheckCircle2,
  Music,
  Clock,
  Layers,
  Sparkles,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { MidiFileData, PreprocessConfig, PreprocessedData } from '../types';
import { PianoRollCanvas } from './PianoRollCanvas';
import { AudioEngine } from '../utils/audioEngine';

interface PreprocessStepProps {
  midiFiles: MidiFileData[];
  config: PreprocessConfig;
  onChangeConfig: (newConfig: PreprocessConfig) => void;
  preprocessedData: PreprocessedData;
  onProceed: () => void;
  theme?: 'dark' | 'light';
}

export const PreprocessStep: React.FC<PreprocessStepProps> = ({
  midiFiles,
  config,
  onChangeConfig,
  preprocessedData,
  onProceed,
  theme = 'dark',
}) => {
  const firstFile = midiFiles[0];
  const audioEngine = AudioEngine.getInstance();

  const handlePreviewToken = (tok: string) => {
    const rawNote = tok.includes('|') ? tok.split('|')[0] : tok;
    audioEngine.playPreviewNote(rawNote, 0.5);
  };

  const chordCount = preprocessedData.vocab.filter((t) => t.includes('.')).length;
  const singleNoteCount = preprocessedData.vocab.length - chordCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
            <span>Step 2 of 5</span>
            <span>•</span>
            <span>Feature Engineering</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 font-display">
            Note & Chord Extraction (music21-style)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Parse multi-track MIDI, cluster polyphonic chords within 30ms, bucket durations, and build a sliding-window training matrix.
          </p>
        </div>

        <button
          onClick={onProceed}
          disabled={preprocessedData.totalSequences === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Configure Neural Model</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Section C: Warning card if fewer than 300 sequences */}
      {preprocessedData.totalSequences < 300 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Only {preprocessedData.totalSequences} training sequences. Results will be poor. Upload more MIDI files, enable augmentation, or load the sample dataset.
            {preprocessedData.totalSequences < 20 && (
              <span className="block mt-1 font-semibold text-rose-300">
                (Training is blocked until at least 20 sequences are generated.)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Preprocessing Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Sequence Length & Quantization Controls */}
        <div className="md:col-span-5 p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Context Window (Length)
            </label>
            <span className="font-mono text-sm font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
              {config.sequenceLength} tokens
            </span>
          </div>

          <input
            type="range"
            min="16"
            max="128"
            step="8"
            value={config.sequenceLength}
            onChange={(e) =>
              onChangeConfig({ ...config, sequenceLength: parseInt(e.target.value, 10) })
            }
            className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>16 (Fast)</span>
            <span>32 (Standard)</span>
            <span>64 (Phrases)</span>
            <span>128 (Long-range)</span>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-3">
            {/* Include Durations Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  Include Quantized Durations
                </span>
                <p className="text-[11px] text-slate-400">Tokens like "C4|0.5" using 0.25, 0.5, 1, 2, 4 beats</p>
              </div>
              <input
                type="checkbox"
                checked={config.includeDuration}
                onChange={(e) => onChangeConfig({ ...config, includeDuration: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </label>

            {/* Merge Tracks Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Merge All Tracks
                </span>
                <p className="text-[11px] text-slate-400">
                  {config.mergeAllTracks ? 'Combine all MIDI tracks' : 'Auto-select melody track with most notes'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.mergeAllTracks}
                onChange={(e) => onChangeConfig({ ...config, mergeAllTracks: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </label>

            {/* Section C: Augment Data (Transpose) Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Augment Data (Transpose)
                </span>
                <p className="text-[11px] text-slate-400">
                  Transpose melodies -3 to +3 semitones (multiplies sequences 7x)
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.augmentTranspose !== false}
                onChange={(e) =>
                  onChangeConfig({ ...config, augmentTranspose: e.target.checked })
                }
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Preprocess Metrics Cards */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Vocabulary Cap</span>
            <div className="text-3xl font-bold text-white font-display mt-1">
              {preprocessedData.vocab.length}
            </div>
            <span className="text-[11px] text-violet-400 font-mono">tokens (max 300)</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Training Samples</span>
            <div className="text-3xl font-bold text-cyan-400 font-display mt-1">
              {preprocessedData.totalSequences.toLocaleString()}
            </div>
            <span className="text-[11px] text-cyan-300/70 font-mono">X → y pairs</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Polyphonic Chords</span>
            <div className="text-3xl font-bold text-amber-400 font-display mt-1">{chordCount}</div>
            <span className="text-[11px] text-amber-400/70 font-mono">e.g. C4.E4.G4</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
            <span className="text-xs text-slate-400">Avg Notes / File</span>
            <div className="text-3xl font-bold text-emerald-400 font-display mt-1">
              {preprocessedData.avgNotesPerFile}
            </div>
            <span className="text-[11px] text-emerald-400/70 font-mono">notes per song</span>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Top 15 Most Frequent Tokens */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white font-display">Top 15 Most Frequent Tokens</h3>
              <p className="text-xs text-slate-400 mt-0.5">Click any token pill below to test its sound</p>
            </div>
            <span className="text-[11px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">
              Distribution
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={preprocessedData.topTokens} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="token"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-purple-500/40 p-2.5 rounded-lg text-xs shadow-xl">
                          <p className="font-semibold text-white">{data.token}</p>
                          <p className="text-purple-300 font-mono">Occurrences: {data.count}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">
                            {data.isChord ? 'Polyphonic chord cluster' : 'Monophonic note'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {preprocessedData.topTokens.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isChord ? '#F59E0B' : '#8B5CF6'}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Clickable token chips to audit sounds */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {preprocessedData.topTokens.slice(0, 10).map((t) => (
              <button
                key={t.token}
                onClick={() => handlePreviewToken(t.token)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-violet-900/50 border border-white/10 hover:border-violet-500/40 text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                title={`Audition pitch for ${t.token}`}
              >
                <Play className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                <span className="font-mono">{t.token}</span>
                <span className="text-[10px] text-slate-500">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart B: Pitch-Class Histogram */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white font-display">12-Tone Pitch Class Histogram</h3>
              <p className="text-xs text-slate-400 mt-0.5">Aggregated pitch classes across octaves</p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
              Chroma Profile
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={preprocessedData.pitchClassDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="pitchClass" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-cyan-500/40 p-2.5 rounded-lg text-xs shadow-xl">
                          <p className="font-semibold text-white">Tone {data.pitchClass}</p>
                          <p className="text-cyan-300 font-mono">Count: {data.count} notes</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5 text-xs text-slate-400 flex items-center justify-between">
            <span>High counts on tonic/dominant indicate tonal center stability.</span>
            <span className="font-mono text-slate-300">12 chromatic bins</span>
          </div>
        </div>
      </div>

      {/* Example (Input Sequence -> Target) Pairs Table */}
      {preprocessedData.examplePairs.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Example Sliding-Window Training Pairs (Input Sequence → Target)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Sparse integer encoding for GPU</span>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-mono border-b border-white/10 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Input Context Tokens (X)</th>
                  <th className="py-2.5 px-4">Target Next Note (y)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {preprocessedData.examplePairs.map((pair, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-4 text-violet-300">
                      [ ... {pair.input.join(', ')} ]
                    </td>
                    <td className="py-2.5 px-4 font-bold text-cyan-300">
                      → {pair.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw MIDI Piano-Roll Preview */}
      {firstFile && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                Raw MIDI Piano-Roll Preview: <span className="text-cyan-300 font-mono text-xs">{firstFile.name}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Interactive preview ({firstFile.totalNotes} notes, {firstFile.durationSeconds}s duration). Click notes to audition sound.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Key: <span className="text-amber-300">{firstFile.keySignature}</span>
            </div>
          </div>

          <PianoRollCanvas
            notes={firstFile.allNotes}
            height={200}
            theme={theme}
            interactive={true}
            onNoteClick={(n) => audioEngine.playPreviewNote(n.pitch, 0.4)}
          />
        </div>
      )}
    </div>
  );
};
