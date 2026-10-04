/**
 * MelodyForge – Robust Audio Engine
 * 100% Oscillator-based polyphonic synthesis, Tone.Transport scheduling,
 * live level metering, fallback Web Audio synthesizer, and offline WAV rendering.
 */
import * as Tone from 'tone';
import { InstrumentType, NoteEvent, AudioDebugInfo } from '../types';

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private currentInstrument: InstrumentType = 'piano';
  private polySynth: Tone.PolySynth | null = null;
  private leadFilter: Tone.Filter | null = null;
  private limiter: Tone.Limiter | null = null;
  private analyser: Tone.Analyser | null = null;
  private meter: Tone.Meter | null = null;
  private currentPart: Tone.Part | null = null;
  private isInitialized = false;
  private isFallbackMode = false;
  private rawAudioCtx: AudioContext | null = null;

  // Track playback state
  private isPlaying = false;
  private isLooping = false;
  private playbackDuration = 0;
  private currentNotes: NoteEvent[] = [];
  private onProgressCallback?: (currentTime: number, totalDuration: number) => void;
  private onCompleteCallback?: () => void;
  private progressAnimFrame: number | null = null;

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Unlock and initialize the AudioContext upon user gesture.
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      await Tone.start();
      const ctx = Tone.getContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      await this.initChain();
      return ctx.state === 'running';
    } catch (err) {
      console.warn('Tone.start failed, falling back to raw Web Audio:', err);
      this.initFallbackWebAudio();
      return true;
    }
  }

  public isUnlocked(): boolean {
    try {
      return Tone.getContext().state === 'running';
    } catch {
      return false;
    }
  }

  public getContextState(): string {
    try {
      if (this.isFallbackMode) {
        return this.rawAudioCtx ? this.rawAudioCtx.state : 'fallback';
      }
      return Tone.getContext().state;
    } catch {
      return 'suspended';
    }
  }

  /**
   * Builds the Tone.js audio graph:
   * Synth -> [Filter] -> Limiter -> Analyser -> Meter -> Destination (-6 dB default)
   */
  private async initChain(): Promise<void> {
    if (this.isInitialized && this.polySynth) return;

    try {
      // 1. Set destination master volume to -6 dB (safe, audible level)
      Tone.getDestination().volume.value = -6;

      // 2. Limiter prevents clipping/distortion
      this.limiter = new Tone.Limiter(-1).toDestination();

      // 3. Live Analyser for waveform & FFT
      this.analyser = new Tone.Analyser('waveform', 128);
      this.limiter.connect(this.analyser);

      // 4. Live Meter for decibel level monitoring
      this.meter = new Tone.Meter({ smoothing: 0.8 });
      this.limiter.connect(this.meter);

      // 5. Synth Lead 3000 Hz Lowpass Filter
      this.leadFilter = new Tone.Filter({
        frequency: 3000,
        type: 'lowpass',
        rolloff: -12,
      }).connect(this.limiter);

      // 6. Build the active synthesizer
      this.createPolySynth(this.currentInstrument);

      this.isInitialized = true;
      this.logDebug('Initialized AudioEngine successfully');
    } catch (err) {
      console.error('Failed to init Tone chain, switching to fallback:', err);
      this.initFallbackWebAudio();
    }
  }

  /**
   * Instantiates one of the 6 oscillator-based polyphonic instruments.
   */
  private createPolySynth(type: InstrumentType): void {
    if (this.polySynth) {
      this.polySynth.releaseAll();
      this.polySynth.dispose();
      this.polySynth = null;
    }

    if (!this.limiter) {
      this.limiter = new Tone.Limiter(-1).toDestination();
    }

    const outputNode = type === 'synthLead' && this.leadFilter ? this.leadFilter : this.limiter;

    switch (type) {
      case 'piano':
        // Piano-like: triangle oscillator, quick attack, natural exponential release
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: {
            attack: 0.005,
            decay: 0.3,
            sustain: 0.2,
            release: 1.2,
          },
        }).connect(outputNode);
        break;

      case 'electricPiano':
        // Electric Piano: FM synth bell chime
        this.polySynth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3,
          modulationIndex: 10,
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.01,
            decay: 0.5,
            sustain: 0.3,
            release: 1.0,
          },
          modulation: { type: 'square' },
          modulationEnvelope: {
            attack: 0.02,
            decay: 0.2,
            sustain: 0.1,
            release: 0.5,
          },
        }).connect(outputNode);
        break;

      case 'synthLead':
        // Synth Lead: Sawtooth wave running through 3000 Hz lowpass filter
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: {
            attack: 0.01,
            decay: 0.4,
            sustain: 0.5,
            release: 0.6,
          },
        }).connect(outputNode);
        break;

      case 'musicBox':
        // Music Box: FM synth with high harmonicity and crystalline release
        this.polySynth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 5.5,
          modulationIndex: 8,
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.002,
            decay: 1.2,
            sustain: 0.02,
            release: 1.2,
          },
          modulationEnvelope: {
            attack: 0.002,
            decay: 0.3,
            sustain: 0.01,
            release: 0.4,
          },
        }).connect(outputNode);
        break;

      case 'pluck':
        // Pluck / Harp: crisp percussive attack, zero sustain, short acoustic decay
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.002,
            decay: 0.2,
            sustain: 0.0,
            release: 0.15,
          },
        }).connect(outputNode);
        break;

      case 'pad':
        // Lush Pad: warm slow attack and sweeping release
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle8' },
          envelope: {
            attack: 0.5,
            decay: 1.0,
            sustain: 0.8,
            release: 2.0,
          },
        }).connect(outputNode);
        break;
    }

    if (this.polySynth) {
      this.polySynth.maxPolyphony = 16;
    }
  }

  public setInstrument(type: InstrumentType): void {
    this.currentInstrument = type;
    if (this.isInitialized && !this.isFallbackMode) {
      this.createPolySynth(type);
    }
  }

  public getInstrument(): InstrumentType {
    return this.currentInstrument;
  }

  /**
   * Sets volume in percentage (0 to 1).
   * Maps 0 -> -Infinity (mute), 0.01..1 -> -40 dB to 0 dB.
   */
  public setVolumePercent(val: number): void {
    const clamped = Math.max(0, Math.min(1, val));
    if (clamped === 0) {
      Tone.getDestination().volume.value = -Infinity;
    } else {
      // Map 0.01..1 to -40 dB .. 0 dB
      const db = -40 + clamped * 40;
      Tone.getDestination().volume.rampTo(db, 0.05);
    }
  }

  public getVolumeDb(): number {
    try {
      return Tone.getDestination().volume.value;
    } catch {
      return -6;
    }
  }

  public getMeterLevelDb(): number {
    try {
      if (this.meter) {
        const val = this.meter.getValue();
        return Array.isArray(val) ? val[0] : val;
      }
      return -Infinity;
    } catch {
      return -Infinity;
    }
  }

  public getWaveformData(): Float32Array {
    try {
      if (this.analyser) {
        return this.analyser.getValue() as Float32Array;
      }
      return new Float32Array(128);
    } catch {
      return new Float32Array(128);
    }
  }

  public getAudioWaveformData(): Float32Array {
    return this.getWaveformData();
  }

  /**
   * Section 9.5: Test Sound Arpeggio (C4, E4, G4, C5).
   * Plays a clear C-major arpeggio so user confirms speakers work.
   */
  public async playTestSound(): Promise<void> {
    await this.unlockAudio();

    if (this.isFallbackMode) {
      this.playFallbackArpeggio();
      return;
    }

    try {
      await this.initChain();
      if (!this.polySynth) this.createPolySynth(this.currentInstrument);

      const notes = ['C4', 'E4', 'G4', 'C5'];
      const now = Tone.now() + 0.05;

      notes.forEach((pitch, i) => {
        this.polySynth?.triggerAttackRelease(pitch, 0.4, now + i * 0.22, 0.85);
      });

      this.logDebug('Test sound arpeggio triggered');
    } catch (err) {
      console.warn('Tone.js test sound failed, falling back:', err);
      this.playFallbackArpeggio();
    }
  }

  /**
   * Play a single preview note or chord immediately.
   */
  public async playPreviewNote(pitchOrChord: string, duration = 0.5): Promise<void> {
    await this.unlockAudio();

    if (this.isFallbackMode) {
      this.playFallbackTone(60, duration);
      return;
    }

    try {
      await this.initChain();
      if (!this.polySynth) this.createPolySynth(this.currentInstrument);

      const pitches = pitchOrChord.split('.');
      const now = Tone.now() + 0.02;
      this.polySynth?.triggerAttackRelease(pitches, duration, now, 0.8);
    } catch (err) {
      console.warn('Preview note failed:', err);
    }
  }

  /**
   * Section 9.4: Robust Tone.Transport Scheduling via Tone.Part.
   * Plays note sequence starting at 0 with 0.1s lead-in.
   */
  public async playSequence(
    notes: NoteEvent[],
    bpm = 120,
    onProgress?: (currentTime: number, totalDuration: number) => void,
    onComplete?: () => void,
    loop = false
  ): Promise<void> {
    await this.unlockAudio();

    if (this.isFallbackMode) {
      this.playFallbackSequence(notes, bpm, onProgress, onComplete);
      return;
    }

    try {
      await this.initChain();
      if (!this.polySynth) this.createPolySynth(this.currentInstrument);

      // Stop & cancel any existing transport events
      this.stop();

      if (notes.length === 0) return;

      this.currentNotes = notes;
      this.isLooping = loop;
      this.onProgressCallback = onProgress;
      this.onCompleteCallback = onComplete;
      this.isPlaying = true;

      // Set BPM
      Tone.Transport.bpm.value = Math.max(40, Math.min(240, bpm));

      // Compute total duration in seconds
      const secondsPerBeat = 60 / bpm;
      const lastNote = notes[notes.length - 1];
      const maxEndTimeBeats = (lastNote.startTimeInBeats ?? (lastNote.time / secondsPerBeat)) +
        (lastNote.durationInBeats ?? (lastNote.duration / secondsPerBeat));
      this.playbackDuration = maxEndTimeBeats * secondsPerBeat;

      // Build event array for Tone.Part
      // Group simultaneous notes into chord arrays to trigger polyphonically
      const eventMap = new Map<number, { notes: string[]; duration: number; velocity: number }>();

      for (const n of notes) {
        // Clamp MIDI pitch between 36 and 96
        const clampedMidi = Math.max(36, Math.min(96, n.midiNumber));
        const noteName = Tone.Frequency(clampedMidi, 'midi').toNote();

        const timeSec = n.startTimeInBeats !== undefined
          ? n.startTimeInBeats * secondsPerBeat
          : n.time;

        const durSec = n.durationInBeats !== undefined
          ? n.durationInBeats * secondsPerBeat
          : n.duration;

        // Round time to nearest 10ms for chord grouping
        const timeKey = Math.round(timeSec * 100) / 100;

        if (!eventMap.has(timeKey)) {
          eventMap.set(timeKey, {
            notes: [noteName],
            duration: Math.max(0.1, durSec * 0.95),
            velocity: Math.max(0.4, Math.min(1.0, n.velocity || 0.8)),
          });
        } else {
          const ev = eventMap.get(timeKey)!;
          if (!ev.notes.includes(noteName)) {
            ev.notes.push(noteName);
          }
        }
      }

      const partEvents = Array.from(eventMap.entries()).map(([time, data]) => ({
        time,
        notes: data.notes,
        duration: data.duration,
        velocity: data.velocity,
      }));

      // Create Tone.Part
      this.currentPart = new Tone.Part((time, value) => {
        if (this.polySynth) {
          this.polySynth.triggerAttackRelease(value.notes, value.duration, time, value.velocity);
        }
      }, partEvents);

      this.currentPart.loop = loop;
      this.currentPart.loopEnd = this.playbackDuration + 0.2;
      this.currentPart.start(0);

      // Reset transport position to 0 and start with 0.1s lead-in
      Tone.Transport.position = 0;
      Tone.Transport.start('+0.1');

      // Setup 60fps playhead polling loop
      this.startPlayheadTracker();

      this.logDebug(
        `Started Tone.Transport with ${partEvents.length} events, duration: ${this.playbackDuration.toFixed(2)}s`
      );
    } catch (err) {
      console.warn('Tone.js playSequence error, using fallback:', err);
      this.playFallbackSequence(notes, bpm, onProgress, onComplete);
    }
  }

  private startPlayheadTracker(): void {
    if (this.progressAnimFrame) {
      cancelAnimationFrame(this.progressAnimFrame);
    }

    const poll = () => {
      if (!this.isPlaying) return;

      const currentSeconds = Tone.Transport.seconds;

      if (this.onProgressCallback) {
        this.onProgressCallback(
          Math.min(currentSeconds, this.playbackDuration),
          this.playbackDuration
        );
      }

      if (currentSeconds >= this.playbackDuration + 0.3) {
        if (this.isLooping) {
          Tone.Transport.position = 0;
        } else {
          this.stop();
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          }
          return;
        }
      }

      this.progressAnimFrame = requestAnimationFrame(poll);
    };

    this.progressAnimFrame = requestAnimationFrame(poll);
  }

  public pause(): void {
    Tone.Transport.pause();
    this.isPlaying = false;
    if (this.progressAnimFrame) {
      cancelAnimationFrame(this.progressAnimFrame);
      this.progressAnimFrame = null;
    }
  }

  public resume(): void {
    Tone.Transport.start();
    this.isPlaying = true;
    this.startPlayheadTracker();
  }

  public stop(): void {
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel(0);
      Tone.Transport.position = 0;

      if (this.currentPart) {
        this.currentPart.dispose();
        this.currentPart = null;
      }

      if (this.polySynth) {
        this.polySynth.releaseAll();
      }
    } catch (err) {
      console.warn('Tone stop cleanup:', err);
    }

    this.isPlaying = false;

    if (this.progressAnimFrame) {
      cancelAnimationFrame(this.progressAnimFrame);
      this.progressAnimFrame = null;
    }

    if (this.onProgressCallback) {
      this.onProgressCallback(0, this.playbackDuration);
    }
  }

  public seek(seconds: number): void {
    Tone.Transport.seconds = Math.max(0, Math.min(seconds, this.playbackDuration));
    if (this.onProgressCallback) {
      this.onProgressCallback(Tone.Transport.seconds, this.playbackDuration);
    }
  }

  /**
   * Section 9.8: Offline WAV Audio Rendering.
   * Uses Tone.Offline to render high-fidelity 16-bit PCM WAV.
   */
  public async renderWav(notes: NoteEvent[], bpm = 120, instrument = this.currentInstrument): Promise<Blob> {
    if (notes.length === 0) {
      throw new Error('No notes to render into audio.');
    }

    const secondsPerBeat = 60 / bpm;
    const lastNote = notes[notes.length - 1];
    const totalDuration = (lastNote.time + (lastNote.duration || 0.5)) + 1.2;

    const buffer = await Tone.Offline(async () => {
      // Build offline synth matching current instrument
      let offlineSynth: Tone.PolySynth;

      switch (instrument) {
        case 'electricPiano':
          offlineSynth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 3,
            modulationIndex: 10,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 1.0 },
          }).toDestination();
          break;

        case 'synthLead':
          const filter = new Tone.Filter(3000, 'lowpass').toDestination();
          offlineSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.4, sustain: 0.5, release: 0.6 },
          }).connect(filter);
          break;

        case 'musicBox':
          offlineSynth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 5.5,
            modulationIndex: 8,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.002, decay: 1.2, sustain: 0.02, release: 1.2 },
          }).toDestination();
          break;

        case 'pluck':
          offlineSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.002, decay: 0.2, sustain: 0.0, release: 0.15 },
          }).toDestination();
          break;

        case 'pad':
          offlineSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle8' },
            envelope: { attack: 0.5, decay: 1.0, sustain: 0.8, release: 2.0 },
          }).toDestination();
          break;

        case 'piano':
        default:
          offlineSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1.2 },
          }).toDestination();
          break;
      }

      // Schedule all notes
      notes.forEach((n) => {
        const clampedMidi = Math.max(36, Math.min(96, n.midiNumber));
        const pitch = Tone.Frequency(clampedMidi, 'midi').toNote();
        offlineSynth.triggerAttackRelease(
          pitch,
          Math.max(0.1, n.duration * 0.95),
          n.time,
          Math.max(0.4, Math.min(1.0, n.velocity || 0.8))
        );
      });
    }, totalDuration);

    return audioBufferToWavBlob(buffer.get()!);
  }

  // ----------------------------------------------------
  // Section 9.7: Fallback Raw Web Audio API Engine
  // ----------------------------------------------------
  private initFallbackWebAudio(): void {
    this.isFallbackMode = true;
    if (!this.rawAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.rawAudioCtx = new AudioCtxClass();
    }
  }

  private playFallbackTone(midi: number, duration: number): void {
    if (!this.rawAudioCtx) this.initFallbackWebAudio();
    const ctx = this.rawAudioCtx!;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playFallbackArpeggio(): void {
    [60, 64, 67, 72].forEach((midi, i) => {
      setTimeout(() => this.playFallbackTone(midi, 0.4), i * 220);
    });
  }

  private playFallbackSequence(
    notes: NoteEvent[],
    bpm: number,
    onProgress?: (currentTime: number, totalDuration: number) => void,
    onComplete?: () => void
  ): void {
    if (notes.length === 0) return;
    const totalDuration = notes[notes.length - 1].time + (notes[notes.length - 1].duration || 0.5);
    const start = performance.now();

    notes.forEach((n) => {
      setTimeout(() => {
        this.playFallbackTone(n.midiNumber, n.duration);
      }, n.time * 1000);
    });

    const interval = window.setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      if (onProgress) onProgress(Math.min(elapsed, totalDuration), totalDuration);
      if (elapsed >= totalDuration + 0.3) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 50);
  }

  // ----------------------------------------------------
  // Section 9.9: Audio Debug Diagnostics
  // ----------------------------------------------------
  public getDebugInfo(): AudioDebugInfo {
    return {
      contextState: this.getContextState(),
      sampleRate: Tone.getContext().sampleRate || 44100,
      destinationVolumeDb: this.getVolumeDb(),
      currentInstrument: this.currentInstrument,
      levelDb: this.getMeterLevelDb(),
      isUnlocked: this.isUnlocked(),
      transportState: Tone.Transport.state,
      scheduledEventsCount: this.currentNotes.length,
      usingFallback: this.isFallbackMode,
    };
  }

  private logDebug(message: string): void {
    const debug = this.getDebugInfo();
    console.log(
      `[MelodyForge Audio] ${message} | State: ${debug.contextState}, Vol: ${debug.destinationVolumeDb.toFixed(1)} dB, Instrument: ${debug.currentInstrument}`
    );
  }
}

/**
 * Converts standard Web Audio AudioBuffer to 16-bit PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + length);
  const view = new DataView(arrayBuffer);

  // Write RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');

  // Write fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // Write data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Interleave channels
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
