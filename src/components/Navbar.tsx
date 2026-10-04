/**
 * MelodyForge – Sticky Top Navbar
 * Logo, Test Sound button, AudioStatus indicator, Quick Demo trigger, About Modal, and Theme Toggle
 */
import React from 'react';
import { Sparkles, Sun, Moon, HelpCircle, PlayCircle, Activity } from 'lucide-react';
import { AudioStatus } from './AudioStatus';

interface NavbarProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  onOpenAbout: () => void;
  onRunQuickDemo: () => void;
  isQuickDemoRunning: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeBackend: string;
  onTestSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  onSelectStep,
  onOpenAbout,
  onRunQuickDemo,
  isQuickDemoRunning,
  theme,
  onToggleTheme,
  activeBackend,
  onTestSound,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/85 border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              MelodyForge
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                AI
              </span>
            </span>
            <span className="hidden sm:block text-[11px] text-slate-400 font-sans -mt-0.5">
              Neural Music Studio
            </span>
          </div>
        </div>

        {/* Center / Right: AudioStatus + Quick Demo + Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Section 9.5: Test Sound Button (always visible in navbar) */}
          <AudioStatus compact onTestSound={onTestSound} />

          {/* Active Backend Badge */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-xs text-slate-300"
            title={`TensorFlow.js execution backend: ${activeBackend}`}
          >
            <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="font-mono text-[10px] text-slate-400">GPU:</span>
            <span className="font-mono font-semibold text-cyan-300 uppercase text-[11px]">
              {activeBackend || 'WebGL'}
            </span>
          </div>

          {/* Quick Demo Button */}
          <button
            onClick={onRunQuickDemo}
            disabled={isQuickDemoRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${
              isQuickDemoRunning
                ? 'bg-purple-900/50 text-purple-300 border border-purple-500/40 cursor-wait'
                : 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-purple-500/20 hover:shadow-cyan-500/25 active:scale-95'
            }`}
            title="Auto-load sample data, train small model, and generate audible music in under 60 seconds!"
          >
            <PlayCircle className={`w-3.5 h-3.5 ${isQuickDemoRunning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Quick Demo (60s)</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* About / Guide Button */}
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors"
            title="Learn how the neural music pipeline and audio engine work"
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">About</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
            aria-label="Toggle color theme"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
