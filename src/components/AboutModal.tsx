/**
 * MelodyForge – About Modal & Audio Debug Diagnostics
 * Explains MIDI, note sequence tokenization, recurrent neural networks,
 * and includes a collapsible Section 9.9 Audio Debug Diagnostics panel.
 */
import React, { useState } from 'react';
import {
  X,
  Cpu,
  Layers,
  Music,
  Sparkles,
  Sliders,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { AudioEngine } from '../utils/audioEngine';
import { AudioDebugInfo } from '../types';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<AudioDebugInfo | null>(null);

  if (!isOpen) return null;

  const handleRefreshDebug = () => {
    const audioEngine = AudioEngine.getInstance();
    setDebugInfo(audioEngine.getDebugInfo());
  };

  const handleToggleDebug = () => {
    if (!isDebugOpen) {
      handleRefreshDebug();
    }
    setIsDebugOpen(!isDebugOpen);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl my-8 bg-slate-900 border border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-display">About MelodyForge AI</h2>
              <p className="text-xs text-slate-400">In-Browser Neural Music Studio (100% Client-Side)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2">
          {/* Privacy & Browser Highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/50 to-cyan-950/40 border border-violet-500/30 flex items-start gap-3.5">
            <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">100% Client-Side Machine Learning</h4>
              <p className="text-xs text-slate-300 mt-1">
                MelodyForge executes tensor computations, gradient backpropagation, MIDI parsing, and polyphonic sound synthesis entirely inside your browser via <strong>TensorFlow.js</strong> (WebGL GPU acceleration) and <strong>Tone.js</strong>. No audio, MIDI, or user data is ever sent to a remote server. No API keys required.
              </p>
            </div>
          </div>

          {/* What is MIDI? */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-cyan-400" />
              What is MIDI?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>MIDI (Musical Instrument Digital Interface)</strong> is not recorded audio or waveform data like MP3 or WAV. Instead, MIDI is a symbolic digital score: it stores musical instructions such as pitch numbers (e.g., 60 = Middle C), timing (when a note turns on and off), velocity (how hard it is struck), and channel instruments. This makes MIDI ideal for neural language models, which learn music as sequential symbolic tokens.
            </p>
          </div>

          {/* 5-Stage Pipeline */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              The 5-Stage Neural Music Pipeline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5" /> Stage 1: Data Ingestion
                </div>
                <p className="text-xs text-slate-300">
                  Loads 48 built-in authentic compositions across Baroque Classical, Bebop Jazz, 12-Bar Blues, and Celtic Folk, or parses your uploaded <code>.mid</code> files.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
                  <Cpu className="w-3.5 h-3.5" /> Stage 2: Tokenization
                </div>
                <p className="text-xs text-slate-300">
                  Extracts notes and clusters simultaneous pitches within 30ms into chord tokens (e.g. <code>C4.E4.G4</code>) and quantizes durations (0.25, 0.5, 1, 2, 4 beats). Caps vocab at 300 tokens + <code>&lt;UNK&gt;</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5" /> Stage 3: Neural Model
                </div>
                <p className="text-xs text-slate-300">
                  Constructs a sequential network with an Embedding layer, stacked LSTMs or GRUs with dropout regularization, and a dense softmax classification head.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5" /> Stage 4: WebGL Training
                </div>
                <p className="text-xs text-slate-300">
                  Trains the network on GPU tensors using Adam optimizer and sparse categorical crossentropy loss, keeping the UI at 60fps via <code>tf.nextFrame()</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Temperature Sampling */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Stochastic Temperature Sampling
            </h4>
            <div className="p-2.5 rounded-lg bg-black/40 font-mono text-xs text-violet-300 text-center">
              P(token_i) = exp(log(p_i) / T) / Σ exp(log(p_j) / T)
            </div>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li><strong>Low Temperature (0.2 – 0.5):</strong> Sharpens probability peaks, producing structured and repetitive melodic motifs.</li>
              <li><strong>Balanced (0.7 – 0.9):</strong> Optimal musical balance of thematic continuity and harmonic surprise.</li>
              <li><strong>High Temperature (1.0 – 1.5):</strong> Flattens probabilities, yielding adventurous, avant-garde, and jazz-like dissonances.</li>
            </ul>
          </div>

          {/* Section 9.9: Collapsible Audio Debug Diagnostics Panel */}
          <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/90">
            <button
              onClick={handleToggleDebug}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white font-mono">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Audio Engine Self-Test & Diagnostics</span>
              </div>
              {isDebugOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {isDebugOpen && (
              <div className="p-4 border-t border-white/10 space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Diagnostics Log:</span>
                  <button
                    onClick={handleRefreshDebug}
                    className="text-cyan-400 hover:underline text-[11px]"
                  >
                    Refresh Status
                  </button>
                </div>

                {debugInfo ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">Context State:</span>
                      <strong className={debugInfo.contextState === 'running' ? 'text-emerald-400' : 'text-amber-400'}>
                        {debugInfo.contextState}
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">Sample Rate:</span>
                      <strong className="text-cyan-300">{debugInfo.sampleRate} Hz</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">Master Volume:</span>
                      <strong className="text-white">{debugInfo.destinationVolumeDb.toFixed(1)} dB</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">Active Synth:</span>
                      <strong className="text-violet-300">{debugInfo.currentInstrument}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">Live Meter Level:</span>
                      <strong className="text-cyan-300">
                        {debugInfo.levelDb < -60 ? '-∞ dB' : `${debugInfo.levelDb.toFixed(1)} dB`}
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">Audio Engine Mode:</span>
                      <strong className={debugInfo.usingFallback ? 'text-amber-400' : 'text-emerald-400'}>
                        {debugInfo.usingFallback ? 'Raw Web Audio (Fallback)' : 'Tone.js Standard'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Click Refresh to inspect audio internals.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            Got It, Let's Compose!
          </button>
        </div>
      </div>
    </div>
  );
};
