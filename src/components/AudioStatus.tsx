/**
 * MelodyForge – Audio Status & Live Decibel Level Meter
 * Real-time monitoring of AudioContext state, output volume, live signal meter,
 * and 1-click Test Sound button.
 */
import React, { useEffect, useState } from 'react';
import { Volume2, Play, AlertCircle, CheckCircle2, Music2 } from 'lucide-react';
import { AudioEngine } from '../utils/audioEngine';

interface AudioStatusProps {
  onTestSound?: () => void;
  compact?: boolean;
}

export const AudioStatus: React.FC<AudioStatusProps> = ({ onTestSound, compact = false }) => {
  const [levelDb, setLevelDb] = useState(-Infinity);
  const [contextState, setContextState] = useState('suspended');
  const [volumeDb, setVolumeDb] = useState(-6);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [showNoSignalHint, setShowNoSignalHint] = useState(false);

  const audioEngine = AudioEngine.getInstance();

  useEffect(() => {
    let animId: number;
    let silentFrames = 0;

    const updateMeter = () => {
      const db = audioEngine.getMeterLevelDb();
      setLevelDb(db);
      setContextState(audioEngine.getContextState());
      setVolumeDb(audioEngine.getVolumeDb());

      // If test sound is playing but meter remains completely silent (<-55dB), show hint
      if (isPlayingTest) {
        if (db < -55) {
          silentFrames++;
          if (silentFrames > 60) {
            setShowNoSignalHint(true);
          }
        } else {
          silentFrames = 0;
          setShowNoSignalHint(false);
        }
      }

      animId = requestAnimationFrame(updateMeter);
    };

    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingTest]);

  const handleTestClick = async () => {
    setIsPlayingTest(true);
    setShowNoSignalHint(false);
    if (onTestSound) {
      onTestSound();
    } else {
      await audioEngine.playTestSound();
    }
    setTimeout(() => setIsPlayingTest(false), 1200);
  };

  // Convert dB (-60 to 0) to meter percentage (0% to 100%)
  const meterPercent = Math.max(0, Math.min(100, ((levelDb + 60) / 60) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleTestClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-semibold active:scale-95 transition-all shadow-sm"
          title="Play a clear C-major arpeggio (C4, E4, G4, C5) to test speakers"
        >
          <Play className={`w-3 h-3 text-cyan-400 fill-cyan-400 ${isPlayingTest ? 'animate-ping' : ''}`} />
          <span>Test Sound</span>
        </button>

        {/* Live Mini Meter */}
        <div
          className="w-12 h-2.5 bg-slate-900 border border-white/10 rounded-full overflow-hidden p-0.5"
          title={`Signal Level: ${levelDb.toFixed(1)} dB`}
        >
          <div
            className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-400"
            style={{ width: `${meterPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-glow" />
          <span className="text-xs font-semibold text-white font-display">Audio Engine</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${
              contextState === 'running'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            {contextState}
          </span>
        </div>

        <button
          onClick={handleTestClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all"
          title="Play a test C-Major arpeggio"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>{isPlayingTest ? 'Testing...' : 'Test Sound'}</span>
        </button>
      </div>

      {/* Meter Bar & dB reading */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Master: {volumeDb <= -40 ? 'Muted' : `${volumeDb.toFixed(1)} dB`}</span>
          <span>Meter: {levelDb < -60 ? '-∞' : `${levelDb.toFixed(1)} dB`}</span>
        </div>

        <div className="w-full h-3 bg-slate-950 border border-white/10 rounded-md overflow-hidden p-0.5 relative">
          <div
            className="h-full rounded-sm transition-all duration-75 bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500"
            style={{ width: `${meterPercent}%` }}
          />
        </div>
      </div>

      {showNoSignalHint && (
        <div className="p-2 rounded bg-amber-950/60 border border-amber-500/40 flex items-start gap-1.5 text-[11px] text-amber-200 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>No signal detected. Check your device volume, mute switch, and browser tab mute.</span>
        </div>
      )}
    </div>
  );
};
