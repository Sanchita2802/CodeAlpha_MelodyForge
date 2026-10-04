/**
 * Hero Section
 * Tagline: "Teach a neural network to compose."
 * Action buttons, animated gradient glow, pipeline highlights
 */
import React from 'react';
import { ArrowRight, Sparkles, PlayCircle, Cpu, Music, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onStartComposing: () => void;
  onRunQuickDemo: () => void;
  isQuickDemoRunning: boolean;
}

export const Hero: React.FC<HeroProps> = ({
  onStartComposing,
  onRunQuickDemo,
  isQuickDemoRunning,
}) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-16 text-center">
      {/* Background ambient radial gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-violet-600/20 via-purple-600/15 to-cyan-500/20 blur-3xl pointer-events-none -z-10 rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/30 text-purple-300 text-xs font-medium mb-6 shadow-lg shadow-purple-500/10">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>Interactive In-Browser Deep Learning</span>
          <span className="w-1 h-1 rounded-full bg-cyan-400" />
          <span className="text-slate-400">TensorFlow.js + Tone.js</span>
        </div>

        {/* Main Title & Tagline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight font-display">
          Teach a neural network to{' '}
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent underline decoration-cyan-500/30 decoration-wavy">
            compose.
          </span>
        </h1>

        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Upload MIDI files or pick authentic Bach, Jazz, and Blues motifs. Tokenize melodies, architect an LSTM or GRU recurrent network, train on your GPU, and generate original music in your browser.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onStartComposing}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-purple-500/25 hover:shadow-cyan-500/30 active:scale-95 transition-all"
          >
            <span>Start Composing</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onRunQuickDemo}
            disabled={isQuickDemoRunning}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 hover:border-cyan-500/40 text-sm sm:text-base font-semibold shadow-lg backdrop-blur-md active:scale-95 transition-all"
          >
            <PlayCircle className={`w-4 h-4 text-cyan-400 ${isQuickDemoRunning ? 'animate-spin' : ''}`} />
            <span>{isQuickDemoRunning ? 'Running Quick Demo...' : 'Quick Demo (60 seconds)'}</span>
          </button>
        </div>

        {/* Micro feature pills */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">WebGL Hardware GPU</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-2.5">
            <Music className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">Multi-Synth Playback</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">100% Private (No Cloud)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">MIDI & WAV Export</span>
          </div>
        </div>
      </div>
    </section>
  );
};
