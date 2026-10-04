/**
 * Interactive Piano Roll Canvas
 * High-performance 60fps rendering of MIDI notes, pitch grid, playhead, and glowing active notes
 */
import React, { useEffect, useRef, useState } from 'react';
import { NoteEvent } from '../types';
import { midiNumberToPitch } from '../utils/sampleData';

interface PianoRollProps {
  notes: NoteEvent[];
  currentTime?: number;
  totalDuration?: number;
  height?: number;
  interactive?: boolean;
  onSeek?: (time: number) => void;
  onNoteClick?: (note: NoteEvent) => void;
  theme?: 'dark' | 'light';
  emptyMessage?: string;
}

export const PianoRollCanvas: React.FC<PianoRollProps> = ({
  notes,
  currentTime = 0,
  totalDuration: propDuration,
  height = 240,
  interactive = true,
  onSeek,
  onNoteClick,
  theme = 'dark',
  emptyMessage = 'No notes to display',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNote, setHoveredNote] = useState<NoteEvent | null>(null);

  useEffect(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 600;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Dark vs light theme palette
    const isDark = theme === 'dark';
    const bgFill = isDark ? '#0D1322' : '#F8FAFC';
    const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const octaveLineColor = isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)';
    const textFill = isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.8)';

    // Clear background
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, width, height);

    if (notes.length === 0) {
      ctx.fillStyle = textFill;
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emptyMessage, width / 2, height / 2);
      return;
    }

    // Determine bounds
    let minMidi = 127;
    let maxMidi = 0;
    let maxTime = 0;

    for (const n of notes) {
      if (n.midiNumber < minMidi) minMidi = n.midiNumber;
      if (n.midiNumber > maxMidi) maxMidi = n.midiNumber;
      const endTime = n.time + (n.duration || 0.2);
      if (endTime > maxTime) maxTime = endTime;
    }

    // Padding bounds
    minMidi = Math.max(0, minMidi - 2);
    maxMidi = Math.min(127, maxMidi + 2);
    const midiRange = Math.max(12, maxMidi - minMidi + 1);
    const totalTime = propDuration || Math.max(maxTime, 4);

    const keyWidth = 42;
    const rollWidth = width - keyWidth;
    const noteHeight = height / midiRange;

    // Draw pitch row backgrounds (black keys vs white keys)
    for (let m = minMidi; m <= maxMidi; m++) {
      const y = height - (m - minMidi + 1) * noteHeight;
      const pitchClass = m % 12;
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitchClass);

      ctx.fillStyle = isBlackKey
        ? isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(226, 232, 240, 0.5)'
        : isDark ? 'rgba(30, 41, 59, 0.25)' : 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(keyWidth, y, rollWidth, noteHeight);

      // Pitch row dividing line
      ctx.strokeStyle = pitchClass === 0 ? octaveLineColor : gridLineColor;
      ctx.lineWidth = pitchClass === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Key label on the left gutter
      if (pitchClass === 0 || m === minMidi || m === maxMidi || noteHeight >= 14) {
        ctx.fillStyle = isBlackKey
          ? isDark ? '#334155' : '#CBD5E1'
          : isDark ? '#1E293B' : '#F1F5F9';
        ctx.fillRect(0, y, keyWidth - 2, noteHeight);

        ctx.fillStyle = isDark ? (pitchClass === 0 ? '#C084FC' : '#94A3B8') : (pitchClass === 0 ? '#7C3AED' : '#475569');
        ctx.font = `${Math.min(11, Math.max(8, noteHeight - 2))}px Inter, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(midiNumberToPitch(m), keyWidth - 6, y + noteHeight / 2);
      }
    }

    // Vertical time grid bars (every 1 second or 0.5 second)
    const stepTime = totalTime > 15 ? 2.0 : 1.0;
    for (let t = 0; t <= totalTime; t += stepTime) {
      const x = keyWidth + (t / totalTime) * rollWidth;
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Time label
      ctx.fillStyle = textFill;
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${t.toFixed(0)}s`, x + 3, 3);
    }

    // Draw notes
    for (const note of notes) {
      const x = keyWidth + (note.time / totalTime) * rollWidth;
      const noteW = Math.max(3, (note.duration / totalTime) * rollWidth - 1);
      const y = height - (note.midiNumber - minMidi + 1) * noteHeight;
      const noteH = Math.max(2, noteHeight - 1);

      const isPlaying = currentTime >= note.time && currentTime <= (note.time + note.duration);
      const isHovered = hoveredNote === note;

      if (isPlaying) {
        // Glowing active note!
        ctx.shadowColor = '#06B6D4';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#22D3EE'; // Cyan-400
      } else if (isHovered) {
        ctx.shadowColor = '#A855F7';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#C084FC';
      } else {
        ctx.shadowBlur = 0;
        // Pitch-based gradient (violet to cyan)
        const pitchNorm = (note.midiNumber - minMidi) / midiRange;
        // Interpolate #8B5CF6 to #06B6D4
        const r = Math.round(139 + (6 - 139) * pitchNorm);
        const g = Math.round(92 + (182 - 92) * pitchNorm);
        const b = Math.round(246 + (212 - 246) * pitchNorm);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.85 + (note.velocity || 0.8) * 0.15})`;
      }

      // Rounded rectangle for note block with fallback for browsers without roundRect
      const radius = Math.max(0, Math.min(3, noteH / 2, noteW / 2));
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function' && radius > 0) {
        ctx.roundRect(x, y, noteW, noteH, radius);
      } else {
        ctx.rect(x, y, noteW, noteH);
      }
      ctx.fill();

      // Reset shadow blur
      ctx.shadowBlur = 0;

      // Note inner border
      ctx.strokeStyle = isPlaying ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = isPlaying ? 1.5 : 0.6;
      ctx.stroke();
    }

    // Playhead line
    if (currentTime > 0 && currentTime <= totalTime) {
      const playheadX = keyWidth + (currentTime / totalTime) * rollWidth;

      // Glow behind playhead
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead triangle handle at top
      ctx.fillStyle = '#06B6D4';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 10);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  } catch (err) {
    console.warn('Piano roll canvas draw error:', err);
  }
  }, [notes, currentTime, propDuration, height, theme, hoveredNote, emptyMessage]);

  // Handle canvas clicks to seek or preview
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || notes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const keyWidth = 42;
    const rollWidth = rect.width - keyWidth;

    if (x >= keyWidth && onSeek) {
      let maxTime = 0;
      for (const n of notes) {
        const endTime = n.time + (n.duration || 0.2);
        if (endTime > maxTime) maxTime = endTime;
      }
      const totalTime = propDuration || Math.max(maxTime, 4);
      const clickedTime = Math.max(0, ((x - keyWidth) / rollWidth) * totalTime);
      onSeek(clickedTime);
    }

    // Check if clicked a note
    if (onNoteClick) {
      let minMidi = 127;
      let maxMidi = 0;
      let maxTime = 0;
      for (const n of notes) {
        if (n.midiNumber < minMidi) minMidi = n.midiNumber;
        if (n.midiNumber > maxMidi) maxMidi = n.midiNumber;
        const endTime = n.time + (n.duration || 0.2);
        if (endTime > maxTime) maxTime = endTime;
      }
      minMidi = Math.max(0, minMidi - 2);
      maxMidi = Math.min(127, maxMidi + 2);
      const midiRange = Math.max(12, maxMidi - minMidi + 1);
      const totalTime = propDuration || Math.max(maxTime, 4);
      const noteHeight = height / midiRange;

      const clickedNote = notes.find((n) => {
        const noteX = keyWidth + (n.time / totalTime) * rollWidth;
        const noteW = Math.max(4, (n.duration / totalTime) * rollWidth);
        const noteY = height - (n.midiNumber - minMidi + 1) * noteHeight;
        return x >= noteX && x <= noteX + noteW && y >= noteY && y <= noteY + noteHeight;
      });

      if (clickedNote) {
        onNoteClick(clickedNote);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || notes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const keyWidth = 42;
    const rollWidth = rect.width - keyWidth;

    let minMidi = 127;
    let maxMidi = 0;
    let maxTime = 0;
    for (const n of notes) {
      if (n.midiNumber < minMidi) minMidi = n.midiNumber;
      if (n.midiNumber > maxMidi) maxMidi = n.midiNumber;
      const endTime = n.time + (n.duration || 0.2);
      if (endTime > maxTime) maxTime = endTime;
    }
    minMidi = Math.max(0, minMidi - 2);
    maxMidi = Math.min(127, maxMidi + 2);
    const midiRange = Math.max(12, maxMidi - minMidi + 1);
    const totalTime = propDuration || Math.max(maxTime, 4);
    const noteHeight = height / midiRange;

    const hit = notes.find((n) => {
      const noteX = keyWidth + (n.time / totalTime) * rollWidth;
      const noteW = Math.max(4, (n.duration / totalTime) * rollWidth);
      const noteY = height - (n.midiNumber - minMidi + 1) * noteHeight;
      return x >= noteX && x <= noteX + noteW && y >= noteY && y <= noteY + noteHeight;
    });

    setHoveredNote(hit || null);
  };

  return (
    <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden border border-white/10 shadow-inner group">
      <canvas
        ref={canvasRef}
        className={`w-full block ${interactive ? 'cursor-pointer' : ''}`}
        style={{ height: `${height}px` }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNote(null)}
      />
      {hoveredNote && (
        <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 text-xs px-2.5 py-1 rounded-md text-purple-200 pointer-events-none shadow-lg animate-in fade-in duration-150">
          <span className="font-semibold text-white">{hoveredNote.pitch}</span> (MIDI {hoveredNote.midiNumber}) • {(hoveredNote.time).toFixed(2)}s • {(hoveredNote.duration).toFixed(2)}s
        </div>
      )}
    </div>
  );
};
