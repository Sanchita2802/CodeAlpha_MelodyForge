/**
 * Live Audio Waveform & Spectrum Visualizer
 * Reads Float32Array from Tone.Analyser and renders smooth neon oscillations
 */
import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../utils/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  height?: number;
  mode?: 'waveform' | 'bars';
  theme?: 'dark' | 'light';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  height = 70,
  mode = 'waveform',
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioEngine = AudioEngine.getInstance();
    let phase = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 300;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      const isDark = theme === 'dark';
      ctx.clearRect(0, 0, width, height);

      // Waveform values (-1 to 1)
      const values = isPlaying ? audioEngine.getWaveformData() : null;
      const bufferLength = values ? values.length : 64;

      // Create gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#8B5CF6'); // violet-500
      gradient.addColorStop(0.5, '#A855F7'); // purple-500
      gradient.addColorStop(1, '#06B6D4'); // cyan-500

      if (mode === 'waveform') {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = gradient;
        ctx.shadowColor = '#06B6D4';
        ctx.shadowBlur = isPlaying ? 10 : 3;

        const sliceWidth = width / (bufferLength - 1);
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          let v = 0;
          if (values && isPlaying) {
            v = values[i];
          } else {
            // Gentle idle sine wave
            v = Math.sin(phase + i * 0.15) * 0.08;
          }

          const y = (v * (height * 0.42)) + (height / 2);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();
      } else {
        // Bars mode
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          let v = 0;
          if (values && isPlaying) {
            v = Math.abs(values[i]);
          } else {
            v = Math.abs(Math.sin(phase + i * 0.2)) * 0.15;
          }

          const barHeight = Math.max(3, v * height * 0.9);
          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }
      }

      ctx.restore();
      phase += 0.04;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, height, mode, theme]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-slate-950/60 border border-white/10 p-1 flex items-center">
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height: `${height}px` }}
      />
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
        <span className={`inline-block w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
        <span className="text-[10px] tracking-wider uppercase font-mono text-slate-400">
          {isPlaying ? 'Live Synth Output' : 'Audio Engine Idle'}
        </span>
      </div>
    </div>
  );
};
