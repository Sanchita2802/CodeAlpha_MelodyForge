/**
 * MelodyForge – Step 5: Music Generation & Polyphonic Playback Studio
 * 6 Synth instruments, temperature sampling, random-notes baseline,
 * animated piano roll, live level meter, embedded WAV audio player, and MIDI/WAV export.
 */
import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Download,
  Copy,
  Volume2,
  VolumeX,
  Sliders,
  RotateCcw,
  Dice5,
  Save,
  Check,
  Music,
  Radio,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GenerateConfig, GeneratedSong, InstrumentType, NoteEvent } from '../types';
import { PianoRollCanvas } from './PianoRollCanvas';
import { AudioVisualizer } from './AudioVisualizer';
import { AudioStatus } from './AudioStatus';
import { AudioEngine } from '../utils/audioEngine';
import { exportNotesToMidiBlob, triggerDownload } from '../utils/exporter';

interface GenerateStepProps {
  config: GenerateConfig;
  onChangeConfig: (newConfig: GenerateConfig) => void;
  isGenerating: boolean;
  generationProgress: number; // 0 - 100
  generatedTokens: string[];
  generatedNotes: NoteEvent[];
  hasTrainedModel: boolean;
  onGenerate: () => void;
  onGenerateRandomBaseline: () => void;
  onSaveToGallery: (song: GeneratedSong) => void;
  onShowToast: (title: string, message?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  theme?: 'dark' | 'light';
  datasetGenre?: string;
  onTestSound: () => void;
}

export const GenerateStep: React.FC<GenerateStepProps> = ({
  config,
  onChangeConfig,
  isGenerating,
  generationProgress,
  generatedTokens,
  generatedNotes,
  hasTrainedModel,
  onGenerate,
  onGenerateRandomBaseline,
  onSaveToGallery,
  onShowToast,
  theme = 'dark',
  datasetGenre = 'Classical / Jazz',
  onTestSound,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [volume, setVolume] = useState(0.85); // default audible volume
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isRenderingWav, setIsRenderingWav] = useState(false);
  const [renderedWavUrl, setRenderedWavUrl] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [songTitle, setSongTitle] = useState('Neural Melody Opus 1');

  const audioEngine = AudioEngine.getInstance();

  const totalDuration =
    generatedNotes.length > 0
      ? generatedNotes[generatedNotes.length - 1].time +
        (generatedNotes[generatedNotes.length - 1].duration || 0.4)
      : 0;

  // Instrument switcher
  useEffect(() => {
    audioEngine.setInstrument(config.instrument);
  }, [config.instrument]);

  // Volume control
  useEffect(() => {
    audioEngine.setVolumePercent(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (generatedNotes.length === 0) {
        onShowToast('No Notes Generated', 'Click "Compose New Melody" first', 'warning');
        return;
      }
      setIsPlaying(true);
      await audioEngine.playSequence(
        generatedNotes,
        config.tempo,
        (curTime) => setPlaybackTime(curTime),
        () => {
          setIsPlaying(false);
          setPlaybackTime(0);
        },
        isLooping
      );
    }
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleSeek = (timeSec: number) => {
    setPlaybackTime(timeSec);
    audioEngine.seek(timeSec);
  };

  const handleDownloadMidi = () => {
    if (generatedNotes.length === 0) return;
    try {
      const blob = exportNotesToMidiBlob(generatedNotes, songTitle, config.tempo);
      triggerDownload(blob, `${songTitle.toLowerCase().replace(/\s+/g, '-')}.mid`);
      onShowToast('Downloaded MIDI', `Saved ${songTitle}.mid`, 'success');
    } catch (err) {
      onShowToast('Export Error', (err as Error).message, 'error');
    }
  };

  const handleDownloadWav = async () => {
    if (generatedNotes.length === 0) return;
    setIsRenderingWav(true);
    try {
      onShowToast('Rendering Audio', 'Synthesizing offline 16-bit PCM WAV buffer...', 'info');
      const blob = await audioEngine.renderWav(generatedNotes, config.tempo, config.instrument);
      const url = URL.createObjectURL(blob);
      setRenderedWavUrl(url);
      triggerDownload(blob, `${songTitle.toLowerCase().replace(/\s+/g, '-')}.wav`);
      onShowToast('WAV Downloaded', 'Rendered studio-quality audio successfully!', 'success');
    } catch (err) {
      onShowToast('WAV Render Error', (err as Error).message, 'error');
    } finally {
      setIsRenderingWav(false);
    }
  };

  const handleCopySequence = () => {
    if (generatedTokens.length === 0) return;
    navigator.clipboard.writeText(generatedTokens.join(' -> '));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    onShowToast('Copied Note Sequence', `${generatedTokens.length} tokens copied to clipboard`, 'info');
  };

  const handleSaveComposition = () => {
    if (generatedNotes.length === 0) return;
    const newSong: GeneratedSong = {
      id: `song-${Date.now()}`,
      title: songTitle || 'Neural Composition',
      genre: datasetGenre,
      createdAt: Date.now(),
      temperature: config.temperature,
      bpm: config.tempo,
      instrument: config.instrument,
      tokens: generatedTokens,
      notes: generatedNotes,
      durationSeconds: Math.round(totalDuration * 10) / 10,
      wavBlobUrl: renderedWavUrl || undefined,
    };
    onSaveToGallery(newSong);
    confetti({ particleCount: 65, spread: 60, origin: { y: 0.7 } });
    onShowToast('Saved to Gallery', `"${newSong.title}" added to your browser gallery`, 'success');
  };

  // Section 9.2: 6 Oscillator-based synth instruments
  const instruments: { id: InstrumentType; label: string; icon: string; desc: string }[] = [
    { id: 'piano', label: 'Piano-like', icon: '🎹', desc: 'Triangle osc, natural decay & release' },
    { id: 'electricPiano', label: 'Electric Piano', icon: '⚡', desc: 'FM Synth with bell chime modulation' },
    { id: 'synthLead', label: 'Synth Lead', icon: '🎸', desc: 'Sawtooth wave with 3000 Hz lowpass filter' },
    { id: 'musicBox', label: 'Music Box', icon: '✨', desc: 'High harmonicity FM celesta chime' },
    { id: 'pluck', label: 'Pluck / Harp', icon: '🪕', desc: 'Crisp percussive attack, zero sustain' },
    { id: 'pad', label: 'Warm Pad', icon: '🌌', desc: 'Slow attack (0.5s), lush 2.0s sustain' },
  ];

  // Temperature description tooltip
  let tempDescription = 'T=0.9: Optimal balance of repetition and musical surprise.';
  if (config.temperature <= 0.4) {
    tempDescription = 'T<=0.4: Safe, repetitive, highly conservative melodic phrases.';
  } else if (config.temperature >= 1.2) {
    tempDescription = 'T>=1.2: Adventurous, chaotic, jazz-like chromatic dissonances.';
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-violet-400 font-mono text-xs uppercase tracking-wider">
            <span>Step 5 of 5</span>
            <span>•</span>
            <span>Synthesis & Composition</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 font-display">Generate Original Music</h2>
          <p className="text-sm text-slate-400 mt-1">
            Sample token probability distributions with temperature control and synthesize audible polyphonic audio.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Section 6: Random Baseline comparison button */}
          <button
            onClick={onGenerateRandomBaseline}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold active:scale-95 transition-all shadow-sm"
            title="Generate a random melody from the vocabulary to compare against the neural model"
          >
            <Dice5 className="w-3.5 h-3.5 text-amber-400" />
            <span>Random Baseline</span>
          </button>

          {/* Main Compose Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? `Composing (${generationProgress}%)...` : 'Compose New Melody'}</span>
          </button>
        </div>
      </div>

      {/* Sanity Check Warning if model not trained */}
      {!hasTrainedModel && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Notice:</strong> The model hasn't been trained yet. Click{' '}
            <button
              onClick={() => onGenerateRandomBaseline()}
              className="underline font-bold text-amber-300 hover:text-white"
            >
              "Random Baseline"
            </button>{' '}
            to audition the vocabulary, or return to Step 4 to train the network first.
          </div>
        </div>
      )}

      {/* Generation Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Notes Count */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span className="font-mono text-slate-400 uppercase text-[10px]">Notes to Generate</span>
            <span className="font-mono font-bold text-cyan-300">{config.notesCount} notes</span>
          </div>
          <input
            type="range"
            min="50"
            max="400"
            step="10"
            value={config.notesCount}
            onChange={(e) =>
              onChangeConfig({ ...config, notesCount: parseInt(e.target.value, 10) })
            }
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>50 (Short)</span>
            <span>100 (Standard)</span>
            <span>400 (Opus)</span>
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span className="font-mono text-slate-400 uppercase text-[10px] flex items-center gap-1">
              <span>Temperature (T)</span>
            </span>
            <span className="font-mono font-bold text-violet-300">{config.temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.5"
            step="0.05"
            value={config.temperature}
            onChange={(e) =>
              onChangeConfig({ ...config, temperature: parseFloat(e.target.value) })
            }
            className="w-full accent-violet-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
          <p className="text-[10px] text-slate-400 truncate" title={tempDescription}>
            {tempDescription}
          </p>
        </div>

        {/* Tempo (BPM) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span className="font-mono text-slate-400 uppercase text-[10px]">Playback Tempo</span>
            <span className="font-mono font-bold text-amber-300">{config.tempo} BPM</span>
          </div>
          <input
            type="range"
            min="60"
            max="180"
            step="4"
            value={config.tempo}
            onChange={(e) =>
              onChangeConfig({ ...config, tempo: parseInt(e.target.value, 10) })
            }
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>60 (Slow)</span>
            <span>120 (Standard)</span>
            <span>180 (Fast)</span>
          </div>
        </div>

        {/* Seed Source */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <span className="font-mono text-slate-400 uppercase text-[10px] block font-semibold">
            Seed Inception Window
          </span>
          <select
            value={config.seedChoice}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                seedChoice: e.target.value as 'random' | 'first' | 'tonic',
              })
            }
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
          >
            <option value="random">Random Seed from Dataset</option>
            <option value="first">Opening Theme Motif</option>
            <option value="tonic">Tonic Key Center (C4)</option>
          </select>
          <span className="text-[10px] text-slate-500 font-mono block">Initial sliding context</span>
        </div>
      </div>

      {/* Section 9.2: Instrument Sound Palette (6 synths) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white font-mono uppercase tracking-wider block">
            100% Oscillator-Based Synthesizers (No external samples required)
          </label>
          <span className="text-[10px] font-mono text-cyan-300">Tone.PolySynth (16 Voices)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {instruments.map((inst) => {
            const isSelected = config.instrument === inst.id;
            return (
              <button
                key={inst.id}
                onClick={() => onChangeConfig({ ...config, instrument: inst.id })}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all text-left ${
                  isSelected
                    ? 'bg-violet-600/30 border-violet-500 text-white shadow-md shadow-purple-500/20 ring-1 ring-violet-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{inst.icon}</span>
                  <div className="text-xs font-bold leading-tight">{inst.label}</div>
                </div>
                <div className="text-[9px] text-slate-400 mt-2 leading-tight">{inst.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Console: Piano Roll + Live Visualizer + Transport */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              className="bg-transparent font-display font-bold text-lg text-white border-b border-white/20 focus:border-cyan-400 outline-none px-1 py-0.5"
              placeholder="Name your song..."
            />
            <span className="text-xs text-slate-400 font-mono">
              ({generatedNotes.length} notes, {totalDuration.toFixed(1)}s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveComposition}
              disabled={generatedNotes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-xs font-semibold text-violet-200 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save to Gallery</span>
            </button>
          </div>
        </div>

        {/* Animated Piano Roll */}
        <PianoRollCanvas
          notes={generatedNotes}
          currentTime={playbackTime}
          totalDuration={totalDuration}
          height={260}
          interactive={true}
          onSeek={handleSeek}
          onNoteClick={(n) => audioEngine.playPreviewNote(n.pitch, 0.4)}
          theme={theme}
          emptyMessage="Click 'Compose New Melody' or 'Random Baseline' above to generate audible music!"
        />

        {/* Live Audio Visualizer + AudioStatus Level Meter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-8">
            <AudioVisualizer isPlaying={isPlaying} height={50} mode="waveform" theme={theme} />
          </div>
          <div className="lg:col-span-4">
            <AudioStatus onTestSound={onTestSound} />
          </div>
        </div>

        {/* Playback Transport Controls */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Main Controls: Play, Pause, Stop */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              disabled={generatedNotes.length === 0}
              className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 hover:brightness-110 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-all disabled:opacity-40"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title="Spacebar to Play/Pause"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={handleStop}
              disabled={generatedNotes.length === 0}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 active:scale-95 transition-colors disabled:opacity-40"
              aria-label="Stop playback"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            {/* Loop Toggle */}
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2.5 rounded-xl border transition-colors ${
                isLooping
                  ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'
              }`}
              title={isLooping ? 'Looping enabled' : 'Click to loop playback'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs text-slate-300 min-w-[70px]">
              {playbackTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>
          </div>

          {/* Seek Bar */}
          <div className="flex-1 w-full sm:mx-3">
            <input
              type="range"
              min="0"
              max={totalDuration || 1}
              step="0.05"
              value={playbackTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              disabled={generatedNotes.length === 0}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Volume Slider & Mute */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-white p-1"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-20 accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              title={`Master Volume: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>

        {/* Export & Rendered Audio Preview Player */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Export:</span>

            {/* Download MIDI */}
            <button
              onClick={handleDownloadMidi}
              disabled={generatedNotes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download .mid</span>
            </button>

            {/* Download WAV */}
            <button
              onClick={handleDownloadWav}
              disabled={generatedNotes.length === 0 || isRenderingWav}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-violet-400" />
              <span>{isRenderingWav ? 'Rendering WAV...' : 'Download .wav'}</span>
            </button>

            {/* Copy Note Sequence */}
            <button
              onClick={handleCopySequence}
              disabled={generatedTokens.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              {hasCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{hasCopied ? 'Copied!' : 'Copy Tokens'}</span>
            </button>
          </div>

          {/* Section 9.8: HTML5 <audio controls> player for rendered WAV */}
          {renderedWavUrl && (
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-violet-500/30">
              <span className="text-[10px] font-mono text-violet-300 px-2">Rendered WAV:</span>
              <audio controls src={renderedWavUrl} className="h-8 max-w-[200px]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
