/**
 * MelodyForge – Enable Sound Banner
 * Unlocks the Web Audio / Tone.js AudioContext via an explicit user gesture.
 */
import React from 'react';
import { Volume2, Sparkles, Check } from 'lucide-react';

interface EnableSoundBannerProps {
  isUnlocked: boolean;
  onUnlock: () => void;
}

export const EnableSoundBanner: React.FC<EnableSoundBannerProps> = ({ isUnlocked, onUnlock }) => {
  if (isUnlocked) return null;

  return (
    <div className="w-full bg-gradient-to-r from-violet-900/90 via-purple-900/90 to-cyan-900/90 border-b border-cyan-500/40 text-white px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-lg backdrop-blur-md sticky top-16 z-30 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-cyan-300 animate-pulse" />
        <span>
          <strong className="text-cyan-200">Audio is locked:</strong> Browsers require a click before allowing audible sound.
        </span>
      </div>

      <button
        onClick={onUnlock}
        className="px-3 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Enable Sound</span>
      </button>
    </div>
  );
};
